import { Hono } from 'hono';
import { and, asc, desc, eq, gte, inArray, ne, or, sql } from 'drizzle-orm';

import type { AuthUser } from '../auth';
import { db } from '../db/client';
import {
  classBookings,
  classSessions,
  clubProfile,
  emailCampaigns,
  familyProfiles,
  joinForms,
  joinSubmissions,
  memberDocuments,
  memberMemberships,
  membershipPlans,
  payments,
  seasons,
  trialRegistrations,
  users,
} from '../db/schema';
import { sendTransactionalEmail } from '../lib/email';
import { bookingStatus, buildRecurringSessionDates, parseDocumentDataUrl } from '../lib/club-input';
import { requireApproved, requireCoach } from '../middleware/session';
import { notifyMembers, notifyUser } from './push';

type Env = { Variables: { user: AuthUser } };
type UUID = `${string}-${string}-${string}-${string}-${string}`;

const app = new Hono<Env>();
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}(?::\d{2})?$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function uuid(value: string) {
  return value as UUID;
}

function clean(value: unknown, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  try {
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function publicDocument(row: typeof memberDocuments.$inferSelect, origin: string) {
  const { fileData: _fileData, accessToken, ...document } = row;
  return { ...document, url: `${origin}/api/club/documents/file/${row.id}/${accessToken}` };
}

// Public club page and public acquisition forms.
app.get('/public', async (c) => {
  const [profile] = await db.select().from(clubProfile).where(eq(clubProfile.id, 'rft'));
  const plans = await db.select().from(membershipPlans)
    .where(eq(membershipPlans.active, true)).orderBy(asc(membershipPlans.priceCents));
  const coaches = await db.select({
    id: users.id,
    firstName: users.firstName,
    lastName: users.lastName,
    avatarUrl: users.avatarUrl,
    category: users.category,
  }).from(users).where(and(eq(users.status, 'approved'), inArray(users.role, ['coach', 'admin'])));
  const form = profile?.joinFormId
    ? (await db.select().from(joinForms).where(and(eq(joinForms.id, profile.joinFormId), eq(joinForms.active, true))))[0]
    : undefined;
  return c.json({
    profile: profile ? { ...profile, disciplines: parseJson<string[]>(profile.disciplines, []) } : null,
    coaches,
    plans: plans.map((plan) => ({ ...plan, features: parseJson<string[]>(plan.features, []) })),
    joinForm: form ? { ...form, fields: parseJson(form.fields, []) } : null,
  });
});

app.get('/public/sessions', async (c) => {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await db.select({
    id: classSessions.id,
    title: classSessions.title,
    discipline: classSessions.discipline,
    category: classSessions.category,
    sessionDate: classSessions.sessionDate,
    startTime: classSessions.startTime,
    endTime: classSessions.endTime,
    place: classSessions.place,
    trialAllowed: classSessions.trialAllowed,
    coachFirstName: users.firstName,
    coachLastName: users.lastName,
  }).from(classSessions).leftJoin(users, eq(classSessions.coachId, users.id))
    .where(and(gte(classSessions.sessionDate, today), eq(classSessions.status, 'scheduled')))
    .orderBy(asc(classSessions.sessionDate), asc(classSessions.startTime)).limit(30);
  return c.json(rows);
});

app.post('/public/join/:formId', async (c) => {
  const formId = uuid(c.req.param('formId'));
  const [form] = await db.select().from(joinForms).where(and(eq(joinForms.id, formId), eq(joinForms.active, true)));
  if (!form) return c.json({ error: 'Formulaire indisponible' }, 404);
  const body = await c.req.json<Record<string, unknown>>();
  const firstName = clean(body.firstName, 80);
  const lastName = clean(body.lastName, 80);
  const email = clean(body.email, 160).toLowerCase();
  if (!firstName || !lastName || !EMAIL_RE.test(email)) return c.json({ error: 'Coordonnées invalides' }, 400);
  const [submission] = await db.insert(joinSubmissions).values({
    formId,
    firstName,
    lastName,
    email,
    phone: clean(body.phone, 30) || null,
    answers: JSON.stringify(body.answers && typeof body.answers === 'object' ? body.answers : {}).slice(0, 20_000),
  }).returning();
  return c.json(submission, 201);
});

app.post('/public/trials/:sessionId', async (c) => {
  const sessionId = uuid(c.req.param('sessionId'));
  const today = new Date().toISOString().slice(0, 10);
  const [session] = await db.select().from(classSessions)
    .where(and(eq(classSessions.id, sessionId), gte(classSessions.sessionDate, today), eq(classSessions.status, 'scheduled'), eq(classSessions.trialAllowed, true)));
  if (!session) return c.json({ error: 'Cours d’essai indisponible' }, 404);
  const body = await c.req.json<Record<string, unknown>>();
  const email = clean(body.email, 160).toLowerCase();
  const firstName = clean(body.firstName, 80);
  const lastName = clean(body.lastName, 80);
  if (!firstName || !lastName || !EMAIL_RE.test(email)) return c.json({ error: 'Coordonnées invalides' }, 400);
  const [trial] = await db.insert(trialRegistrations).values({
    sessionId,
    firstName,
    lastName,
    email,
    phone: clean(body.phone, 30) || null,
  }).returning();
  return c.json(trial, 201);
});

app.get('/documents/file/:id/:token', async (c) => {
  const [document] = await db.select().from(memberDocuments).where(and(
    eq(memberDocuments.id, uuid(c.req.param('id'))),
    eq(memberDocuments.accessToken, uuid(c.req.param('token'))),
  ));
  if (!document) return c.body(null, 404);
  return c.body(Buffer.from(document.fileData, 'base64'), 200, {
    'Content-Type': document.mimeType,
    'Content-Disposition': `inline; filename="${document.fileName.replace(/["\r\n]/g, '')}"`,
    'Cache-Control': 'private, max-age=3600',
  });
});

// Member dashboard.
app.get('/overview', requireApproved, async (c) => {
  const user = c.get('user');
  const today = new Date().toISOString().slice(0, 10);
  const origin = new URL(c.req.url).origin;
  const [sessionsRows, profiles, memberships, paymentRows, documents, attendance] = await Promise.all([
    db.select({
      id: classSessions.id,
      title: classSessions.title,
      discipline: classSessions.discipline,
      category: classSessions.category,
      sessionDate: classSessions.sessionDate,
      startTime: classSessions.startTime,
      endTime: classSessions.endTime,
      place: classSessions.place,
      capacity: classSessions.capacity,
      status: classSessions.status,
      coachFirstName: users.firstName,
      coachLastName: users.lastName,
      bookedCount: sql<number>`count(${classBookings.id}) filter (where ${classBookings.status} in ('booked', 'attended'))::int`,
    }).from(classSessions)
      .leftJoin(users, eq(classSessions.coachId, users.id))
      .leftJoin(classBookings, eq(classBookings.sessionId, classSessions.id))
      .where(and(gte(classSessions.sessionDate, today), ne(classSessions.status, 'cancelled')))
      .groupBy(classSessions.id, users.id)
      .orderBy(asc(classSessions.sessionDate), asc(classSessions.startTime)).limit(40),
    db.select().from(familyProfiles).where(eq(familyProfiles.ownerUserId, user.id)).orderBy(asc(familyProfiles.firstName)),
    db.select({
      id: memberMemberships.id,
      status: memberMemberships.status,
      startDate: memberMemberships.startDate,
      endDate: memberMemberships.endDate,
      nextPaymentDate: memberMemberships.nextPaymentDate,
      balanceCents: memberMemberships.balanceCents,
      planName: membershipPlans.name,
      priceCents: membershipPlans.priceCents,
      currency: membershipPlans.currency,
      billingInterval: membershipPlans.billingInterval,
      checkoutUrl: membershipPlans.checkoutUrl,
    }).from(memberMemberships).innerJoin(membershipPlans, eq(memberMemberships.planId, membershipPlans.id))
      .where(eq(memberMemberships.userId, user.id)).orderBy(desc(memberMemberships.createdAt)),
    db.select().from(payments).where(eq(payments.userId, user.id)).orderBy(desc(payments.createdAt)).limit(50),
    db.select().from(memberDocuments).where(eq(memberDocuments.userId, user.id)).orderBy(desc(memberDocuments.createdAt)),
    db.select({
      attended: sql<number>`count(*) filter (where ${classBookings.status} = 'attended')::int`,
      absent: sql<number>`count(*) filter (where ${classBookings.status} = 'absent')::int`,
      total: sql<number>`count(*) filter (where ${classBookings.status} in ('attended', 'absent'))::int`,
    }).from(classBookings).where(eq(classBookings.userId, user.id)),
  ]);
  const sessionIds = sessionsRows.map((row) => row.id);
  const ownBookings = sessionIds.length
    ? await db.select().from(classBookings).where(and(
        inArray(classBookings.sessionId, sessionIds),
        or(eq(classBookings.userId, user.id), inArray(classBookings.familyProfileId, profiles.map((p) => p.id))),
      ))
    : [];
  return c.json({
    sessions: sessionsRows.map((session) => ({
      ...session,
      bookings: ownBookings.filter((booking) => booking.sessionId === session.id),
    })),
    familyProfiles: profiles,
    memberships,
    payments: paymentRows,
    documents: documents.map((document) => publicDocument(document, origin)),
    attendance: attendance[0] ?? { attended: 0, absent: 0, total: 0 },
  });
});

app.post('/sessions/:id/book', requireApproved, async (c) => {
  const user = c.get('user');
  const sessionId = uuid(c.req.param('id'));
  const body: { familyProfileId?: string } = await c.req.json<{ familyProfileId?: string }>().catch(() => ({}));
  const [session] = await db.select().from(classSessions)
    .where(and(eq(classSessions.id, sessionId), gte(classSessions.sessionDate, new Date().toISOString().slice(0, 10)), eq(classSessions.status, 'scheduled')));
  if (!session) return c.json({ error: 'Cours indisponible' }, 404);
  let familyProfileId: UUID | null = null;
  if (body.familyProfileId) {
    const [profile] = await db.select().from(familyProfiles).where(and(
      eq(familyProfiles.id, uuid(body.familyProfileId)), eq(familyProfiles.ownerUserId, user.id),
    ));
    if (!profile) return c.json({ error: 'Profil famille invalide' }, 400);
    familyProfileId = uuid(profile.id);
  }
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(classBookings).where(and(
    eq(classBookings.sessionId, sessionId), inArray(classBookings.status, ['booked', 'attended']),
  ));
  const status = bookingStatus(count, session.capacity);
  const targetCondition = familyProfileId
    ? eq(classBookings.familyProfileId, familyProfileId)
    : eq(classBookings.userId, user.id);
  const [existing] = await db.select().from(classBookings).where(and(eq(classBookings.sessionId, sessionId), targetCondition));
  if (existing && ['booked', 'waitlist', 'attended'].includes(existing.status)) return c.json(existing);
  const [booking] = existing
    ? await db.update(classBookings).set({ status, checkedInAt: null }).where(eq(classBookings.id, existing.id)).returning()
    : await db.insert(classBookings).values({
        sessionId,
        userId: familyProfileId ? null : user.id,
        familyProfileId,
        status,
      }).returning();
  return c.json(booking, existing ? 200 : 201);
});

app.delete('/sessions/:id/book', requireApproved, async (c) => {
  const user = c.get('user');
  const familyProfileId = c.req.query('familyProfileId');
  let condition = eq(classBookings.userId, user.id);
  if (familyProfileId) {
    const [profile] = await db.select().from(familyProfiles).where(and(
      eq(familyProfiles.id, uuid(familyProfileId)), eq(familyProfiles.ownerUserId, user.id),
    ));
    if (!profile) return c.json({ error: 'Profil famille invalide' }, 400);
    condition = eq(classBookings.familyProfileId, profile.id);
  }
  const sessionId = uuid(c.req.param('id'));
  const [cancelledBooking] = await db.select().from(classBookings).where(and(eq(classBookings.sessionId, sessionId), condition));
  if (!cancelledBooking) return c.json({ ok: true });
  await db.update(classBookings).set({ status: 'cancelled', checkedInAt: null }).where(eq(classBookings.id, cancelledBooking.id));
  if (!['booked', 'attended'].includes(cancelledBooking.status)) return c.json({ ok: true });
  const [next] = await db.select().from(classBookings).where(and(
    eq(classBookings.sessionId, sessionId), eq(classBookings.status, 'waitlist'),
  )).orderBy(asc(classBookings.createdAt)).limit(1);
  if (next) {
    await db.update(classBookings).set({ status: 'booked' }).where(eq(classBookings.id, next.id));
    if (next.userId) void notifyUser(next.userId, 'Place disponible', 'Tu réservation au cours est maintenant confirmée.', { classSessionId: c.req.param('id') }, 'class');
  }
  return c.json({ ok: true });
});

app.post('/family', requireApproved, async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const firstName = clean(body.firstName, 80);
  const lastName = clean(body.lastName, 80);
  const birthDate = clean(body.birthDate, 10);
  if (!firstName || !lastName || (birthDate && !DATE_RE.test(birthDate))) return c.json({ error: 'Profil famille invalide' }, 400);
  const [profile] = await db.insert(familyProfiles).values({
    ownerUserId: c.get('user').id,
    firstName,
    lastName,
    birthDate: birthDate || null,
    category: clean(body.category, 80) || null,
  }).returning();
  return c.json(profile, 201);
});

app.delete('/family/:id', requireApproved, async (c) => {
  await db.delete(familyProfiles).where(and(
    eq(familyProfiles.id, uuid(c.req.param('id'))), eq(familyProfiles.ownerUserId, c.get('user').id),
  ));
  return c.json({ ok: true });
});

app.post('/documents', requireApproved, async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const documentPayload = parseDocumentDataUrl(body.dataUrl);
  const category = clean(body.category, 30) || 'other';
  if (!documentPayload || !['license', 'medical', 'insurance', 'identity', 'contract', 'other'].includes(category)) {
    return c.json({ error: 'Document invalide' }, 400);
  }
  const [document] = await db.insert(memberDocuments).values({
    userId: c.get('user').id,
    uploadedBy: c.get('user').id,
    title: clean(body.title, 120) || clean(body.fileName, 120) || 'Document',
    category,
    fileName: clean(body.fileName, 160) || 'document',
    mimeType: documentPayload.mimeType,
    fileData: documentPayload.base64,
    expiresOn: DATE_RE.test(clean(body.expiresOn, 10)) ? clean(body.expiresOn, 10) : null,
  }).returning();
  return c.json(publicDocument(document, new URL(c.req.url).origin), 201);
});

