export const RESULT_STAGES = [
  'champion',
  'finalist',
  'semifinal',
  'quarterfinal',
  'round_of_16',
  'round_of_32',
  'participant',
] as const;

export type ResultStage = typeof RESULT_STAGES[number];
export type CompetitionImportance = 'local' | 'regional' | 'national' | 'international' | 'major';
export type BeltColor = 'blanche' | 'bleue' | 'violette' | 'marron' | 'noire';

export const STAGE_POINTS: Record<ResultStage, number> = {
  champion: 100,
  finalist: 70,
  semifinal: 45,
  quarterfinal: 25,
  round_of_16: 12,
  round_of_32: 6,
  participant: 2,
};

export const IMPORTANCE_MULTIPLIERS: Record<CompetitionImportance, number> = {
  local: 1,
  regional: 1.25,
  national: 1.75,
  international: 2.5,
  major: 3.25,
};

export const BELT_MULTIPLIERS: Record<BeltColor, number> = {
  blanche: 1,
  bleue: 1.15,
  violette: 1.3,
  marron: 1.45,
  noire: 1.6,
};

export const STAGE_PLACES: Record<ResultStage, number> = {
  champion: 1,
  finalist: 2,
  semifinal: 3,
  quarterfinal: 4,
  round_of_16: 8,
  round_of_32: 16,
  participant: 99,
};

export function isResultStage(value: unknown): value is ResultStage {
  return typeof value === 'string' && RESULT_STAGES.includes(value as ResultStage);
}

export function isCompetitionImportance(value: unknown): value is CompetitionImportance {
  return typeof value === 'string' && value in IMPORTANCE_MULTIPLIERS;
}

export function resultScore({
  stage,
  importance,
  belt,
  weightClass,
  p4p,
}: {
  stage: ResultStage;
  importance: CompetitionImportance;
  belt: BeltColor | null;
  weightClass: string | null;
  p4p: boolean;
}) {
  const absoluteBonus = /abs|open/i.test(weightClass ?? '') ? 1.15 : 1;
  const beltMultiplier = p4p && belt ? BELT_MULTIPLIERS[belt] : 1;
  return Math.round(STAGE_POINTS[stage] * IMPORTANCE_MULTIPLIERS[importance] * beltMultiplier * absoluteBonus);
}
