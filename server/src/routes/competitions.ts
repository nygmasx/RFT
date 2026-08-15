import { Hono } from 'hono';
import { eq, gte, asc, and, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { competitions, registrations, calendarEvents, competitionBookmarks, palmares, users } from '../db/schema';
import { requireApproved, requireCoach } from '../middleware/session';
import type { AuthUser } from '../auth';
import { ensureStoredCompetition, findCalendarCompetition } from '../lib/competition-record';
import { notifyMembers, notifyUser } from './push';

const app = new Hono<{ Variables: { user: AuthUser } }>();

function competitionDto(comp: typeof competitions.$inferSelect) {
  return {
    id: comp.id,
    name: comp.name,
    location: comp.location,
    latitude: comp.latitude,
    longitude: comp.longitude,
    comp_date: comp.compDate,
    category: comp.category,
    comp_type: comp.compType,
    registration_deadline: comp.registrationDeadline,
    status: comp.status,
    created_at: comp.createdAt,
  };
}

function calendarCompetitionDto(event: typeof calendarEvents.$inferSelect) {
  return {
    id: event.id,
    name: event.title,
    location: event.place,
    latitude: event.latitude,
    longitude: event.longitude,
    comp_date: event.eventDate,
    category: null,
    comp_type: null,
    registration_deadline: null,
    status: 'open',
    created_at: event.createdAt,
    _fromCalendar: true,
  };
}

app.get('/all', requireCoach, async (c) => {
  const rows = await db.select().from(competitions).orderBy(asc(competitions.compDate));
  return c.json(rows.map(competitionDto));
});

// GET /api/competitions/admin/overview — every competition with management counts
app.get('/admin/overview', requireCoach, async (c) => {
  const [storedCompetitions, calendarCompetitions, registrationRows, resultRows] = await Promise.all([
    db.select().from(competitions).orderBy(asc(competitions.compDate)),
    db.select().from(calendarEvents).where(eq(calendarEvents.type, 'compet')).orderBy(asc(calendarEvents.eventDate)),
    db.select({ competitionId: registrations.competitionId }).from(registrations),
    db.select({ competitionId: palmares.competitionId }).from(palmares),
  ]);

  const storedIds = new Set(storedCompetitions.map(({ id }) => id));
  const allCompetitions = [
    ...storedCompetitions.map(competitionDto),
    ...calendarCompetitions.filter(({ id }) => !storedIds.has(id)).map(calendarCompetitionDto),
  ].sort((a, b) => b.comp_date.localeCompare(a.comp_date));

  return c.json(allCompetitions.map((competition) => ({
    ...competition,
    registered_count: registrationRows.filter(({ competitionId }) => competitionId === competition.id).length,
    result_count: resultRows.filter(({ competitionId }) => competitionId === competition.id).length,
  })));
});

// GET /api/competitions/:id/admin — members, registrations and results for staff
app.get('/:id/admin', requireCoach, async (c) => {
  const id = c.req.param('id') as `${string}-${string}-${string}-${string}-${string}`;
  const competition = await ensureStoredCompetition(id);
  if (!competition) return c.json({ error: 'Compétition introuvable' }, 404);

  const [members, registrationRows, resultRows] = await Promise.all([
    db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      avatarUrl: users.avatarUrl,
      category: users.category,
      weightClass: users.weightClass,
    })
      .from(users)
      .where(and(eq(users.status, 'approved'), eq(users.role, 'member')))
      .orderBy(asc(users.lastName), asc(users.firstName)),
    db.select().from(registrations).where(eq(registrations.competitionId, id)),
    db.select().from(palmares).where(eq(palmares.competitionId, id)),
  ]);

  return c.json({
    competition: competitionDto(competition),
    members: members.map((member) => {
      const registration = registrationRows.find(({ userId }) => userId === member.id);
      const result = resultRows.find(({ userId }) => userId === member.id);
      return {
        ...member,
        registration: registration ? {
          id: registration.id,
          status: registration.status,
          weightClass: registration.weightClass,
          createdAt: registration.createdAt,
        } : null,
        result: result ?? null,
      };
    }),
  });
});

