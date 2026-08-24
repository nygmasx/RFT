import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users, userSettings } from '../db/schema';
import { requireApproved, requireCoach, requireSession } from '../middleware/session';
import type { AuthUser } from '../auth';
import { notifyCoaches, notifyUser } from './push';
import { parseProfileUpdate } from '../lib/profile-input';
import { isStaff } from '../lib/access';
import { uploadAvatar } from '../lib/object-storage';

const app = new Hono<{ Variables: { user: AuthUser } }>();

// GET /api/profile — own profile
app.get('/', requireSession, async (c) => {
  const user = c.get('user');
  const [profile] = await db.select().from(users).where(eq(users.id, user.id));
  return c.json(profile);
});

// GET /api/profile/all — full member list for staff administration
app.get('/all', requireCoach, async (c) => {
  const rows = await db.select({
    id: users.id,
    firstName: users.firstName,
    lastName: users.lastName,
    email: users.email,
    status: users.status,
    role: users.role,
    category: users.category,
    weightClass: users.weightClass,
    stance: users.stance,
    phone: users.phone,
    memberId: users.memberId,
    avatarUrl: users.avatarUrl,
    createdAt: users.createdAt,
  }).from(users).orderBy(users.firstName);
  return c.json(rows);
});

// GET /api/profile/directory — minimal approved-member directory
app.get('/directory', requireApproved, async (c) => {
  const rows = await db.select({
    id: users.id,
    firstName: users.firstName,
    lastName: users.lastName,
    avatarUrl: users.avatarUrl,
  }).from(users).where(eq(users.status, 'approved')).orderBy(users.firstName);
  return c.json(rows);
});

// GET /api/profile/:id — public member fields only
app.get('/:id', requireApproved, async (c) => {
  const requester = c.get('user');
  const targetId = c.req.param('id');
  const [settings] = await db
    .select({ profileVisibility: userSettings.profileVisibility })
    .from(userSettings)
    .where(eq(userSettings.userId, targetId));
  const visibility = settings?.profileVisibility ?? 'members';
  const isSelfOrStaff = requester.id === targetId || isStaff(requester);
  if (!isSelfOrStaff && visibility === 'private') return c.json({ error: 'Profil privé' }, 403);
  if (!isSelfOrStaff && visibility === 'coaches') return c.json({ error: 'Profil réservé aux coachs' }, 403);

  const [profile] = await db.select({
    id: users.id,
    firstName: users.firstName,
    lastName: users.lastName,
    status: users.status,
    role: users.role,
    memberId: users.memberId,
    category: users.category,
    weightClass: users.weightClass,
    stance: users.stance,
    avatarUrl: users.avatarUrl,
    createdAt: users.createdAt,
  }).from(users).where(eq(users.id, targetId));
  if (!profile) return c.json({ error: 'Introuvable' }, 404);
  return c.json(profile);
});

// GET /api/profile/:id/avatar — public, serves avatar image for push notifications
app.get('/:id/avatar', async (c) => {
  const [profile] = await db
    .select({ avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, c.req.param('id')));

  if (!profile?.avatarUrl) {
    return c.body(null, 404);
  }
  if (/^https:\/\//.test(profile.avatarUrl)) return c.redirect(profile.avatarUrl, 302);
  if (!profile.avatarUrl.startsWith('data:')) return c.body(null, 404);

  const [header, base64] = profile.avatarUrl.split(',');
  const mimeMatch = header?.match(/data:([^;]+)/);
  const mime = mimeMatch?.[1] ?? 'image/jpeg';
  const buffer = Buffer.from(base64, 'base64');

  return c.body(buffer, 200, {
    'Content-Type': mime,
    'Cache-Control': 'public, max-age=86400',
  });
});

app.put('/avatar', requireSession, async (c) => {
  const { dataUrl } = await c.req.json<{ dataUrl?: string }>();
  if (!dataUrl || dataUrl.length > 2_800_000) return c.json({ error: 'Avatar invalide ou trop volumineux' }, 400);
  try {
    const avatarUrl = await uploadAvatar(c.get('user').id, dataUrl);
    await db.update(users).set({ avatarUrl, updatedAt: new Date() }).where(eq(users.id, c.get('user').id));
    return c.json({ avatarUrl });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_AVATAR') return c.json({ error: 'Format d’avatar invalide' }, 400);
    throw error;
  }
});

// PUT /api/profile — update own profile
app.put('/', requireSession, async (c) => {
  const user = c.get('user');
  const parsed = parseProfileUpdate(await c.req.json<unknown>());
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);

  const [updated] = await db
    .update(users)
    .set({ ...parsed.value, updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .returning();

  return c.json(updated);
});

// PUT /api/profile/:id/status — coach/admin only
app.put('/:id/status', requireCoach, async (c) => {
  const { status } = await c.req.json<{ status?: string }>();
  if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
    return c.json({ error: 'Statut invalide' }, 400);
  }
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
