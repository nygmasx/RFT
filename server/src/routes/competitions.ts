import { Hono } from 'hono';
import { eq, gte, asc, and } from 'drizzle-orm';
import { db } from '../db/client';
import { competitions, registrations, calendarEvents } from '../db/schema';
import { requireSession, requireCoach } from '../middleware/session';
import type { AuthUser } from '../auth';

const app = new Hono<{ Variables: { user: AuthUser } }>();

// GET /api/competitions — upcoming competitions + calendar compets
app.get('/', requireSession, async (c) => {
  const user = c.get('user');
  const today = new Date().toISOString().split('T')[0];

  const [comps, calEvents, regs] = await Promise.all([
    db.select().from(competitions).where(gte(competitions.compDate, today)).orderBy(asc(competitions.compDate)),
    db.select().from(calendarEvents).where(and(eq(calendarEvents.type, 'compet'), gte(calendarEvents.eventDate, today))).orderBy(asc(calendarEvents.eventDate)),
    db.select({ id: registrations.id, competitionId: registrations.competitionId, status: registrations.status, weightClass: registrations.weightClass })
      .from(registrations)
      .where(eq(registrations.userId, user.id)),
  ]);

  // Map calendar events to competition shape, tagged as calendar source
  const calCompets = calEvents.map((e) => ({
    id:                    e.id,
    name:                  e.title,
    location:              e.place ?? null,
    comp_date:             e.eventDate,
    category:              null,
    comp_type:             null,
    registration_deadline: null,
    status:                'open' as const,
    created_at:            e.createdAt,
    _fromCalendar:         true,
  }));

  const upcoming = [
    ...comps.map((c) => ({ ...c, comp_date: c.compDate, created_at: c.createdAt, _fromCalendar: false })),
    ...calCompets,
  ].sort((a, b) => a.comp_date.localeCompare(b.comp_date));

  // Fetch full competition data for registrations
  const regCompIds = regs.map((r) => r.competitionId);
  const regComps = regCompIds.length
    ? await db.select().from(competitions).where(
        eq(competitions.id, regCompIds[0]) // simplified — real: inArray
      )
    : [];

  const fullRegs = regs.map((r) => ({
    ...r,
    competitions: regComps.find((c) => c.id === r.competitionId) ?? null,
  }));

  return c.json({ upcoming, registrations: fullRegs });
});

// GET /api/competitions/:id
app.get('/:id', requireSession, async (c) => {
  const id = c.req.param('id') as `${string}-${string}-${string}-${string}-${string}`;
  const [comp] = await db.select().from(competitions).where(eq(competitions.id, id));
  if (!comp) return c.json({ error: 'Introuvable' }, 404);
  return c.json(comp);
});

// POST /api/competitions — coach only
app.post('/', requireCoach, async (c) => {
  const body = await c.req.json();
  const [comp] = await db.insert(competitions).values({
    name:                 body.name,
    location:             body.location ?? null,
    compDate:             body.comp_date,
    category:             body.category ?? null,
    compType:             body.comp_type ?? null,
    registrationDeadline: body.registration_deadline ?? null,
    status:               body.status ?? 'open',
  }).returning();
  return c.json(comp, 201);
});

// POST /api/competitions/:id/register
app.post('/:id/register', requireSession, async (c) => {
  const user = c.get('user');
  const competitionId = c.req.param('id') as `${string}-${string}-${string}-${string}-${string}`;
  const body = await c.req.json<{ weight_class?: string }>();

  const [reg] = await db
    .insert(registrations)
    .values({ userId: user.id, competitionId, weightClass: body.weight_class ?? null, status: 'en_attente' })
    .returning();

  return c.json(reg, 201);
});

// DELETE /api/competitions/registrations/:regId
app.delete('/registrations/:regId', requireSession, async (c) => {
  const user = c.get('user');
  const regId = c.req.param('regId') as `${string}-${string}-${string}-${string}-${string}`;

  await db.delete(registrations).where(and(eq(registrations.id, regId), eq(registrations.userId, user.id)));
  return c.json({ ok: true });
});

export { app as competitionsRouter };
