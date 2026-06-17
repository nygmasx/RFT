import { Hono } from 'hono';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { pushTokens, users } from '../db/schema';
import { requireSession } from '../middleware/session';
import type { AuthUser } from '../auth';

const app = new Hono<{ Variables: { user: AuthUser } }>();

// POST /api/push-tokens — save or update device token
app.post('/', requireSession, async (c) => {
  const user = c.get('user');
  const { token } = await c.req.json<{ token: string }>();
  if (!token) return c.json({ error: 'Token requis' }, 400);

  // Upsert: insert if not exists
  const existing = await db
    .select({ id: pushTokens.id })
    .from(pushTokens)
    .where(eq(pushTokens.token, token))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(pushTokens).values({ userId: user.id, token });
  }

  return c.json({ ok: true });
});

// Internal helper — send Expo push notifications to all coaches
export async function notifyCoaches(title: string, body: string) {
  try {
    const coaches = await db
      .select({ token: pushTokens.token })
      .from(pushTokens)
      .innerJoin(users, eq(pushTokens.userId, users.id))
      .where(inArray(users.role, ['coach', 'admin']));

    if (coaches.length === 0) return;

    const messages = coaches.map((c) => ({
      to: c.token,
      sound: 'default' as const,
      title,
      body,
    }));

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    console.error('[Push] Failed to notify coaches:', e);
  }
}

// Internal helper — send to a specific user
export async function notifyUser(userId: string, title: string, body: string) {
  try {
    const tokens = await db
      .select({ token: pushTokens.token })
      .from(pushTokens)
      .where(eq(pushTokens.userId, userId));

    if (tokens.length === 0) return;

    const messages = tokens.map((t) => ({
      to: t.token,
      sound: 'default' as const,
      title,
      body,
    }));

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    console.error('[Push] Failed to notify user:', e);
  }
}

// POST /api/push-tokens/notify-registration — called after sign-up to alert coaches
app.post('/notify-registration', requireSession, async (c) => {
  const user = c.get('user');
  const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;
  await notifyCoaches('🥋 Nouvelle demande', `${name} souhaite rejoindre le club.`);
  return c.json({ ok: true });
});

export { app as pushRouter };
