import { Hono } from 'hono';
import { eq, asc, and, inArray, isNull, ne, or } from 'drizzle-orm';
import { db } from '../db/client';
import {
  messages,
  users,
  channelMembers,
  channelReads,
  messageMentions,
  messageReactions,
  channels,
  pushTokens,
  userSettings,
} from '../db/schema';
import { requireApproved } from '../middleware/session';
import type { AuthUser } from '../auth';
import { getChannelAccess } from '../lib/channel-access';
import { isStaff } from '../lib/access';
import { notifications } from '../db/schema';

const app = new Hono<{ Variables: { user: AuthUser } }>();

const API_BASE_URL = (process.env.BETTER_AUTH_URL ?? 'http://localhost:3001').replace(/\/$/, '');
const ALLOWED_MEDIA_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp',
  'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/3gpp', 'audio/webm',
]);
const ALLOWED_REACTIONS = new Set(['❤️', '👍', '🔥', '😂', '😮', '🙏', '✊']);

type MentionableMember = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
};

async function eligibleMembers(channelId: string, isPrivate: boolean): Promise<MentionableMember[]> {
  if (isPrivate) {
    return db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      avatarUrl: users.avatarUrl,
    }).from(channelMembers)
      .innerJoin(users, eq(channelMembers.userId, users.id))
      .where(and(eq(channelMembers.channelId, channelId), or(
        eq(users.status, 'approved'), inArray(users.role, ['coach', 'admin']),
      )));
  }
  return db.select({
    id: users.id,
    firstName: users.firstName,
    lastName: users.lastName,
    avatarUrl: users.avatarUrl,
  }).from(users).where(or(eq(users.status, 'approved'), inArray(users.role, ['coach', 'admin'])));
}

async function validatedMentions(channelId: string, isPrivate: boolean, requested: unknown) {
  if (!Array.isArray(requested)) return [];
  const uniqueIds = [...new Set(requested.filter((value): value is string => typeof value === 'string'))].slice(0, 20);
  if (!uniqueIds.length) return [];
  const allowedIds = new Set((await eligibleMembers(channelId, isPrivate)).map(({ id }) => id));
  return uniqueIds.filter((id) => allowedIds.has(id));
}

async function validatedReply(channelId: string, requested: unknown) {
  if (typeof requested !== 'string' || !requested) return null;
  const [reply] = await db.select({
    id: messages.id,
    userId: messages.userId,
    body: messages.body,
    messageType: messages.messageType,
    authorFirstName: users.firstName,
    authorLastName: users.lastName,
  }).from(messages)
    .innerJoin(users, eq(messages.userId, users.id))
    .where(and(eq(messages.id, requested as `${string}-${string}-${string}-${string}-${string}`), eq(messages.channelId, channelId)));
  return reply ?? null;
}

function summarizeReactions(
  rows: { messageId: string; userId: string; emoji: string }[],
  messageId: string,
  currentUserId: string,
) {
  const grouped = new Map<string, { emoji: string; count: number; reacted: boolean }>();
  for (const row of rows) {
    if (row.messageId !== messageId) continue;
    const current = grouped.get(row.emoji) ?? { emoji: row.emoji, count: 0, reacted: false };
    current.count += 1;
    current.reacted ||= row.userId === currentUserId;
    grouped.set(row.emoji, current);
  }
  return [...grouped.values()].sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji));
}

function mediaUrl(messageId: string, token: string | null) {
  return token ? `${API_BASE_URL}/api/messages/media/${messageId}/${token}` : null;
}

// Opaque media URLs let native image/audio players stream without exposing auth tokens.
app.get('/media/:messageId/:token', async (c) => {
  const messageId = c.req.param('messageId') as `${string}-${string}-${string}-${string}-${string}`;
  const token = c.req.param('token') as `${string}-${string}-${string}-${string}-${string}`;
  const [media] = await db.select({
    data: messages.mediaData,
    mimeType: messages.mediaMimeType,
  }).from(messages).where(and(eq(messages.id, messageId), eq(messages.mediaToken, token)));
  if (!media?.data || !media.mimeType) return c.body(null, 404);
  return c.body(Buffer.from(media.data, 'base64'), 200, {
    'Content-Type': media.mimeType,
    'Cache-Control': 'private, max-age=86400',
    'X-Content-Type-Options': 'nosniff',
  });
});

app.get('/:channelId/members', requireApproved, async (c) => {
  const channelId = c.req.param('channelId');
  const access = await getChannelAccess(channelId, c.get('user').id);
  if (!access.exists) return c.json({ error: 'Salon introuvable' }, 404);
  if (!access.allowed) return c.json({ error: 'Accès refusé' }, 403);
  return c.json((await eligibleMembers(channelId, access.isPrivate))
    .filter(({ id }) => id !== c.get('user').id));
});

