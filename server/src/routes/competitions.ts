import { Hono } from 'hono';
import { eq, gte, asc, and, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { competitions, registrations, calendarEvents } from '../db/schema';
import { requireApproved, requireCoach } from '../middleware/session';
import type { AuthUser } from '../auth';
import { notifyMembers } from './push';

const app = new Hono<{ Variables: { user: AuthUser } }>();

function competitionDto(comp: typeof competitions.$inferSelect) {
  return {
    id: comp.id,
    name: comp.name,
    location: comp.location,
    comp_date: comp.compDate,
    category: comp.category,
    comp_type: comp.compType,
    registration_deadline: comp.registrationDeadline,
    status: comp.status,
    created_at: comp.createdAt,
  };
}

// GET /api/competitions — upcoming competitions + calendar compets
app.get('/', requireApproved, async (c) => {
  const user = c.get('user');
  const today = new Date().toISOString().split('T')[0];

  const [comps, calEvents, regs] = await Promise.all([
    db.select().from(competitions).where(gte(competitions.compDate, today)).orderBy(asc(competitions.compDate)),
    db.select().from(calendarEvents).where(and(eq(calendarEvents.type, 'compet'), gte(calendarEvents.eventDate, today))).orderBy(asc(calendarEvents.eventDate)),
    db.select({
      id: registrations.id,
      userId: registrations.userId,
      competitionId: registrations.competitionId,
      status: registrations.status,
      weightClass: registrations.weightClass,
      createdAt: registrations.createdAt,
    })
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
    ...comps.map((comp) => ({ ...competitionDto(comp), _fromCalendar: false })),
    ...calCompets,
  ].sort((a, b) => a.comp_date.localeCompare(b.comp_date));

  // Fetch full competition data for registrations
  const regCompIds = [...new Set(regs.map((r) => r.competitionId))];
  const regComps = regCompIds.length
    ? await db.select().from(competitions).where(inArray(competitions.id, regCompIds))
    : [];

  const fullRegs = regs.map((r) => ({
    id: r.id,
    user_id: r.userId,
    competition_id: r.competitionId,
    weight_class: r.weightClass,
    status: r.status,
    created_at: r.createdAt,
    competitions: (() => {
      const comp = regComps.find((candidate) => candidate.id === r.competitionId);
      return comp ? competitionDto(comp) : null;
    })(),
  }));

  return c.json({ upcoming, registrations: fullRegs });
});

// GET /api/competitions/:id
app.get('/:id', requireApproved, async (c) => {
  const id = c.req.param('id') as `${string}-${string}-${string}-${string}-${string}`;
  const [comp] = await db.select().from(competitions).where(eq(competitions.id, id));
  if (!comp) return c.json({ error: 'Introuvable' }, 404);
  return c.json(competitionDto(comp));
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
  void notifyMembers('notifyCompetitions', `🏆 ${comp.name}`, `${comp.compDate}${comp.location ? ` · ${comp.location}` : ''}`);
  return c.json(competitionDto(comp), 201);
});

// POST /api/competitions/:id/register
app.post('/:id/register', requireApproved, async (c) => {
  const user = c.get('user');
  const competitionId = c.req.param('id') as `${string}-${string}-${string}-${string}-${string}`;
  const body = await c.req.json<{ weight_class?: string }>();

  const [competition] = await db.select().from(competitions).where(eq(competitions.id, competitionId));
  if (!competition) return c.json({ error: 'Compétition introuvable' }, 404);
  const today = new Date().toISOString().split('T')[0];
  if (competition.status === 'closed' || competition.compDate < today) {
    return c.json({ error: 'Inscriptions closes' }, 409);
  }
  if (competition.registrationDeadline && competition.registrationDeadline < today) {
    return c.json({ error: 'Date limite dépassée' }, 409);
  }

  const [reg] = await db
    .insert(registrations)
    .values({ userId: user.id, competitionId, weightClass: body.weight_class ?? null, status: 'en_attente' })
    .onConflictDoUpdate({
      target: [registrations.userId, registrations.competitionId],
      set: { weightClass: body.weight_class ?? null, status: 'en_attente' },
    })
    .returning();

  return c.json({
    id: reg.id,
    user_id: reg.userId,
    competition_id: reg.competitionId,
    weight_class: reg.weightClass,
    status: reg.status,
    created_at: reg.createdAt,
  }, 201);
});

// DELETE /api/competitions/registrations/:regId
app.delete('/registrations/:regId', requireApproved, async (c) => {
  const user = c.get('user');
  const regId = c.req.param('regId') as `${string}-${string}-${string}-${string}-${string}`;

  await db.delete(registrations).where(and(eq(registrations.id, regId), eq(registrations.userId, user.id)));
  return c.json({ ok: true });
});

export { app as competitionsRouter };
