export type ProfileUpdate = Partial<{
  firstName: string;
  lastName: string;
  category: string;
  weightClass: string;
  stance: string;
  phone: string;
  avatarUrl: string;
}>;

type ParseResult =
  | { ok: true; value: ProfileUpdate }
  | { ok: false; error: string };

const TEXT_LIMITS: Record<Exclude<keyof ProfileUpdate, 'avatarUrl'>, number> = {
  firstName: 80,
  lastName: 80,
  category: 40,
  weightClass: 40,
  stance: 40,
  phone: 30,
};

const ALLOWED_KEYS = new Set<keyof ProfileUpdate>([
  ...Object.keys(TEXT_LIMITS) as Exclude<keyof ProfileUpdate, 'avatarUrl'>[],
  'avatarUrl',
]);

export function parseProfileUpdate(input: unknown): ParseResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'Corps de requête invalide' };
  }

  const body = input as Record<string, unknown>;
  const unexpected = Object.keys(body).find((key) => !ALLOWED_KEYS.has(key as keyof ProfileUpdate));
  if (unexpected) {
    return { ok: false, error: `Champ non modifiable : ${unexpected}` };
  }

  const value: ProfileUpdate = {};

  for (const [key, limit] of Object.entries(TEXT_LIMITS) as [Exclude<keyof ProfileUpdate, 'avatarUrl'>, number][]) {
    const field = body[key];
    if (field === undefined) continue;
    if (typeof field !== 'string') return { ok: false, error: `Champ invalide : ${key}` };

    const normalized = field.trim();
    if ((key === 'firstName' || key === 'lastName') && !normalized) {
      return { ok: false, error: `${key === 'firstName' ? 'Prénom' : 'Nom'} requis` };
    }
    if (normalized.length > limit) return { ok: false, error: `Champ trop long : ${key}` };
    value[key] = normalized;
  }

  if (body.avatarUrl !== undefined) {
    if (typeof body.avatarUrl !== 'string') return { ok: false, error: 'Avatar invalide' };
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(body.avatarUrl)) {
      return { ok: false, error: 'Format d’avatar invalide' };
    }
    if (body.avatarUrl.length > 2_800_000) return { ok: false, error: 'Avatar trop volumineux' };
    value.avatarUrl = body.avatarUrl;
  }

  if (Object.keys(value).length === 0) return { ok: false, error: 'Aucune modification fournie' };
  return { ok: true, value };
}
