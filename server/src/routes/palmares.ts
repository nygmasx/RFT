import { Hono } from 'hono';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { palmares } from '../db/schema';
import { requireSession } from '../middleware/session';
import type { AuthUser } from '../auth';

const app = new Hono<{ Variables: { user: AuthUser } }>();

app.get('/:userId', requireSession, async (c) => {
  const rows = await db
    .select()
    .from(palmares)
    .where(eq(palmares.userId, c.req.param('userId')))
    .orderBy(desc(palmares.compDate));
  return c.json(rows);
});

app.post('/', requireSession, async (c) => {
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
