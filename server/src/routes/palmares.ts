import { Hono } from 'hono';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../db/client';
import { palmares, users, userSettings } from '../db/schema';
import { requireApproved, requireCoach } from '../middleware/session';
import type { AuthUser } from '../auth';
import { isStaff } from '../lib/access';
import { ensureStoredCompetition } from '../lib/competition-record';
import { notifyUser } from './push';

const app = new Hono<{ Variables: { user: AuthUser } }>();

type ResultInput = {
  competition_name?: string;
  comp_date?: string;
  weight_class?: string | null;
  comp_type?: 'GI' | 'NO-GI' | null;
  place?: number;
  notes?: string | null;
};

function parseResult(body: ResultInput, fixed?: { name: string; date: string; type: string | null }) {
  const competitionName = (fixed?.name ?? body.competition_name)?.trim();
  const compDate = fixed?.date ?? body.comp_date;
  const place = Number(body.place);
  const compType = body.comp_type ?? (fixed?.type === 'GI' || fixed?.type === 'NO-GI' ? fixed.type : null);
  if (!competitionName || competitionName.length > 200) return { error: 'Nom de compétition invalide' } as const;
  if (!compDate || !/^\d{4}-\d{2}-\d{2}$/.test(compDate)) return { error: 'Date invalide' } as const;
  if (!Number.isInteger(place) || place < 1 || place > 99) return { error: 'Classement invalide' } as const;
  if (compType !== null && compType !== 'GI' && compType !== 'NO-GI') return { error: 'Type invalide' } as const;
  const weightClass = body.weight_class?.trim() || null;
  const notes = body.notes?.trim() || null;
  if (weightClass && weightClass.length > 40) return { error: 'Catégorie de poids trop longue' } as const;
  if (notes && notes.length > 4_000) return { error: 'Notes trop longues' } as const;
  return { value: { competitionName, compDate, weightClass, compType, place, notes } } as const;
}

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
  const parsed = parseResult(await c.req.json<ResultInput>());
  if ('error' in parsed) return c.json({ error: parsed.error }, 400);

  const [row] = await db.insert(palmares).values({
    userId:          user.id,
    ...parsed.value,
  }).returning();

  return c.json(row, 201);
});

// PUT /api/palmares/admin/competition/:competitionId/user/:userId
app.put('/admin/competition/:competitionId/user/:userId', requireCoach, async (c) => {
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

  const [result] = existing
    ? await db.update(palmares).set({ competitionId, ...parsed.value })
      .where(eq(palmares.id, existing.id)).returning()
    : await db.insert(palmares).values({ userId, competitionId, ...parsed.value }).returning();

  void notifyUser(
    userId,
    '🥇 Résultat enregistré',
    `${competition.name} · ${result.place}${result.place === 1 ? 'er' : 'e'} place`,
    { competitionId },
    'competition',
  );

  return c.json(result, existing ? 200 : 201);
});

// DELETE /api/palmares/admin/competition/:competitionId/user/:userId
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
