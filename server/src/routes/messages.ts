import { Hono } from 'hono';
import { eq, asc, and, inArray, isNull, or } from 'drizzle-orm';
import { db } from '../db/client';
import { messages, users, channelMembers, channels, pushTokens, userSettings } from '../db/schema';
import { requireApproved } from '../middleware/session';
import type { AuthUser } from '../auth';
import { getChannelAccess } from '../lib/channel-access';
import { isStaff } from '../lib/access';
import { notifications } from '../db/schema';

const app = new Hono<{ Variables: { user: AuthUser } }>();

// GET /api/messages/:channelId
app.get('/:channelId', requireApproved, async (c) => {
  const channelId = c.req.param('channelId');
  const access = await getChannelAccess(channelId, c.get('user').id);
  if (!access.exists) return c.json({ error: 'Salon introuvable' }, 404);
  if (!access.allowed) return c.json({ error: 'Accès refusé' }, 403);

  const rows = await db
    .select({
      id:        messages.id,
      channelId: messages.channelId,
      userId:    messages.userId,
      body:      messages.body,
      createdAt: messages.createdAt,
      profiles: {
        first_name: users.firstName,
        last_name:  users.lastName,
      },
    })
    .from(messages)
    .innerJoin(users, eq(messages.userId, users.id))
    .where(eq(messages.channelId, channelId))
    .orderBy(asc(messages.createdAt));

  return c.json(rows);
});

// POST /api/messages/:channelId
app.post('/:channelId', requireApproved, async (c) => {
  const user = c.get('user');
  const channelId = c.req.param('channelId');
  const { body } = await c.req.json<{ body: string }>();

  const access = await getChannelAccess(channelId, user.id);
  if (!access.exists) return c.json({ error: 'Salon introuvable' }, 404);
  if (!access.allowed) return c.json({ error: 'Accès refusé' }, 403);
  if (access.isLocked && !isStaff(user)) return c.json({ error: 'Salon verrouillé' }, 403);

  if (!body?.trim()) return c.json({ error: 'Message vide' }, 400);
  if (body.trim().length > 4_000) return c.json({ error: 'Message trop long' }, 400);

  const [msg] = await db
    .insert(messages)
    .values({ channelId, userId: user.id, body: body.trim() })
    .returning();

  const response = {
    ...msg,
    profiles: { first_name: user.firstName, last_name: user.lastName },
  };

  void createChannelNotifications(channelId, user, body.trim(), msg.id);

  // Send push notification to channel members — fire and forget
  notifyChannelMembers(channelId, user, body.trim()).catch(() => {});

  return c.json(response, 201);
});

app.put('/item/:id', requireApproved, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id') as `${string}-${string}-${string}-${string}-${string}`;
  const { body } = await c.req.json<{ body?: string }>();
  const content = body?.trim() ?? '';
  if (!content || content.length > 4_000) return c.json({ error: 'Message invalide' }, 400);
  const [current] = await db.select().from(messages).where(eq(messages.id, id));
  if (!current) return c.json({ error: 'Introuvable' }, 404);
  const canEdit = current.userId === user.id && Date.now() - current.createdAt.getTime() <= 15 * 60_000;
  if (!canEdit && !isStaff(user)) return c.json({ error: 'Accès refusé' }, 403);
  const [row] = await db.update(messages).set({ body: content, updatedAt: new Date() })
    .where(eq(messages.id, id)).returning();
  return c.json(row);
});

app.delete('/item/:id', requireApproved, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id') as `${string}-${string}-${string}-${string}-${string}`;
  const [current] = await db.select().from(messages).where(eq(messages.id, id));
  if (!current) return c.json({ error: 'Introuvable' }, 404);
  if (current.userId !== user.id && !isStaff(user)) return c.json({ error: 'Accès refusé' }, 403);
  await db.delete(messages).where(eq(messages.id, id));
  return c.json({ ok: true });
});

