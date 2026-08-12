import { Hono } from 'hono';
import { and, desc, eq, inArray } from 'drizzle-orm';

import type { AuthUser } from '../auth';
import { db } from '../db/client';
import {
  announcementReads,
  announcementReactions,
  announcementReplies,
  announcements,
  users,
} from '../db/schema';
import { requireApproved, requireCoach } from '../middleware/session';
import { notifyMembers } from './push';

const app = new Hono<{ Variables: { user: AuthUser } }>();

const SUPPORTED_REACTIONS = ['✊', '🔥', '👍'] as const;

type AnnouncementRow = {
  id: string;
  authorId: string;
  tag: string | null;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: Date;
  profiles: { first_name: string; last_name: string };
};

function summarizeReactions(
  rows: { emoji: string; userId: string }[],
  currentUserId: string,
) {
  return SUPPORTED_REACTIONS.map((emoji) => ({
    emoji,
    count: rows.filter((row) => row.emoji === emoji).length,
    reacted: rows.some((row) => row.emoji === emoji && row.userId === currentUserId),
  }));
}

async function announcementExists(id: string) {
  const [row] = await db.select({ id: announcements.id }).from(announcements).where(eq(announcements.id, id));
  return Boolean(row);
}

app.get('/', requireApproved, async (c) => {
  const user = c.get('user');
  const rows: AnnouncementRow[] = await db
    .select({
      id: announcements.id,
      authorId: announcements.authorId,
      tag: announcements.tag,
      title: announcements.title,
      body: announcements.body,
      pinned: announcements.pinned,
      createdAt: announcements.createdAt,
      profiles: { first_name: users.firstName, last_name: users.lastName },
    })
    .from(announcements)
    .innerJoin(users, eq(announcements.authorId, users.id))
    .orderBy(desc(announcements.createdAt));

  if (rows.length === 0) return c.json([]);

  const ids = rows.map((row) => row.id);
  const [reactionRows, readRows] = await Promise.all([
    db
      .select({ announcementId: announcementReactions.announcementId, emoji: announcementReactions.emoji, userId: announcementReactions.userId })
      .from(announcementReactions)
      .where(inArray(announcementReactions.announcementId, ids)),
    db
      .select({ announcementId: announcementReads.announcementId })
      .from(announcementReads)
      .where(and(eq(announcementReads.userId, user.id), inArray(announcementReads.announcementId, ids))),
  ]);
  const readIds = new Set(readRows.map((row) => row.announcementId));

  return c.json(rows.map((row) => ({
    ...row,
    isRead: readIds.has(row.id),
    reactions: summarizeReactions(
      reactionRows.filter((reaction) => reaction.announcementId === row.id),
      user.id,
    ),
  })));
});

app.post('/read-all', requireApproved, async (c) => {
  const user = c.get('user');
  const rows = await db.select({ id: announcements.id }).from(announcements);
  if (rows.length === 0) return c.json({ ok: true });

  await db
    .insert(announcementReads)
    .values(rows.map((row) => ({ announcementId: row.id, userId: user.id, readAt: new Date() })))
    .onConflictDoUpdate({
      target: [announcementReads.announcementId, announcementReads.userId],
      set: { readAt: new Date() },
    });

  return c.json({ ok: true });
});

app.put('/:id/read', requireApproved, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  if (!await announcementExists(id)) return c.json({ error: 'Introuvable' }, 404);

  await db
    .insert(announcementReads)
    .values({ announcementId: id, userId: user.id, readAt: new Date() })
    .onConflictDoUpdate({
      target: [announcementReads.announcementId, announcementReads.userId],
      set: { readAt: new Date() },
    });

  return c.json({ ok: true });
});

app.put('/:id/reaction', requireApproved, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const { emoji } = await c.req.json<{ emoji?: string }>();
  if (!emoji || !SUPPORTED_REACTIONS.includes(emoji as typeof SUPPORTED_REACTIONS[number])) {
    return c.json({ error: 'Réaction invalide' }, 400);
  }
  if (!await announcementExists(id)) return c.json({ error: 'Introuvable' }, 404);

  const condition = and(
    eq(announcementReactions.announcementId, id),
    eq(announcementReactions.userId, user.id),
    eq(announcementReactions.emoji, emoji),
  );
  const [existing] = await db.select().from(announcementReactions).where(condition);

  if (existing) {
    await db.delete(announcementReactions).where(condition);
  } else {
    await db.insert(announcementReactions).values({ announcementId: id, userId: user.id, emoji });
  }

  const reactionRows = await db
    .select({ emoji: announcementReactions.emoji, userId: announcementReactions.userId })
    .from(announcementReactions)
    .where(eq(announcementReactions.announcementId, id));

  return c.json({ reactions: summarizeReactions(reactionRows, user.id) });
});

