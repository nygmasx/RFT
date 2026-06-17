import { Hono } from 'hono';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { announcements, users } from '../db/schema';
import { requireSession, requireCoach } from '../middleware/session';
import type { AuthUser } from '../auth';

const app = new Hono<{ Variables: { user: AuthUser } }>();

app.get('/', requireSession, async (c) => {
  const rows = await db
    .select({
      id: announcements.id, authorId: announcements.authorId,
      tag: announcements.tag, title: announcements.title,
      body: announcements.body, pinned: announcements.pinned,
      createdAt: announcements.createdAt,
      profiles: { first_name: users.firstName, last_name: users.lastName },
    })
    .from(announcements)
    .innerJoin(users, eq(announcements.authorId, users.id))
    .orderBy(desc(announcements.createdAt));

  return c.json(rows);
});

app.get('/:id', requireSession, async (c) => {
  const [row] = await db
    .select({
      id: announcements.id, authorId: announcements.authorId,
      tag: announcements.tag, title: announcements.title,
      body: announcements.body, pinned: announcements.pinned,
      createdAt: announcements.createdAt,
      profiles: { first_name: users.firstName, last_name: users.lastName },
    })
    .from(announcements)
    .innerJoin(users, eq(announcements.authorId, users.id))
    .where(eq(announcements.id, c.req.param('id')));
  if (!row) return c.json({ error: 'Introuvable' }, 404);
  return c.json(row);
});

app.post('/', requireCoach, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ tag?: string; title: string; body: string; pinned?: boolean }>();

  const [row] = await db.insert(announcements).values({
    authorId: user.id,
    tag:      body.tag ?? null,
    title:    body.title,
    body:     body.body,
    pinned:   body.pinned ?? false,
  }).returning();

  return c.json(row, 201);
});

export { app as announcementsRouter };