// GET /api/competitions — upcoming competitions + calendar compets
app.get('/', requireApproved, async (c) => {
  const user = c.get('user');
  const today = new Date().toISOString().split('T')[0];

  const [comps, calEvents, regs, bookmarks] = await Promise.all([
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
    db.select({ competitionId: competitionBookmarks.competitionId })
      .from(competitionBookmarks)
      .where(eq(competitionBookmarks.userId, user.id)),
  ]);
  const bookmarkedIds = new Set(bookmarks.map((row) => row.competitionId));

  // Map calendar events to competition shape, tagged as calendar source
  const storedCompetitionIds = new Set(comps.map((comp) => comp.id));
  const calCompets = calEvents
    .filter((event) => !storedCompetitionIds.has(event.id))
    .map(calendarCompetitionDto);

  const upcoming = [
    ...comps.map((comp) => ({ ...competitionDto(comp), bookmarked: bookmarkedIds.has(comp.id), _fromCalendar: false })),
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
  const user = c.get('user');
  const id = c.req.param('id') as `${string}-${string}-${string}-${string}-${string}`;
  const [comp] = await db.select().from(competitions).where(eq(competitions.id, id));
  if (!comp) {
    const event = await findCalendarCompetition(id);
    if (!event) return c.json({ error: 'Introuvable' }, 404);
    return c.json({ ...calendarCompetitionDto(event), bookmarked: false });
  }
  const [bookmark] = await db.select({ competitionId: competitionBookmarks.competitionId })
    .from(competitionBookmarks)
    .where(and(eq(competitionBookmarks.competitionId, id), eq(competitionBookmarks.userId, user.id)));
  return c.json({ ...competitionDto(comp), bookmarked: Boolean(bookmark) });
});

// POST /api/competitions — coach only
app.post('/', requireCoach, async (c) => {
  const body = await c.req.json();
  if (!body.name?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(body.comp_date ?? '')) {
    return c.json({ error: 'Nom et date valides obligatoires' }, 400);
  }
  const hasCoordinates = Number.isFinite(body.latitude) && Number.isFinite(body.longitude);
  const [comp] = await db.insert(competitions).values({
    name:                 body.name.trim(),
    location:             body.location ?? null,
    latitude:             hasCoordinates ? body.latitude : null,
    longitude:            hasCoordinates ? body.longitude : null,
    compDate:             body.comp_date,
    category:             body.category ?? null,
    compType:             body.comp_type ?? null,
    registrationDeadline: body.registration_deadline ?? null,
    status:               body.status ?? 'open',
  }).returning();
  void notifyMembers('notifyCompetitions', `🏆 ${comp.name}`, `${comp.compDate}${comp.location ? ` · ${comp.location}` : ''}`, { competitionId: comp.id }, 'competition');
  return c.json(competitionDto(comp), 201);
});

app.put('/:id', requireCoach, async (c) => {
  const id = c.req.param('id') as `${string}-${string}-${string}-${string}-${string}`;
  const body = await c.req.json();
  if (!body.name?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(body.comp_date ?? '')) {
    return c.json({ error: 'Nom et date valides obligatoires' }, 400);
  }
  const hasCoordinates = Number.isFinite(body.latitude) && Number.isFinite(body.longitude);
  const [comp] = await db.update(competitions).set({
    name: body.name.trim(),
    location: body.location?.trim() || null,
    latitude: hasCoordinates ? body.latitude : null,
    longitude: hasCoordinates ? body.longitude : null,
    compDate: body.comp_date,
    category: body.category?.trim() || null,
    compType: body.comp_type ?? null,
    registrationDeadline: body.registration_deadline || null,
    status: body.status ?? 'open',
  }).where(eq(competitions.id, id)).returning();
  if (!comp) return c.json({ error: 'Introuvable' }, 404);
  return c.json(competitionDto(comp));
});

app.delete('/:id', requireCoach, async (c) => {
  const id = c.req.param('id') as `${string}-${string}-${string}-${string}-${string}`;
  const [row] = await db.delete(competitions).where(eq(competitions.id, id)).returning({ id: competitions.id });
  if (!row) return c.json({ error: 'Introuvable' }, 404);
  return c.json({ ok: true });
});

app.put('/:id/bookmark', requireApproved, async (c) => {
  const id = c.req.param('id') as `${string}-${string}-${string}-${string}-${string}`;
  const userId = c.get('user').id;
  const competition = await ensureStoredCompetition(id);
  if (!competition) return c.json({ error: 'Compétition introuvable' }, 404);
  const [existing] = await db.select().from(competitionBookmarks)
    .where(and(eq(competitionBookmarks.competitionId, id), eq(competitionBookmarks.userId, userId)));
  if (existing) {
    await db.delete(competitionBookmarks).where(and(
      eq(competitionBookmarks.competitionId, id), eq(competitionBookmarks.userId, userId),
    ));
    return c.json({ bookmarked: false });
  }
  await db.insert(competitionBookmarks).values({ competitionId: id, userId });
  return c.json({ bookmarked: true });
});

// POST /api/competitions/:id/register
app.post('/:id/register', requireApproved, async (c) => {
  const user = c.get('user');
  const competitionId = c.req.param('id') as `${string}-${string}-${string}-${string}-${string}`;
  const body = await c.req.json<{ weight_class?: string }>();

  const competition = await ensureStoredCompetition(competitionId);
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

// PUT /api/competitions/:id/admin/registrations/:userId — force enrollment
app.put('/:id/admin/registrations/:userId', requireCoach, async (c) => {
  const competitionId = c.req.param('id') as `${string}-${string}-${string}-${string}-${string}`;
  const userId = c.req.param('userId');
  const body = await c.req.json<{ weight_class?: string | null }>();
  const competition = await ensureStoredCompetition(competitionId);
  if (!competition) return c.json({ error: 'Compétition introuvable' }, 404);

  const [member] = await db.select({ id: users.id }).from(users)
    .where(and(eq(users.id, userId), eq(users.status, 'approved'), eq(users.role, 'member')));
  if (!member) return c.json({ error: 'Élève introuvable ou non approuvé' }, 404);

  const weightClass = body.weight_class?.trim() || null;
  const [registration] = await db.insert(registrations)
    .values({ userId, competitionId, weightClass, status: 'confirmé' })
    .onConflictDoUpdate({
      target: [registrations.userId, registrations.competitionId],
      set: { weightClass, status: 'confirmé' },
    })
    .returning();

  void notifyUser(
    userId,
    '🏆 Inscription confirmée',
    `Le coach t’a inscrit à ${competition.name}.`,
    { competitionId },
    'competition',
  );

  return c.json({
    id: registration.id,
    user_id: registration.userId,
    competition_id: registration.competitionId,
    weight_class: registration.weightClass,
    status: registration.status,
    created_at: registration.createdAt,
  }, 201);
});

// DELETE /api/competitions/:id/admin/registrations/:userId — staff removal
app.delete('/:id/admin/registrations/:userId', requireCoach, async (c) => {
  const competitionId = c.req.param('id') as `${string}-${string}-${string}-${string}-${string}`;
  const userId = c.req.param('userId');
  const [removed] = await db.delete(registrations).where(and(
    eq(registrations.competitionId, competitionId),
    eq(registrations.userId, userId),
  )).returning({ id: registrations.id });

  if (!removed) return c.json({ error: 'Inscription introuvable' }, 404);
  return c.json({ ok: true });
});

// DELETE /api/competitions/registrations/:regId
app.delete('/registrations/:regId', requireApproved, async (c) => {
  const user = c.get('user');
  const regId = c.req.param('regId') as `${string}-${string}-${string}-${string}-${string}`;

  await db.delete(registrations).where(and(eq(registrations.id, regId), eq(registrations.userId, user.id)));
  return c.json({ ok: true });
});

export { app as competitionsRouter };