app.delete('/documents/:id', requireApproved, async (c) => {
  const user = c.get('user');
  await db.delete(memberDocuments).where(and(
    eq(memberDocuments.id, uuid(c.req.param('id'))),
    or(eq(memberDocuments.userId, user.id), eq(memberDocuments.uploadedBy, user.id)),
  ));
  return c.json({ ok: true });
});

// Coach administration.
app.get('/admin', requireCoach, async (c) => {
  const today = new Date().toISOString().slice(0, 10);
  const [sessionRows, seasonRows, planRows, membershipRows, paymentRows, submissions, campaigns, profile, forms] = await Promise.all([
    db.select({
      id: classSessions.id,
      seasonId: classSessions.seasonId,
      coachId: classSessions.coachId,
      title: classSessions.title,
      discipline: classSessions.discipline,
      category: classSessions.category,
      sessionDate: classSessions.sessionDate,
      startTime: classSessions.startTime,
      endTime: classSessions.endTime,
      place: classSessions.place,
      capacity: classSessions.capacity,
      status: classSessions.status,
      trialAllowed: classSessions.trialAllowed,
      bookedCount: sql<number>`count(${classBookings.id}) filter (where ${classBookings.status} in ('booked', 'attended'))::int`,
    }).from(classSessions).leftJoin(classBookings, eq(classBookings.sessionId, classSessions.id))
      .where(gte(classSessions.sessionDate, today)).groupBy(classSessions.id)
      .orderBy(asc(classSessions.sessionDate), asc(classSessions.startTime)).limit(100),
    db.select().from(seasons).orderBy(desc(seasons.startDate)),
    db.select().from(membershipPlans).orderBy(desc(membershipPlans.active), asc(membershipPlans.priceCents)),
    db.select({
      id: memberMemberships.id,
      userId: memberMemberships.userId,
      status: memberMemberships.status,
      startDate: memberMemberships.startDate,
      endDate: memberMemberships.endDate,
      nextPaymentDate: memberMemberships.nextPaymentDate,
      balanceCents: memberMemberships.balanceCents,
      notes: memberMemberships.notes,
      planId: membershipPlans.id,
      planName: membershipPlans.name,
      firstName: users.firstName,
      lastName: users.lastName,
    }).from(memberMemberships)
      .innerJoin(membershipPlans, eq(memberMemberships.planId, membershipPlans.id))
      .innerJoin(users, eq(memberMemberships.userId, users.id))
      .orderBy(desc(memberMemberships.createdAt)),
    db.select({
      id: payments.id,
      userId: payments.userId,
      membershipId: payments.membershipId,
      amountCents: payments.amountCents,
      currency: payments.currency,
      method: payments.method,
      status: payments.status,
      dueDate: payments.dueDate,
      paidAt: payments.paidAt,
      reference: payments.reference,
      notes: payments.notes,
      createdAt: payments.createdAt,
      firstName: users.firstName,
      lastName: users.lastName,
    }).from(payments).innerJoin(users, eq(payments.userId, users.id)).orderBy(desc(payments.createdAt)).limit(200),
    db.select().from(joinSubmissions).orderBy(desc(joinSubmissions.createdAt)).limit(100),
    db.select().from(emailCampaigns).orderBy(desc(emailCampaigns.createdAt)).limit(50),
    db.select().from(clubProfile).where(eq(clubProfile.id, 'rft')),
    db.select().from(joinForms).orderBy(desc(joinForms.createdAt)),
  ]);
  return c.json({
    sessions: sessionRows,
    seasons: seasonRows,
    plans: planRows.map((plan) => ({ ...plan, features: parseJson<string[]>(plan.features, []) })),
    memberships: membershipRows,
    payments: paymentRows,
    submissions: submissions.map((row) => ({ ...row, answers: parseJson(row.answers, {}) })),
    campaigns,
    profile: profile[0] ? { ...profile[0], disciplines: parseJson<string[]>(profile[0].disciplines, []) } : null,
    forms: forms.map((form) => ({ ...form, fields: parseJson(form.fields, []) })),
  });
});