async function createChannelNotifications(channelId: string, sender: AuthUser, body: string, messageId: string) {
  try {
    const [channel] = await db.select().from(channels).where(eq(channels.id, channelId));
    if (!channel) return;
    let recipientIds: string[];
    if (channel.isPrivate) {
      const members = await db.select({ userId: channelMembers.userId }).from(channelMembers)
        .where(eq(channelMembers.channelId, channelId));
      recipientIds = members.map(({ userId }) => userId).filter((id) => id !== sender.id);
    } else {
      const members = await db.select({ userId: users.id }).from(users)
        .leftJoin(userSettings, eq(users.id, userSettings.userId))
        .where(and(
          or(eq(users.status, 'approved'), inArray(users.role, ['coach', 'admin'])),
          or(isNull(userSettings.notifyMessages), eq(userSettings.notifyMessages, true)),
        ));
      recipientIds = members.map(({ userId }) => userId).filter((id) => id !== sender.id);
    }
    if (!recipientIds.length) return;
    const senderName = `${sender.firstName} ${sender.lastName}`.trim() || sender.email;
    await db.insert(notifications).values(recipientIds.map((userId) => ({
      userId,
      type: 'message',
      title: `${senderName} · #${channel.name}`,
      body: body.slice(0, 300),
      data: JSON.stringify({ channelId, channelName: channel.name, messageId }),
    })));
  } catch (error) {
    console.error('[Notifications] Failed to store channel notifications', error);
  }
}

async function notifyChannelMembers(channelId: string, sender: AuthUser, messageBody: string) {
  const [channel] = await db
    .select({ name: channels.name, isPrivate: channels.isPrivate })
    .from(channels).where(eq(channels.id, channelId));
  if (!channel) return;

  let tokens: { token: string }[];

  if (channel.isPrivate) {
    // Private: notify all channel members (including sender's other devices)
    const members = await db
      .select({ userId: channelMembers.userId })
      .from(channelMembers)
      .where(eq(channelMembers.channelId, channelId));
    if (members.length === 0) return;
    tokens = await db
      .select({ token: pushTokens.token })
      .from(pushTokens)
      .innerJoin(users, eq(pushTokens.userId, users.id))
      .leftJoin(userSettings, eq(pushTokens.userId, userSettings.userId))
      .where(and(
        inArray(pushTokens.userId, members.map((m) => m.userId)),
        or(eq(users.status, 'approved'), inArray(users.role, ['coach', 'admin'])),
        or(isNull(userSettings.notifyMessages), eq(userSettings.notifyMessages, true)),
      ));
  } else {
    // Public: notify approved members and staff only
    tokens = await db
      .select({ token: pushTokens.token })
      .from(pushTokens)
      .innerJoin(users, eq(pushTokens.userId, users.id))
      .leftJoin(userSettings, eq(pushTokens.userId, userSettings.userId))
      .where(and(
        or(eq(users.status, 'approved'), inArray(users.role, ['coach', 'admin'])),
        or(isNull(userSettings.notifyMessages), eq(userSettings.notifyMessages, true)),
      ));
  }

  if (tokens.length === 0) {
    console.log('[Push] No tokens found for channel', channelId);
    return;
  }

  const senderName = `${sender.firstName ?? ''} ${sender.lastName ?? ''}`.trim() || sender.email;
  const avatarUrl = sender.avatarUrl
    ? `${process.env.BETTER_AUTH_URL}/api/profile/${sender.id}/avatar`
    : undefined;

  const msgs = tokens.map((t) => ({
    to: t.token,
    sound: 'default' as const,
    title: senderName,
    subtitle: `#${channel.name}`,
    body: messageBody,
    data: { channelId, channelName: channel.name },
    ...(avatarUrl ? { attachments: [{ url: avatarUrl }] } : {}),
  }));

  console.log(`[Push] Sending to ${msgs.length} token(s) for channel ${channel.name}`);

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(msgs),
  });
  const result = await res.json();
  console.log('[Push] Expo response:', JSON.stringify(result));
}

export { app as messagesRouter };