app.post('/:id/replies', requireApproved, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const { body } = await c.req.json<{ body?: string }>();
  const trimmed = body?.trim() ?? '';
  if (!trimmed) return c.json({ error: 'Réponse vide' }, 400);
  if (trimmed.length > 2_000) return c.json({ error: 'Réponse trop longue' }, 400);
  if (!await announcementExists(id)) return c.json({ error: 'Introuvable' }, 404);

  const [reply] = await db
    .insert(announcementReplies)
    .values({ announcementId: id, userId: user.id, body: trimmed })
    .returning();

  return c.json({
    ...reply,
    profiles: { first_name: user.firstName, last_name: user.lastName },
  }, 201);
});

app.get('/:id', requireApproved, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const [row]: AnnouncementRow[] = await db
    .select({
      id: announcements.id,
      authorId: announcements.authorId,
      tag: announcements.tag,
      title: announcements.title,
      body: announcements.body,
      pinned: announcements.pinned,
      createdAt: announcements.createdAt,
      profiles: { first_name: users.firstName, last_name: users.lastName },
    })
    .from(announcements)
    .innerJoin(users, eq(announcements.authorId, users.id))
    .where(eq(announcements.id, id));
  if (!row) return c.json({ error: 'Introuvable' }, 404);

  const [reactionRows, replies, readRows] = await Promise.all([
    db
      .select({ emoji: announcementReactions.emoji, userId: announcementReactions.userId })
      .from(announcementReactions)
      .where(eq(announcementReactions.announcementId, id)),
    db
      .select({
        id: announcementReplies.id,
        announcementId: announcementReplies.announcementId,
        userId: announcementReplies.userId,
        body: announcementReplies.body,
        createdAt: announcementReplies.createdAt,
        profiles: { first_name: users.firstName, last_name: users.lastName },
      })
      .from(announcementReplies)
      .innerJoin(users, eq(announcementReplies.userId, users.id))
      .where(eq(announcementReplies.announcementId, id))
      .orderBy(announcementReplies.createdAt),
    db
      .select({ announcementId: announcementReads.announcementId })
      .from(announcementReads)
      .where(and(eq(announcementReads.announcementId, id), eq(announcementReads.userId, user.id))),
  ]);

  return c.json({
    ...row,
    isRead: readRows.length > 0,
    reactions: summarizeReactions(reactionRows, user.id),
    replies,
  });
});

app.post('/', requireCoach, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ tag?: string; title?: string; body?: string; pinned?: boolean }>();
  const title = body.title?.trim() ?? '';
  const content = body.body?.trim() ?? '';
  if (!title || !content) return c.json({ error: 'Titre et contenu obligatoires' }, 400);
  if (title.length > 200 || content.length > 10_000) return c.json({ error: 'Annonce trop longue' }, 400);

  const [row] = await db.insert(announcements).values({
    authorId: user.id,
    tag: body.tag?.trim() || null,
    title,
    body: content,
    pinned: body.pinned ?? false,
  }).returning();

  void notifyMembers('notifyCoach', `📣 ${title}`, content.slice(0, 180), { announcementId: row.id }, 'announcement');

  return c.json(row, 201);
});

app.put('/:id', requireCoach, async (c) => {
  const id = c.req.param('id') as `${string}-${string}-${string}-${string}-${string}`;
  const body = await c.req.json<{ tag?: string | null; title?: string; body?: string; pinned?: boolean }>();
  const title = body.title?.trim() ?? '';
  const content = body.body?.trim() ?? '';
  if (!title || !content) return c.json({ error: 'Titre et contenu obligatoires' }, 400);
  if (title.length > 200 || content.length > 10_000) return c.json({ error: 'Annonce trop longue' }, 400);
  const [row] = await db.update(announcements).set({
    tag: body.tag?.trim() || null,
    title,
    body: content,
    pinned: body.pinned ?? false,
  }).where(eq(announcements.id, id)).returning();
  if (!row) return c.json({ error: 'Introuvable' }, 404);
  return c.json(row);
});

app.delete('/:id', requireCoach, async (c) => {
  const id = c.req.param('id') as `${string}-${string}-${string}-${string}-${string}`;
  const [row] = await db.delete(announcements).where(eq(announcements.id, id)).returning({ id: announcements.id });
  if (!row) return c.json({ error: 'Introuvable' }, 404);
  return c.json({ ok: true });
});

export { app as announcementsRouter };