// GET /api/messages/:channelId
app.get('/:channelId', requireApproved, async (c) => {
  const user = c.get('user');
  const channelId = c.req.param('channelId');
  const access = await getChannelAccess(channelId, user.id);
  if (!access.exists) return c.json({ error: 'Salon introuvable' }, 404);
  if (!access.allowed) return c.json({ error: 'Accès refusé' }, 403);

  await db.insert(channelReads).values({ channelId, userId: user.id, readAt: new Date() })
    .onConflictDoUpdate({
      target: [channelReads.channelId, channelReads.userId],
      set: { readAt: new Date() },
    });

  const [rows, readRows, mentionRows, reactionRows, members] = await Promise.all([
    db
    .select({
      id:        messages.id,
      channelId: messages.channelId,
      userId:    messages.userId,
      body:      messages.body,
      messageType: messages.messageType,
      mediaMimeType: messages.mediaMimeType,
      mediaFileName: messages.mediaFileName,
      mediaDurationMs: messages.mediaDurationMs,
      mediaToken: messages.mediaToken,
      replyToId: messages.replyToId,
      createdAt: messages.createdAt,
      updatedAt: messages.updatedAt,
      profiles: {
        first_name: users.firstName,
        last_name:  users.lastName,
      },
    })
    .from(messages)
    .innerJoin(users, eq(messages.userId, users.id))
    .where(eq(messages.channelId, channelId))
    .orderBy(asc(messages.createdAt)),
    db.select().from(channelReads).where(eq(channelReads.channelId, channelId)),
    db.select({ messageId: messageMentions.messageId, userId: messageMentions.userId })
      .from(messageMentions)
      .innerJoin(messages, eq(messageMentions.messageId, messages.id))
      .where(eq(messages.channelId, channelId)),
    db.select({ messageId: messageReactions.messageId, userId: messageReactions.userId, emoji: messageReactions.emoji })
      .from(messageReactions)
      .innerJoin(messages, eq(messageReactions.messageId, messages.id))
      .where(eq(messages.channelId, channelId)),
    eligibleMembers(channelId, access.isPrivate),
  ]);

  const repliesById = new Map(rows.map((row) => [row.id, row]));

  return c.json(rows.map((row) => ({
    ...row,
    mediaToken: undefined,
    mediaUrl: mediaUrl(row.id, row.mediaToken),
    mentionedUserIds: mentionRows.filter(({ messageId }) => messageId === row.id).map(({ userId }) => userId),
    reactions: summarizeReactions(reactionRows, row.id, user.id),
    replyTo: row.replyToId ? (() => {
      const reply = repliesById.get(row.replyToId);
      return reply ? {
        id: reply.id,
        userId: reply.userId,
        body: reply.body,
        messageType: reply.messageType,
        authorName: `${reply.profiles.first_name} ${reply.profiles.last_name}`.trim(),
      } : null;
    })() : null,
    readCount: readRows.filter(({ userId, readAt }) => userId !== row.userId && readAt >= row.createdAt).length,
    recipientCount: members.filter(({ id }) => id !== row.userId).length,
  })));
});

// POST /api/messages/:channelId
app.post('/:channelId', requireApproved, async (c) => {
  const user = c.get('user');
  const channelId = c.req.param('channelId');
  const { body, mention_user_ids, reply_to_id } = await c.req.json<{ body: string; mention_user_ids?: string[]; reply_to_id?: string }>();

  const access = await getChannelAccess(channelId, user.id);
  if (!access.exists) return c.json({ error: 'Salon introuvable' }, 404);
  if (!access.allowed) return c.json({ error: 'Accès refusé' }, 403);
  if (access.isLocked && !isStaff(user)) return c.json({ error: 'Salon verrouillé' }, 403);

  if (!body?.trim()) return c.json({ error: 'Message vide' }, 400);
  if (body.trim().length > 4_000) return c.json({ error: 'Message trop long' }, 400);
  const mentionedUserIds = await validatedMentions(channelId, access.isPrivate, mention_user_ids);
  const replyTo = await validatedReply(channelId, reply_to_id);

  const [msg] = await db
    .insert(messages)
    .values({ channelId, userId: user.id, body: body.trim(), replyToId: replyTo?.id ?? null })
    .returning();

  if (mentionedUserIds.length) {
    await db.insert(messageMentions).values(mentionedUserIds.map((mentionedUserId) => ({
      messageId: msg.id,
      userId: mentionedUserId,
    }))).onConflictDoNothing();
  }

  const response = {
    ...msg,
    profiles: { first_name: user.firstName, last_name: user.lastName },
    mediaUrl: null,
    mentionedUserIds,
    reactions: [],
    replyTo: replyTo ? {
      id: replyTo.id,
      userId: replyTo.userId,
      body: replyTo.body,
      messageType: replyTo.messageType,
      authorName: `${replyTo.authorFirstName} ${replyTo.authorLastName}`.trim(),
    } : null,
    readCount: 0,
    recipientCount: (await eligibleMembers(channelId, access.isPrivate)).filter(({ id }) => id !== user.id).length,
  };

  void createChannelNotifications(channelId, user, body.trim(), msg.id, mentionedUserIds);

  // Send push notification to channel members — fire and forget
  notifyChannelMembers(channelId, user, body.trim(), msg.id, mentionedUserIds).catch(() => {});

  return c.json(response, 201);
});

