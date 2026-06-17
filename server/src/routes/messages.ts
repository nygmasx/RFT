import { Hono } from 'hono';
import { eq, asc, and, ne, inArray, notInArray } from 'drizzle-orm';
import { db } from '../db/client';
import { messages, users, channelMembers, channels, pushTokens } from '../db/schema';
import { requireSession } from '../middleware/session';
import type { AuthUser } from '../auth';

const app = new Hono<{ Variables: { user: AuthUser } }>();

// GET /api/messages/:channelId
app.get('/:channelId', requireSession, async (c) => {
  const channelId = c.req.param('channelId');

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
app.post('/:channelId', requireSession, async (c) => {
  const user = c.get('user');
  const channelId = c.req.param('channelId');
  const { body } = await c.req.json<{ body: string }>();

  if (!body?.trim()) return c.json({ error: 'Message vide' }, 400);

  const [msg] = await db
    .insert(messages)
    .values({ channelId, userId: user.id, body: body.trim() })
    .returning();

  const response = {
    ...msg,
    profiles: { first_name: user.firstName, last_name: user.lastName },
  };

  // Send push notification to channel members — fire and forget
  notifyChannelMembers(channelId, user, body.trim()).catch(() => {});

  return c.json(response, 201);
});

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
      .where(inArray(pushTokens.userId, members.map((m) => m.userId)));
  } else {
    // Public: notify all users with a token
    tokens = await db
      .select({ token: pushTokens.token })
      .from(pushTokens);
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
