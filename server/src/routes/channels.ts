import { Hono } from 'hono';
import { and, eq, exists, or } from 'drizzle-orm';
import { db } from '../db/client';
import { channels, channelMembers, users } from '../db/schema';
import { requireApproved } from '../middleware/session';
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

  const slug = body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const id = `${slug}-${Date.now().toString(36)}`;

  await db.insert(channels).values({
    id,
    name: body.name,
    description: body.description ?? null,
    isPrivate: body.is_private ?? false,
    isLocked: false,
  });

  const memberRows = [
    { channelId: id, userId: user.id },
    ...(body.member_ids ?? []).map((uid) => ({ channelId: id, userId: uid })),
  ];
  await db.insert(channelMembers).values(memberRows);

  return c.json({ id }, 201);
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
