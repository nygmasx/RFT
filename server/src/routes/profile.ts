import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users } from '../db/schema';
import { requireSession } from '../middleware/session';
import type { AuthUser } from '../auth';
import { notifyCoaches, notifyUser } from './push';

const app = new Hono<{ Variables: { user: AuthUser } }>();

// GET /api/profile — own profile
app.get('/', requireSession, async (c) => {
  const user = c.get('user');
  const [profile] = await db.select().from(users).where(eq(users.id, user.id));
  return c.json(profile);
});

// GET /api/profile/all — all approved members (for admin/coach)
app.get('/all', requireSession, async (c) => {
  const rows = await db.select().from(users).orderBy(users.firstName);
  return c.json(rows);
});

// GET /api/profile/:id
app.get('/:id', requireSession, async (c) => {
  const [profile] = await db.select().from(users).where(eq(users.id, c.req.param('id')));
  if (!profile) return c.json({ error: 'Introuvable' }, 404);
  return c.json(profile);
});

// GET /api/profile/:id/avatar — public, serves avatar image for push notifications
app.get('/:id/avatar', async (c) => {
  const [profile] = await db
    .select({ avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, c.req.param('id')));

  if (!profile?.avatarUrl?.startsWith('data:')) {
    return c.body(null, 404);
  }

  const [header, base64] = profile.avatarUrl.split(',');
  const mimeMatch = header?.match(/data:([^;]+)/);
  const mime = mimeMatch?.[1] ?? 'image/jpeg';
  const buffer = Buffer.from(base64, 'base64');

  return c.body(buffer, 200, {
    'Content-Type': mime,
    'Cache-Control': 'public, max-age=86400',
  });
});

// PUT /api/profile — update own profile
app.put('/', requireSession, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<Partial<{
    firstName: string; lastName: string; category: string;
    weightClass: string; stance: string; phone: string; avatarUrl: string;
  }>>();

  const [updated] = await db
    .update(users)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .returning();

  return c.json(updated);
});

// PUT /api/profile/:id/status — coach/admin only
app.put('/:id/status', requireSession, async (c) => {
  const caller = c.get('user');
  if (caller.role !== 'coach' && caller.role !== 'admin') {
    return c.json({ error: 'Accès refusé' }, 403);
  }
  const { status } = await c.req.json<{ status: 'approved' | 'rejected' | 'pending' }>();
  const [updated] = await db
    .update(users)
    .set({ status, updatedAt: new Date() })
    .where(eq(users.id, c.req.param('id')))
    .returning();

  // Notify the member of their status change
  if (status === 'approved') {
    notifyUser(c.req.param('id'), '✅ Inscription validée', 'Ton compte a été approuvé. Bienvenue chez Ronin Fight Team !');
  } else if (status === 'rejected') {
    notifyUser(c.req.param('id'), '❌ Inscription refusée', 'Ton inscription n\'a pas été acceptée. Contacte le coach pour plus d\'infos.');
  }

  return c.json(updated);
});

export { app as profileRouter };
