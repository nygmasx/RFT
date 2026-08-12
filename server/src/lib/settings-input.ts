export const PROFILE_VISIBILITIES = ['members', 'coaches', 'private'] as const;

export type ProfileVisibility = (typeof PROFILE_VISIBILITIES)[number];

export type UserSettingsUpdate = {
  notifyCoach?: boolean;
  notifyMessages?: boolean;
  notifyCompetitions?: boolean;
  notifyCarpools?: boolean;
  shareGrade?: boolean;
  sharePalmares?: boolean;
  profileVisibility?: ProfileVisibility;
};

const BOOLEAN_FIELDS = [
  'notifyCoach',
  'notifyMessages',
  'notifyCompetitions',
  'notifyCarpools',
  'shareGrade',
  'sharePalmares',
] as const;

const ALLOWED_FIELDS = new Set<string>([...BOOLEAN_FIELDS, 'profileVisibility']);

export function parseSettingsUpdate(input: unknown):
  | { ok: true; value: UserSettingsUpdate }
  | { ok: false; error: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'Paramètres invalides' };
  }

  const record = input as Record<string, unknown>;
  const forbidden = Object.keys(record).find((key) => !ALLOWED_FIELDS.has(key));
  if (forbidden) return { ok: false, error: `Champ non modifiable : ${forbidden}` };

  const value: UserSettingsUpdate = {};
  for (const field of BOOLEAN_FIELDS) {
    if (record[field] === undefined) continue;
    if (typeof record[field] !== 'boolean') {
      return { ok: false, error: `Valeur invalide : ${field}` };
    }
    value[field] = record[field];
  }

  if (record.profileVisibility !== undefined) {
    if (!PROFILE_VISIBILITIES.includes(record.profileVisibility as ProfileVisibility)) {
      return { ok: false, error: 'Visibilité du profil invalide' };
    }
    value.profileVisibility = record.profileVisibility as ProfileVisibility;
  }

  if (Object.keys(value).length === 0) {
    return { ok: false, error: 'Aucun paramètre à modifier' };
  }

  return { ok: true, value };
}