app.post('/admin/seasons', requireCoach, async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const startDate = clean(body.startDate, 10);
  const endDate = clean(body.endDate, 10);
  const status = clean(body.status, 20) || 'draft';
  if (!clean(body.name, 120) || !DATE_RE.test(startDate) || !DATE_RE.test(endDate) || endDate < startDate || !['draft', 'active', 'archived'].includes(status)) {
    return c.json({ error: 'Saison invalide' }, 400);
  }
  if (status === 'active') await db.update(seasons).set({ status: 'archived' }).where(eq(seasons.status, 'active'));
  const [season] = await db.insert(seasons).values({ name: clean(body.name, 120), startDate, endDate, status }).returning();
  return c.json(season, 201);
});

app.post('/admin/sessions', requireCoach, async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const sessionDate = clean(body.sessionDate, 10);
  const startTime = clean(body.startTime, 8);
  const endTime = clean(body.endTime, 8);
  const capacity = Number(body.capacity ?? 30);
  const repeatWeeks = Number(body.repeatWeeks ?? 1);
  const recurringDates = buildRecurringSessionDates(sessionDate, repeatWeeks);
  if (!clean(body.title, 120) || !recurringDates || !TIME_RE.test(startTime) || (endTime && !TIME_RE.test(endTime)) || !Number.isInteger(capacity) || capacity < 1 || capacity > 500) {
    return c.json({ error: 'Cours invalide' }, 400);
  }
  const rows = recurringDates.map((occurrenceDate) => {
    return {
      seasonId: body.seasonId ? uuid(clean(body.seasonId, 40)) : null,
      coachId: clean(body.coachId, 120) || c.get('user').id,
      title: clean(body.title, 120),
      discipline: clean(body.discipline, 50) || 'BJJ',
      category: clean(body.category, 80) || null,
      sessionDate: occurrenceDate,
      startTime,
      endTime: endTime || null,
      place: clean(body.place, 180) || null,
      capacity,
      trialAllowed: body.trialAllowed !== false,
    };
  });
  const created = await db.insert(classSessions).values(rows).returning();
  const session = created[0]!;
  void notifyMembers('notifyCoach', `Nouveau cours · ${session.title}`, `${session.sessionDate} à ${session.startTime.slice(0, 5)}`, { classSessionId: session.id }, 'class');
  return c.json({ ...session, createdCount: created.length }, 201);
});

