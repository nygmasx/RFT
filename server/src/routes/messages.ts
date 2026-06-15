import { Hono } from 'hono';
import { eq, asc } from 'drizzle-orm';
import { db } from '../db/client';
import { messages, users } from '../db/schema';
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

  return c.json({
    ...msg,
    profiles: { first_name: user.firstName, last_name: user.lastName },
  }, 201);
});

export { app as messagesRouter };
