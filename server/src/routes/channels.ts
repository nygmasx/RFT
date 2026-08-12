import { Hono } from 'hono';
import { and, eq, exists, inArray, or } from 'drizzle-orm';
import { db } from '../db/client';
import { channels, channelMembers, users } from '../db/schema';
import { requireApproved, requireCoach } from '../middleware/session';
import type { AuthUser } from '../auth';
import { getChannelAccess } from '../lib/channel-access';

const app = new Hono<{ Variables: { user: AuthUser } }>();

// GET /api/channels — public + private where user is member
app.get('/', requireApproved, async (c) => {
  const user = c.get('user');

  const memberSubq = db
    .select({ one: channelMembers.channelId })
    .from(channelMembers)
    .where(and(
      eq(channelMembers.channelId, channels.id),
      eq(channelMembers.userId, user.id),
    ));

  const rows = await db
    .select()
    .from(channels)
    .where(or(eq(channels.isPrivate, false), exists(memberSubq)))
    .orderBy(channels.createdAt);

  return c.json(rows);
});

// POST /api/channels — create channel + add creator & members
app.post('/', requireApproved, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    name: string;
    description?: string;
    is_private?: boolean;
    member_ids?: string[];
  }>();

  const name = body.name?.trim();
  if (!name) return c.json({ error: 'Nom obligatoire' }, 400);
  if (name.length > 80 || (body.description?.length ?? 0) > 500) return c.json({ error: 'Salon trop long' }, 400);

  const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const id = `${slug}-${Date.now().toString(36)}`;

  await db.insert(channels).values({
    id,
    name,
    description: body.description?.trim() || null,
    isPrivate: body.is_private ?? false,
    isLocked: false,
  });

  const requestedIds = [...new Set([user.id, ...(body.member_ids ?? [])])];
  const validUsers = await db.select({ id: users.id }).from(users).where(inArray(users.id, requestedIds));
  const memberRows = validUsers.map(({ id: userId }) => ({ channelId: id, userId }));
  await db.insert(channelMembers).values(memberRows);

  return c.json({ id }, 201);
});

app.put('/:id', requireCoach, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ name?: string; description?: string | null; is_private?: boolean; is_locked?: boolean }>();
  const name = body.name?.trim();
  if (!name) return c.json({ error: 'Nom obligatoire' }, 400);
  const [row] = await db.update(channels).set({
    name,
    description: body.description?.trim() || null,
    isPrivate: body.is_private ?? false,
    isLocked: body.is_locked ?? false,
  }).where(eq(channels.id, id)).returning();
  if (!row) return c.json({ error: 'Introuvable' }, 404);
  return c.json(row);
});

app.put('/:id/members', requireCoach, async (c) => {
  const id = c.req.param('id');
  const { member_ids = [] } = await c.req.json<{ member_ids?: string[] }>();
  const [channel] = await db.select().from(channels).where(eq(channels.id, id));
  if (!channel) return c.json({ error: 'Introuvable' }, 404);
  const validUsers = member_ids.length
    ? await db.select({ id: users.id }).from(users).where(inArray(users.id, [...new Set(member_ids)]))
    : [];
  await db.delete(channelMembers).where(eq(channelMembers.channelId, id));
  if (validUsers.length) {
    await db.insert(channelMembers).values(validUsers.map(({ id: userId }) => ({ channelId: id, userId })));
  }
  return c.json({ ok: true, count: validUsers.length });
});

app.delete('/:id', requireCoach, async (c) => {
  const [row] = await db.delete(channels).where(eq(channels.id, c.req.param('id'))).returning({ id: channels.id });
  if (!row) return c.json({ error: 'Introuvable' }, 404);
  return c.json({ ok: true });
});

// GET /api/channels/:id/members
app.get('/:id/members', requireApproved, async (c) => {
  const channelId = c.req.param('id');
  const access = await getChannelAccess(channelId, c.get('user').id);
  if (!access.exists) return c.json({ error: 'Salon introuvable' }, 404);
  if (!access.allowed) return c.json({ error: 'Accès refusé' }, 403);
  const rows = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      avatarUrl: users.avatarUrl,
      role: users.role,
    })
    .from(channelMembers)
    .innerJoin(users, eq(channelMembers.userId, users.id))
    .where(eq(channelMembers.channelId, channelId));
  return c.json(rows);
});

export { app as channelsRouter };