app.post('/admin/documents', requireCoach, async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const userId = clean(body.userId, 160);
  const documentPayload = parseDocumentDataUrl(body.dataUrl);
  const category = clean(body.category, 30) || 'other';
  const [member] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId));
  if (!member || !documentPayload || !['license', 'medical', 'insurance', 'identity', 'contract', 'other'].includes(category)) {
    return c.json({ error: 'Document ou membre invalide' }, 400);
  }
  const [document] = await db.insert(memberDocuments).values({
    userId,
    uploadedBy: c.get('user').id,
    title: clean(body.title, 120) || clean(body.fileName, 120) || 'Document',
    category,
    fileName: clean(body.fileName, 160) || 'document',
    mimeType: documentPayload.mimeType,
    fileData: documentPayload.base64,
    expiresOn: DATE_RE.test(clean(body.expiresOn, 10)) ? clean(body.expiresOn, 10) : null,
  }).returning();
  void notifyUser(userId, 'Nouveau document', `${document.title} a été ajouté à ton dossier.`, { clubDocumentId: document.id }, 'document');
  return c.json(publicDocument(document, new URL(c.req.url).origin), 201);
});

app.delete('/admin/documents/:id', requireCoach, async (c) => {
  await db.delete(memberDocuments).where(eq(memberDocuments.id, uuid(c.req.param('id'))));
  return c.json({ ok: true });
});

