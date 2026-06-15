import { Hono } from 'hono';
import { asc, gte, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { calendarEvents } from '../db/schema';
import { requireSession, requireCoach } from '../middleware/session';
import type { AuthUser } from '../auth';

const app = new Hono<{ Variables: { user: AuthUser } }>();

app.get('/', requireSession, async (c) => {
  const today = new Date().toISOString().split('T')[0];
  const rows = await db
    .select()
    .from(calendarEvents)
    .where(gte(calendarEvents.eventDate, today))
    .orderBy(asc(calendarEvents.eventDate));
  return c.json(rows);
});

app.post('/', requireCoach, async (c) => {
  const body = await c.req.json<{
    type: 'cours' | 'compet' | 'stage';
    title: string;
    event_date: string;
    event_time?: string;
    place?: string;
  }>();

  const [row] = await db.insert(calendarEvents).values({
    type:      body.type,
    title:     body.title,
    eventDate: body.event_date,
    eventTime: body.event_time ?? null,
    place:     body.place ?? null,
  }).returning();

  return c.json(row, 201);
});

app.delete('/:id', requireCoach, async (c) => {
  const id = c.req.param('id') as `${string}-${string}-${string}-${string}-${string}`;
  await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
  return c.json({ ok: true });
});

export { app as calendarRouter };