app.post('/:channelId/media', requireApproved, async (c) => {
  const user = c.get('user');
  const channelId = c.req.param('channelId');
  const payload = await c.req.json<{
    data_url?: string;
    file_name?: string;
    duration_ms?: number;
    caption?: string;
    mention_user_ids?: string[];
    reply_to_id?: string;
  }>();
  const access = await getChannelAccess(channelId, user.id);
  if (!access.exists) return c.json({ error: 'Salon introuvable' }, 404);
  if (!access.allowed) return c.json({ error: 'Accès refusé' }, 403);
  if (access.isLocked && !isStaff(user)) return c.json({ error: 'Salon verrouillé' }, 403);

  const match = payload.data_url?.match(/^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/s);
  if (!match || !ALLOWED_MEDIA_TYPES.has(match[1])) return c.json({ error: 'Format média non accepté' }, 400);
  const decodedSize = Math.floor(match[2].length * 0.75);
  if (decodedSize <= 0 || decodedSize > 6_000_000) return c.json({ error: 'Média trop volumineux (6 Mo maximum)' }, 413);
  const messageType = match[1].startsWith('image/') ? 'image' : 'audio';
  const durationMs = messageType === 'audio' ? Math.round(Number(payload.duration_ms)) : null;
  if (messageType === 'audio' && (!durationMs || durationMs < 300 || durationMs > 180_000)) {
    return c.json({ error: 'Durée du vocal invalide (3 minutes maximum)' }, 400);
  }
  const caption = payload.caption?.trim() ?? '';
  if (caption.length > 1_000) return c.json({ error: 'Légende trop longue' }, 400);
  const mentionedUserIds = await validatedMentions(channelId, access.isPrivate, payload.mention_user_ids);
  const replyTo = await validatedReply(channelId, payload.reply_to_id);
  const mediaToken = crypto.randomUUID();
  const [msg] = await db.insert(messages).values({
    channelId,
    userId: user.id,
    body: caption,
    messageType,
    mediaData: match[2],
    mediaMimeType: match[1],
    mediaFileName: payload.file_name?.slice(0, 200) || null,
    mediaDurationMs: durationMs,
    mediaToken,
    replyToId: replyTo?.id ?? null,
  }).returning();

  if (mentionedUserIds.length) {
    await db.insert(messageMentions).values(mentionedUserIds.map((mentionedUserId) => ({
      messageId: msg.id,
      userId: mentionedUserId,
    }))).onConflictDoNothing();
  }

  const notificationBody = messageType === 'audio' ? '🎤 Message vocal' : '📷 Photo';
  void createChannelNotifications(channelId, user, notificationBody, msg.id, mentionedUserIds);
  notifyChannelMembers(channelId, user, notificationBody, msg.id, mentionedUserIds).catch(() => {});
  return c.json({
    ...msg,
    mediaData: undefined,
    mediaToken: undefined,
    mediaUrl: mediaUrl(msg.id, mediaToken),
    mentionedUserIds,
    reactions: [],
    replyTo: replyTo ? {
      id: replyTo.id,
      userId: replyTo.userId,
      body: replyTo.body,
      messageType: replyTo.messageType,
      authorName: `${replyTo.authorFirstName} ${replyTo.authorLastName}`.trim(),
    } : null,
    readCount: 0,
    recipientCount: (await eligibleMembers(channelId, access.isPrivate)).filter(({ id }) => id !== user.id).length,
    profiles: { first_name: user.firstName, last_name: user.lastName },
  }, 201);
});