app.put('/admin/sessions/:id', requireCoach, async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const status = clean(body.status, 20);
  if (!['scheduled', 'cancelled', 'completed'].includes(status)) return c.json({ error: 'Statut invalide' }, 400);
  const [session] = await db.update(classSessions).set({ status }).where(eq(classSessions.id, uuid(c.req.param('id')))).returning();
  if (!session) return c.json({ error: 'Cours introuvable' }, 404);
  return c.json(session);
});

app.get('/admin/sessions/:id/roster', requireCoach, async (c) => {
  const sessionId = uuid(c.req.param('id'));
  const [bookings, trials] = await Promise.all([
    db.select({
      id: classBookings.id,
      status: classBookings.status,
      checkedInAt: classBookings.checkedInAt,
      userId: classBookings.userId,
      familyProfileId: classBookings.familyProfileId,
      firstName: users.firstName,
      lastName: users.lastName,
      familyFirstName: familyProfiles.firstName,
      familyLastName: familyProfiles.lastName,
    }).from(classBookings)
      .leftJoin(users, eq(classBookings.userId, users.id))
      .leftJoin(familyProfiles, eq(classBookings.familyProfileId, familyProfiles.id))
      .where(and(eq(classBookings.sessionId, sessionId), ne(classBookings.status, 'cancelled')))
      .orderBy(asc(users.firstName), asc(familyProfiles.firstName)),
    db.select().from(trialRegistrations).where(and(
      eq(trialRegistrations.sessionId, sessionId), ne(trialRegistrations.status, 'cancelled'),
    )).orderBy(asc(trialRegistrations.firstName)),
  ]);
  return c.json({ bookings, trials });
});

