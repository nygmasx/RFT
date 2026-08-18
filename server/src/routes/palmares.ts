import { Hono } from 'hono';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../db/client';
import { beltRecords, palmares, users, userSettings } from '../db/schema';
import { requireApproved, requireCoach } from '../middleware/session';
import type { AuthUser } from '../auth';
import { isStaff } from '../lib/access';
import { ensureStoredCompetition } from '../lib/competition-record';
import { isResultStage, STAGE_PLACES, type ResultStage } from '../lib/ranking';
import { notifyCoaches, notifyUser } from './push';

const app = new Hono<{ Variables: { user: AuthUser } }>();

type ResultInput = {
  competition_id?: string;
  competition_name?: string;
  comp_date?: string;
  weight_class?: string | null;
  comp_type?: 'GI' | 'NO-GI' | null;
  result_stage?: ResultStage;
  place?: number;
  notes?: string | null;
};

function stageFromLegacyPlace(place: number): ResultStage {
  if (place === 1) return 'champion';
  if (place === 2) return 'finalist';
  if (place === 3) return 'semifinal';
  if (place <= 4) return 'quarterfinal';
  if (place <= 8) return 'round_of_16';
  if (place <= 16) return 'round_of_32';
  return 'participant';
}

function parisToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function parseResult(body: ResultInput, fixed?: { name: string; date: string; type: string | null }) {
  const competitionName = (fixed?.name ?? body.competition_name)?.trim();
  const compDate = fixed?.date ?? body.comp_date;
  const legacyPlace = Number(body.place);
  const resultStage = isResultStage(body.result_stage)
    ? body.result_stage
    : Number.isInteger(legacyPlace) ? stageFromLegacyPlace(legacyPlace) : null;
  const compType = body.comp_type ?? (fixed?.type === 'GI' || fixed?.type === 'NO-GI' ? fixed.type : null);
  if (!competitionName || competitionName.length > 200) return { error: 'Nom de compétition invalide' } as const;
  if (!compDate || !/^\d{4}-\d{2}-\d{2}$/.test(compDate)) return { error: 'Date invalide' } as const;
  if (!resultStage) return { error: 'Résultat invalide' } as const;
  if (compType !== null && compType !== 'GI' && compType !== 'NO-GI') return { error: 'Type invalide' } as const;
  const weightClass = body.weight_class?.trim() || null;
  const notes = body.notes?.trim() || null;
  if (weightClass && weightClass.length > 40) return { error: 'Catégorie de poids trop longue' } as const;
  if (notes && notes.length > 4_000) return { error: 'Notes trop longues' } as const;
  return {
    value: {
      competitionName,
      compDate,
      weightClass,
      compType,
      resultStage,
      place: STAGE_PLACES[resultStage],
      notes,
    },
  } as const;
}

async function currentBelt(userId: string) {
  const [belt] = await db.select({ color: beltRecords.color })
    .from(beltRecords)
    .where(eq(beltRecords.userId, userId))
    .orderBy(desc(beltRecords.createdAt))
    .limit(1);
  return belt?.color ?? null;
}

app.get('/admin/pending', requireCoach, async (c) => {
  const rows = await db.select({
    id: palmares.id,
    userId: palmares.userId,
    competitionId: palmares.competitionId,
    competitionName: palmares.competitionName,
    compDate: palmares.compDate,
    weightClass: palmares.weightClass,
    compType: palmares.compType,
    place: palmares.place,
    resultStage: palmares.resultStage,
    validationStatus: palmares.validationStatus,
    submissionSource: palmares.submissionSource,
    notes: palmares.notes,
    submittedAt: palmares.submittedAt,
    firstName: users.firstName,
    lastName: users.lastName,
    avatarUrl: users.avatarUrl,
  })
    .from(palmares)
    .innerJoin(users, eq(palmares.userId, users.id))
    .where(eq(palmares.validationStatus, 'pending'))
    .orderBy(desc(palmares.submittedAt));
  return c.json(rows);
});

app.get('/:userId', requireApproved, async (c) => {
  const requester = c.get('user');
  const targetId = c.req.param('userId');
  const canReview = isStaff(requester);
  if (requester.id !== targetId && !canReview) {
    const [settings] = await db.select({ sharePalmares: userSettings.sharePalmares })
      .from(userSettings).where(eq(userSettings.userId, targetId));
    if (settings?.sharePalmares === false) return c.json({ error: 'Palmarès privé' }, 403);
  }
  const visibility = requester.id === targetId || canReview
    ? eq(palmares.userId, targetId)
    : and(eq(palmares.userId, targetId), eq(palmares.validationStatus, 'approved'));
  const rows = await db.select().from(palmares).where(visibility).orderBy(desc(palmares.compDate));
  return c.json(rows);
});