app.put('/item/:id/reactions', requireApproved, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id') as `${string}-${string}-${string}-${string}-${string}`;
  const { emoji } = await c.req.json<{ emoji?: string }>();
  if (!emoji || !ALLOWED_REACTIONS.has(emoji)) return c.json({ error: 'Réaction non acceptée' }, 400);
  const [message] = await db.select({ id: messages.id, channelId: messages.channelId }).from(messages).where(eq(messages.id, id));
  if (!message) return c.json({ error: 'Introuvable' }, 404);
  const access = await getChannelAccess(message.channelId, user.id);
  if (!access.allowed) return c.json({ error: 'Accès refusé' }, 403);

  const [existing] = await db.select().from(messageReactions).where(and(
    eq(messageReactions.messageId, id), eq(messageReactions.userId, user.id), eq(messageReactions.emoji, emoji),
  ));
  if (existing) {
    await db.delete(messageReactions).where(and(
      eq(messageReactions.messageId, id), eq(messageReactions.userId, user.id), eq(messageReactions.emoji, emoji),
    ));
  } else {
    await db.insert(messageReactions).values({ messageId: id, userId: user.id, emoji });
  }
  const rows = await db.select({ messageId: messageReactions.messageId, userId: messageReactions.userId, emoji: messageReactions.emoji })
    .from(messageReactions).where(eq(messageReactions.messageId, id));
  return c.json(summarizeReactions(rows, id, user.id));
});

app.put('/item/:id', requireApproved, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id') as `${string}-${string}-${string}-${string}-${string}`;
  const { body } = await c.req.json<{ body?: string }>();
  const content = body?.trim() ?? '';
  if (!content || content.length > 4_000) return c.json({ error: 'Message invalide' }, 400);
  const [current] = await db.select().from(messages).where(eq(messages.id, id));
  if (!current) return c.json({ error: 'Introuvable' }, 404);
  if (current.messageType !== 'text') return c.json({ error: 'Ce type de message ne peut pas être modifié' }, 400);
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

async function createChannelNotifications(
  channelId: string,
  sender: AuthUser,
  body: string,
  messageId: string,
  mentionedUserIds: string[] = [],
) {
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
    const mentionedIds = new Set(mentionedUserIds);
    await db.insert(notifications).values(recipientIds.map((userId) => ({
      userId,
      type: 'message',
      title: mentionedIds.has(userId)
        ? `${senderName} t’a mentionné · #${channel.name}`
        : `${senderName} · #${channel.name}`,
      body: body.slice(0, 300),
      data: JSON.stringify({
        channelId,
        channelName: channel.name,
        messageId,
        mentioned: mentionedIds.has(userId),
      }),
    })));
  } catch (error) {
    console.error('[Notifications] Failed to store channel notifications', error);
  }
}

async function notifyChannelMembers(
  channelId: string,
  sender: AuthUser,
  messageBody: string,
  messageId: string,
  mentionedUserIds: string[] = [],
) {
  const [channel] = await db
    .select({ name: channels.name, isPrivate: channels.isPrivate })
    .from(channels).where(eq(channels.id, channelId));
  if (!channel) return;

  let tokens: { token: string; userId: string }[];

  if (channel.isPrivate) {
    // Private: notify channel members except the sender, on every device.
    const members = await db
      .select({ userId: channelMembers.userId })
      .from(channelMembers)
      .where(eq(channelMembers.channelId, channelId));
    if (members.length === 0) return;
    tokens = await db
      .select({ token: pushTokens.token, userId: pushTokens.userId })
      .from(pushTokens)
      .innerJoin(users, eq(pushTokens.userId, users.id))
      .leftJoin(userSettings, eq(pushTokens.userId, userSettings.userId))
      .where(and(
        inArray(pushTokens.userId, members.map((m) => m.userId)),
        ne(pushTokens.userId, sender.id),
        or(eq(users.status, 'approved'), inArray(users.role, ['coach', 'admin'])),
        or(isNull(userSettings.notifyMessages), eq(userSettings.notifyMessages, true)),
      ));
  } else {
    // Public: notify approved members and staff only
    tokens = await db
      .select({ token: pushTokens.token, userId: pushTokens.userId })
      .from(pushTokens)
      .innerJoin(users, eq(pushTokens.userId, users.id))
      .leftJoin(userSettings, eq(pushTokens.userId, userSettings.userId))
      .where(and(
        ne(pushTokens.userId, sender.id),
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

  const mentionedIds = new Set(mentionedUserIds);
  const msgs = tokens.map((t) => ({
    to: t.token,
    sound: 'default' as const,
    title: mentionedIds.has(t.userId) ? `${senderName} t’a mentionné` : senderName,
    subtitle: `#${channel.name}`,
    body: messageBody,
    data: {
      screen: 'chat',
      channelId,
      channelName: channel.name,
      messageId,
      senderId: sender.id,
      mentioned: mentionedIds.has(t.userId),
      url: `/chat?channel=${encodeURIComponent(channelId)}&name=${encodeURIComponent(channel.name)}&message=${encodeURIComponent(messageId)}`,
    },
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