app.put('/admin/bookings/:id/attendance', requireCoach, async (c) => {
  const { status } = await c.req.json<{ status?: string }>();
  if (!status || !['booked', 'attended', 'absent'].includes(status)) return c.json({ error: 'Présence invalide' }, 400);
  const [booking] = await db.update(classBookings).set({
    status,
    checkedInAt: status === 'attended' ? new Date() : null,
  }).where(eq(classBookings.id, uuid(c.req.param('id')))).returning();
  if (!booking) return c.json({ error: 'Réservation introuvable' }, 404);
  return c.json(booking);
});

app.put('/admin/trials/:id/attendance', requireCoach, async (c) => {
  const { status } = await c.req.json<{ status?: string }>();
  if (!status || !['registered', 'attended', 'absent', 'cancelled'].includes(status)) return c.json({ error: 'Présence invalide' }, 400);
  const [trial] = await db.update(trialRegistrations).set({ status }).where(eq(trialRegistrations.id, uuid(c.req.param('id')))).returning();
  if (!trial) return c.json({ error: 'Essai introuvable' }, 404);
  return c.json(trial);
});

app.post('/admin/plans', requireCoach, async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const priceCents = Number(body.priceCents ?? 0);
  const billingInterval = clean(body.billingInterval, 20) || 'season';
  if (!clean(body.name, 120) || !Number.isInteger(priceCents) || priceCents < 0 || !['once', 'month', 'quarter', 'year', 'season'].includes(billingInterval)) {
    return c.json({ error: 'Formule invalide' }, 400);
  }
  const features = Array.isArray(body.features) ? body.features.map((item) => clean(item, 120)).filter(Boolean).slice(0, 20) : [];
  const [plan] = await db.insert(membershipPlans).values({
    name: clean(body.name, 120),
    description: clean(body.description, 1000) || null,
    priceCents,
    currency: clean(body.currency, 3).toUpperCase() || 'EUR',
    billingInterval,
    checkoutUrl: clean(body.checkoutUrl, 500) || null,
    features: JSON.stringify(features),
  }).returning();
  return c.json({ ...plan, features }, 201);
});

