import { Hono } from 'hono';
import { eq } from 'drizzle-orm';

import type { AuthUser } from '../auth';
import { db } from '../db/client';
import { users, userSettings } from '../db/schema';
import { isStaff } from '../lib/access';
import { parseSettingsUpdate } from '../lib/settings-input';
import { requireApproved } from '../middleware/session';

const app = new Hono<{ Variables: { user: AuthUser } }>();

const DEFAULT_SETTINGS = {
  notifyCoach: true,
  notifyMessages: true,
  notifyCompetitions: true,
  notifyCarpools: false,
  shareGrade: true,
  sharePalmares: true,
  profileVisibility: 'members' as const,
};

app.get('/', requireApproved, async (c) => {
  const user = c.get('user');
  const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, user.id));
  return c.json(settings ?? { userId: user.id, ...DEFAULT_SETTINGS });
});

app.put('/', requireApproved, async (c) => {
  const user = c.get('user');
  const parsed = parseSettingsUpdate(await c.req.json<unknown>());
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);

  const [settings] = await db
    .insert(userSettings)
    .values({ userId: user.id, ...parsed.value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { ...parsed.value, updatedAt: new Date() },
    })
    .returning();

  return c.json(settings);
});

app.post('/leave-club', requireApproved, async (c) => {
  const user = c.get('user');
  if (isStaff(user)) {
    return c.json({ error: 'Un membre du staff doit transférer ses responsabilités avant de quitter le club.' }, 409);
  }

  await db
    .update(users)
    .set({ status: 'rejected', updatedAt: new Date() })
    .where(eq(users.id, user.id));

  return c.json({ ok: true });
});

export { app as settingsRouter };
