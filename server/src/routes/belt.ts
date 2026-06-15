import { Hono } from 'hono';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { beltRecords } from '../db/schema';
import { requireSession } from '../middleware/session';
import type { AuthUser } from '../auth';

const app = new Hono<{ Variables: { user: AuthUser } }>();

// GET /api/belt/:userId
app.get('/:userId', requireSession, async (c) => {
  const [belt] = await db
    .select()
    .from(beltRecords)
    .where(eq(beltRecords.userId, c.req.param('userId')))
    .orderBy(desc(beltRecords.createdAt))
    .limit(1);
  return c.json(belt ?? null);
});

// PUT /api/belt/:userId — upsert belt (coach only)
app.put('/:userId', requireSession, async (c) => {
  const caller = c.get('user');
  if (caller.role !== 'coach' && caller.role !== 'admin') {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const targetId = c.req.param('userId');
  const body = await c.req.json<{
    color: string; stripes: number; promoted_by?: string; promoted_date?: string;
  }>();

  // Check if belt record already exists
  const [existing] = await db
    .select({ id: beltRecords.id })
    .from(beltRecords)
    .where(eq(beltRecords.userId, targetId))
    .orderBy(desc(beltRecords.createdAt))
    .limit(1);

  let row;
  if (existing) {
    [row] = await db
      .update(beltRecords)
      .set({ color: body.color, stripes: body.stripes, promotedBy: body.promoted_by ?? null, promotedDate: body.promoted_date ?? null })
      .where(eq(beltRecords.id, existing.id))
      .returning();
  } else {
    [row] = await db
      .insert(beltRecords)
      .values({ userId: targetId, color: body.color, stripes: body.stripes, promotedBy: body.promoted_by ?? null, promotedDate: body.promoted_date ?? null })
      .returning();
  }

  return c.json(row);
});

export { app as beltRouter };