app.post('/admin/memberships', requireCoach, async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const userId = clean(body.userId, 160);
  const planId = uuid(clean(body.planId, 40));
  const startDate = clean(body.startDate, 10);
  if (!userId || !DATE_RE.test(startDate)) return c.json({ error: 'Adhésion invalide' }, 400);
  const [[member], [plan]] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)),
    db.select().from(membershipPlans).where(eq(membershipPlans.id, planId)),
  ]);
  if (!member || !plan) return c.json({ error: 'Membre ou formule introuvable' }, 404);
  const [membership] = await db.insert(memberMemberships).values({
    userId,
    planId,
    status: 'active',
    startDate,
    endDate: DATE_RE.test(clean(body.endDate, 10)) ? clean(body.endDate, 10) : null,
    nextPaymentDate: DATE_RE.test(clean(body.nextPaymentDate, 10)) ? clean(body.nextPaymentDate, 10) : null,
    balanceCents: Number.isInteger(Number(body.balanceCents)) ? Number(body.balanceCents) : plan.priceCents,
    notes: clean(body.notes, 1000) || null,
  }).returning();
  void notifyUser(userId, 'Adhésion activée', `Ta formule ${plan.name} est maintenant active.`, { membershipId: membership.id }, 'membership');
  return c.json(membership, 201);
});

app.post('/admin/payments', requireCoach, async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const amountCents = Number(body.amountCents);
  const status = clean(body.status, 20) || 'paid';
  const method = clean(body.method, 20) || 'manual';
  if (!clean(body.userId, 160) || !Number.isInteger(amountCents) || amountCents < 0 || !['pending', 'paid', 'failed', 'refunded'].includes(status) || !['cash', 'card', 'transfer', 'cheque', 'online', 'manual'].includes(method)) {
    return c.json({ error: 'Paiement invalide' }, 400);
  }
  const [payment] = await db.insert(payments).values({
    userId: clean(body.userId, 160),
    membershipId: body.membershipId ? uuid(clean(body.membershipId, 40)) : null,
    amountCents,
    currency: clean(body.currency, 3).toUpperCase() || 'EUR',
    method,
    status,
    dueDate: DATE_RE.test(clean(body.dueDate, 10)) ? clean(body.dueDate, 10) : null,
    paidAt: status === 'paid' ? new Date() : null,
    reference: clean(body.reference, 120) || null,
    notes: clean(body.notes, 1000) || null,
  }).returning();
  if (payment.membershipId && status === 'paid') {
    const [membership] = await db.select().from(memberMemberships).where(eq(memberMemberships.id, payment.membershipId));
    if (membership) await db.update(memberMemberships).set({ balanceCents: Math.max(0, membership.balanceCents - amountCents) }).where(eq(memberMemberships.id, membership.id));
  }
  return c.json(payment, 201);
});

app.post('/admin/memberships/:id/remind', requireCoach, async (c) => {
  const [row] = await db.select({
    id: memberMemberships.id,
    userId: memberMemberships.userId,
    balanceCents: memberMemberships.balanceCents,
    planName: membershipPlans.name,
    checkoutUrl: membershipPlans.checkoutUrl,
    email: users.email,
  }).from(memberMemberships)
    .innerJoin(membershipPlans, eq(memberMemberships.planId, membershipPlans.id))
    .innerJoin(users, eq(memberMemberships.userId, users.id))
    .where(eq(memberMemberships.id, uuid(c.req.param('id'))));
  if (!row) return c.json({ error: 'Adhésion introuvable' }, 404);
  const amount = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(row.balanceCents / 100);
  await sendTransactionalEmail({ to: row.email, subject: `Rappel d’adhésion · ${row.planName}`, text: `Il reste ${amount} à régler pour ton adhésion ${row.planName}.`, actionUrl: row.checkoutUrl ?? undefined, actionLabel: 'Régler mon adhésion' });
  void notifyUser(row.userId, 'Rappel de paiement', `Il reste ${amount} à régler pour ${row.planName}.`, { membershipId: row.id }, 'payment');
  return c.json({ ok: true });
});

