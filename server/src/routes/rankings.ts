import { and, desc, eq, isNull, or } from 'drizzle-orm';
import { Hono } from 'hono';

import type { AuthUser } from '../auth';
import { db } from '../db/client';
import { beltRecords, competitions, palmares, users, userSettings } from '../db/schema';
import { requireApproved } from '../middleware/session';
import {
  BELT_MULTIPLIERS,
  IMPORTANCE_MULTIPLIERS,
  STAGE_POINTS,
  type BeltColor,
  type CompetitionImportance,
  type ResultStage,
  resultScore,
} from '../lib/ranking';
import { getOfficialRankings } from '../lib/official-rankings';

const app = new Hono<{ Variables: { user: AuthUser } }>();

type RankingRow = {
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  belt: BeltColor | null;
  points: number;
  p4pPoints: number;
  resultCount: number;
  wins: number;
};

app.get('/official', requireApproved, async (c) => c.json(await getOfficialRankings(c.req.query('refresh') === '1')));

app.get('/', requireApproved, async (c) => {
  const [results, belts] = await Promise.all([
    db.select({
      userId: palmares.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      avatarUrl: users.avatarUrl,
      resultStage: palmares.resultStage,
      resultBelt: palmares.beltColor,
      weightClass: palmares.weightClass,
      importance: competitions.importance,
    })
      .from(palmares)
      .innerJoin(users, eq(palmares.userId, users.id))
      .leftJoin(competitions, eq(palmares.competitionId, competitions.id))
      .leftJoin(userSettings, eq(users.id, userSettings.userId))
      .where(and(
        eq(palmares.validationStatus, 'approved'),
        eq(users.status, 'approved'),
        or(isNull(userSettings.sharePalmares), eq(userSettings.sharePalmares, true)),
      )),
    db.select({ userId: beltRecords.userId, color: beltRecords.color })
      .from(beltRecords)
      .orderBy(desc(beltRecords.createdAt)),
  ]);

  const currentBelts = new Map<string, BeltColor>();
  for (const belt of belts) {
    if (!currentBelts.has(belt.userId)) currentBelts.set(belt.userId, belt.color as BeltColor);
  }

  const totals = new Map<string, RankingRow>();
  for (const result of results) {
    const belt = (result.resultBelt as BeltColor | null) ?? currentBelts.get(result.userId) ?? null;
    const stage = result.resultStage as ResultStage;
    const importance = (result.importance ?? 'regional') as CompetitionImportance;
    const existing = totals.get(result.userId) ?? {
      userId: result.userId,
      firstName: result.firstName,
      lastName: result.lastName,
      avatarUrl: result.avatarUrl,
      belt: currentBelts.get(result.userId) ?? belt,
      points: 0,
      p4pPoints: 0,
      resultCount: 0,
      wins: 0,
    };
    existing.points += resultScore({ stage, importance, belt, weightClass: result.weightClass, p4p: false });
    existing.p4pPoints += resultScore({ stage, importance, belt, weightClass: result.weightClass, p4p: true });
    existing.resultCount += 1;
    if (stage === 'champion') existing.wins += 1;
    totals.set(result.userId, existing);
  }

  const all = [...totals.values()];
  const p4p = all
    .sort((a, b) => b.p4pPoints - a.p4pPoints || b.wins - a.wins || a.lastName.localeCompare(b.lastName, 'fr'))
    .map((row, index) => ({ ...row, rank: index + 1 }));

  const byBelt = Object.keys(BELT_MULTIPLIERS).reduce<Record<string, Array<RankingRow & { rank: number }>>>((groups, belt) => {
    groups[belt] = all
      .filter((row) => row.belt === belt)
      .sort((a, b) => b.points - a.points || b.wins - a.wins || a.lastName.localeCompare(b.lastName, 'fr'))
      .map((row, index) => ({ ...row, rank: index + 1 }));
    return groups;
  }, {});

  return c.json({
    p4p,
    byBelt,
    rules: {
      stagePoints: STAGE_POINTS,
      importanceMultipliers: IMPORTANCE_MULTIPLIERS,
      beltMultipliers: BELT_MULTIPLIERS,
      absoluteBonus: 1.15,
    },
  });
});

export { app as rankingsRouter };