// Athlete submission. It remains private until a coach approves it.
app.post('/', requireApproved, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<ResultInput>();
  const competitionId = body.competition_id as `${string}-${string}-${string}-${string}-${string}` | undefined;
  const competition = competitionId ? await ensureStoredCompetition(competitionId) : null;
  if (competitionId && !competition) return c.json({ error: 'Compétition introuvable' }, 404);
  const today = parisToday();
  if (competition && competition.compDate >= today) {
    return c.json({ error: 'Le résultat pourra être saisi le lendemain de la compétition' }, 400);
  }

  const parsed = parseResult(body, competition ? {
    name: competition.name,
    date: competition.compDate,
    type: competition.compType,
  } : undefined);
  if ('error' in parsed) return c.json({ error: parsed.error }, 400);
  if (parsed.value.compDate >= today) {
    return c.json({ error: 'Le résultat pourra être saisi le lendemain de la compétition' }, 400);
  }

  const beltColor = await currentBelt(user.id);
  const [existing] = competitionId
    ? await db.select().from(palmares).where(and(
      eq(palmares.userId, user.id),
      eq(palmares.competitionId, competitionId),
    )).limit(1)
    : [];
  const moderation = {
    validationStatus: 'pending',
    submissionSource: 'athlete',
    beltColor,
    submittedAt: new Date(),
    reviewedBy: null,
    reviewedAt: null,
  };
  const [row] = existing
    ? await db.update(palmares).set({ ...parsed.value, ...moderation }).where(eq(palmares.id, existing.id)).returning()
    : await db.insert(palmares).values({
      userId: user.id,
      competitionId: competitionId ?? null,
      ...parsed.value,
      ...moderation,
    }).returning();

  const athleteName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;
  void notifyCoaches(
    '🥋 Résultat à valider',
    `${athleteName} a soumis son résultat à ${parsed.value.competitionName}.`,
    { resultId: row.id, competitionId: competitionId ?? '', screen: 'admin_results' },
    'result_submission',
  );
  return c.json(row, existing ? 200 : 201);
});

// Coach entry/edit: the result is approved immediately.
app.put('/admin/competition/:competitionId/user/:userId', requireCoach, async (c) => {
  const reviewer = c.get('user');
  const competitionId = c.req.param('competitionId') as `${string}-${string}-${string}-${string}-${string}`;
  const userId = c.req.param('userId');
  const competition = await ensureStoredCompetition(competitionId);
  if (!competition) return c.json({ error: 'Compétition introuvable' }, 404);
  const [member] = await db.select({ id: users.id }).from(users)
    .where(and(eq(users.id, userId), eq(users.status, 'approved'), eq(users.role, 'member')));
  if (!member) return c.json({ error: 'Élève introuvable ou non approuvé' }, 404);

  const parsed = parseResult(await c.req.json<ResultInput>(), {
    name: competition.name,
    date: competition.compDate,
    type: competition.compType,
  });
  if ('error' in parsed) return c.json({ error: parsed.error }, 400);

  const [linkedResult] = await db.select().from(palmares).where(and(
    eq(palmares.userId, userId),
    eq(palmares.competitionId, competitionId),
  ));
  const [legacyResult] = linkedResult ? [] : await db.select().from(palmares).where(and(
    eq(palmares.userId, userId),
    isNull(palmares.competitionId),
    eq(palmares.competitionName, competition.name),
    eq(palmares.compDate, competition.compDate),
  )).orderBy(desc(palmares.createdAt)).limit(1);
  const existing = linkedResult ?? legacyResult;
  const beltColor = existing?.beltColor ?? await currentBelt(userId);
  const approved = {
    validationStatus: 'approved',
    submissionSource: existing?.submissionSource ?? 'coach',
    beltColor,
    reviewedBy: reviewer.id,
    reviewedAt: new Date(),
  };

  const [result] = existing
    ? await db.update(palmares).set({ competitionId, ...parsed.value, ...approved })
      .where(eq(palmares.id, existing.id)).returning()
    : await db.insert(palmares).values({ userId, competitionId, ...parsed.value, ...approved }).returning();

  void notifyUser(
    userId,
    '✅ Résultat validé',
    `${competition.name} · ton résultat est maintenant public et comptabilisé.`,
    { competitionId },
    'result_approved',
  );
  return c.json(result, existing ? 200 : 201);
});

app.put('/admin/:resultId/review', requireCoach, async (c) => {
  const reviewer = c.get('user');
  const resultId = c.req.param('resultId') as `${string}-${string}-${string}-${string}-${string}`;
  const { status } = await c.req.json<{ status?: 'approved' | 'rejected' }>();
  if (status !== 'approved' && status !== 'rejected') return c.json({ error: 'Décision invalide' }, 400);
  const [existing] = await db.select().from(palmares).where(eq(palmares.id, resultId));
  if (!existing) return c.json({ error: 'Résultat introuvable' }, 404);
  const beltColor = existing.beltColor ?? await currentBelt(existing.userId);
  const [result] = await db.update(palmares).set({
    validationStatus: status,
    reviewedBy: reviewer.id,
    reviewedAt: new Date(),
    beltColor,
  }).where(eq(palmares.id, resultId)).returning();
  void notifyUser(
    existing.userId,
    status === 'approved' ? '✅ Résultat validé' : '↩️ Résultat à corriger',
    status === 'approved'
      ? `${existing.competitionName} est maintenant public et comptabilisé dans les classements.`
      : `${existing.competitionName} n’a pas été validé. Vérifie les informations puis soumets-le à nouveau.`,
    existing.competitionId ? { competitionId: existing.competitionId } : undefined,
    status === 'approved' ? 'result_approved' : 'result_rejected',
  );
  return c.json(result);
});

app.delete('/admin/competition/:competitionId/user/:userId', requireCoach, async (c) => {
  const competitionId = c.req.param('competitionId') as `${string}-${string}-${string}-${string}-${string}`;
  const userId = c.req.param('userId');
  const [removed] = await db.delete(palmares).where(and(
    eq(palmares.competitionId, competitionId),
    eq(palmares.userId, userId),
  )).returning({ id: palmares.id });
  if (!removed) return c.json({ error: 'Résultat introuvable' }, 404);
  return c.json({ ok: true });
});

export { app as palmaresRouter };
