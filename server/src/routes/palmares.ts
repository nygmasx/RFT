import { Hono } from 'hono';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { palmares, userSettings } from '../db/schema';
import { requireApproved } from '../middleware/session';
import type { AuthUser } from '../auth';
import { isStaff } from '../lib/access';

const app = new Hono<{ Variables: { user: AuthUser } }>();

app.get('/:userId', requireApproved, async (c) => {
  const requester = c.get('user');
  const targetId = c.req.param('userId');
  if (requester.id !== targetId && !isStaff(requester)) {
    const [settings] = await db.select({ sharePalmares: userSettings.sharePalmares })
      .from(userSettings).where(eq(userSettings.userId, targetId));
    if (settings?.sharePalmares === false) return c.json({ error: 'Palmarès privé' }, 403);
  }
  const rows = await db
    .select()
    .from(palmares)
    .where(eq(palmares.userId, targetId))
    .orderBy(desc(palmares.compDate));
  return c.json(rows);
});

app.post('/', requireApproved, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    competition_name: string; comp_date: string; weight_class?: string;
    comp_type?: 'GI' | 'NO-GI'; place: number; notes?: string;
  }>();

  const [row] = await db.insert(palmares).values({
    userId:          user.id,
    competitionName: body.competition_name,
    compDate:        body.comp_date,
    weightClass:     body.weight_class ?? null,
    compType:        body.comp_type ?? null,
    place:           body.place,
    notes:           body.notes ?? null,
  }).returning();

  return c.json(row, 201);
});

export { app as palmaresRouter };