app.post('/admin/forms', requireCoach, async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const fields = Array.isArray(body.fields) ? body.fields.slice(0, 30) : [];
  if (!clean(body.title, 120)) return c.json({ error: 'Titre obligatoire' }, 400);
  const [form] = await db.insert(joinForms).values({
    title: clean(body.title, 120),
    description: clean(body.description, 1000) || null,
    fields: JSON.stringify(fields),
  }).returning();
  return c.json({ ...form, fields }, 201);
});

app.put('/admin/submissions/:id', requireCoach, async (c) => {
  const { status } = await c.req.json<{ status?: string }>();
  if (!status || !['new', 'contacted', 'approved', 'rejected'].includes(status)) return c.json({ error: 'Statut invalide' }, 400);
  const [submission] = await db.update(joinSubmissions).set({ status }).where(eq(joinSubmissions.id, uuid(c.req.param('id')))).returning();
  return submission ? c.json(submission) : c.json({ error: 'Demande introuvable' }, 404);
});

app.put('/admin/profile', requireCoach, async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const disciplines = Array.isArray(body.disciplines) ? body.disciplines.map((item) => clean(item, 60)).filter(Boolean).slice(0, 20) : [];
  const values = {
    name: clean(body.name, 120) || 'Ronin Fight Team',
    description: clean(body.description, 3000) || null,
    address: clean(body.address, 300) || null,
    latitude: Number.isFinite(Number(body.latitude)) ? Number(body.latitude) : null,
    longitude: Number.isFinite(Number(body.longitude)) ? Number(body.longitude) : null,
    phone: clean(body.phone, 30) || null,
    email: EMAIL_RE.test(clean(body.email, 160)) ? clean(body.email, 160).toLowerCase() : null,
    website: clean(body.website, 500) || null,
    disciplines: JSON.stringify(disciplines),
    scheduleSummary: clean(body.scheduleSummary, 2000) || null,
    joinButtonLabel: clean(body.joinButtonLabel, 80) || 'Rejoindre le club',
    joinFormId: body.joinFormId ? uuid(clean(body.joinFormId, 40)) : null,
    updatedAt: new Date(),
  };
  const [profile] = await db.insert(clubProfile).values({ id: 'rft', ...values }).onConflictDoUpdate({ target: clubProfile.id, set: values }).returning();
  return c.json({ ...profile, disciplines });
});

app.post('/admin/campaigns', requireCoach, async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const subject = clean(body.subject, 160);
  const campaignBody = clean(body.body, 10_000);
  const audience = clean(body.audience, 80) || 'all';
  if (!subject || !campaignBody) return c.json({ error: 'Objet et message obligatoires' }, 400);
  const [campaign] = await db.insert(emailCampaigns).values({
    senderId: c.get('user').id,
    subject,
    body: campaignBody,
    audience,
  }).returning();
  let recipientCondition = eq(users.status, 'approved');
  if (audience === 'members') recipientCondition = and(eq(users.status, 'approved'), eq(users.role, 'member'))!;
  if (audience === 'staff') recipientCondition = and(eq(users.status, 'approved'), inArray(users.role, ['coach', 'admin']))!;
  const recipients = await db.select({ email: users.email }).from(users).where(recipientCondition);
  const results = await Promise.allSettled(recipients.map((recipient) => sendTransactionalEmail({
    to: recipient.email,
    subject,
    text: campaignBody,
  })));
  const sentCount = results.filter((result) => result.status === 'fulfilled').length;
  const status = sentCount === recipients.length ? 'sent' : 'failed';
  const [updated] = await db.update(emailCampaigns).set({ status, sentCount, sentAt: new Date() }).where(eq(emailCampaigns.id, campaign.id)).returning();
  return c.json(updated, 201);
});

export { app as clubRouter };
