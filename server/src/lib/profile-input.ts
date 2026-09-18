export type ProfileUpdate = Partial<{
  firstName: string;
  lastName: string;
  category: string;
  weightClass: string;
  stance: string;
  phone: string;
}>;

type ParseResult =
  | { ok: true; value: ProfileUpdate }
  | { ok: false; error: string };

const TEXT_LIMITS: Record<keyof ProfileUpdate, number> = {
  firstName: 80,
  lastName: 80,
  category: 40,
  weightClass: 40,
  stance: 40,
  phone: 30,
};

const ALLOWED_KEYS = new Set<keyof ProfileUpdate>([
  ...Object.keys(TEXT_LIMITS) as (keyof ProfileUpdate)[],
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

  for (const [key, limit] of Object.entries(TEXT_LIMITS) as [keyof ProfileUpdate, number][]) {
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

  if (Object.keys(value).length === 0) return { ok: false, error: 'Aucune modification fournie' };
  return { ok: true, value };
}

export const MEMBER_ROLES = ['member', 'coach', 'admin'] as const;
export type MemberRole = typeof MEMBER_ROLES[number];

type RoleParseResult =
  | { ok: true; value: MemberRole }
  | { ok: false; error: string };

// Body validation for a staff role assignment. A coach cannot change their own
// role: nobody should be able to promote themselves, and a lone admin should not
// be able to demote themselves by accident. The checks that depend on the target
// row live in checkRoleTransition below.
export function parseRoleUpdate(input: unknown, actorId: string, targetId: string): RoleParseResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'Corps de requête invalide' };
  }
  const { role } = input as Record<string, unknown>;
  if (typeof role !== 'string' || !MEMBER_ROLES.includes(role as MemberRole)) {
    return { ok: false, error: 'Rôle invalide' };
  }
  if (actorId === targetId) {
    return { ok: false, error: 'Impossible de modifier son propre rôle' };
  }
  return { ok: true, value: role as MemberRole };
}

type RoleTransitionCheck =
  | { ok: true }
  | { ok: false; error: string };

// Policy that needs the target's current row. Kept pure so it can be tested
// without a database; the route supplies the row and the admin head count.
export function checkRoleTransition(input: {
  nextRole: MemberRole;
  targetRole: MemberRole;
  targetStatus: string;
  adminCount: number;
}): RoleTransitionCheck {
  const { nextRole, targetRole, targetStatus, adminCount } = input;
  if (nextRole === targetRole) return { ok: true };

  // canAccessMemberFeatures short-circuits on isStaff, so a staff role bypasses
  // the approval gate entirely: granting one to someone who was never approved
  // would hand them full member access without any review.
  if (nextRole !== 'member' && targetStatus !== 'approved') {
    return { ok: false, error: 'Valide d’abord l’inscription de ce membre' };
  }

  // Demoting the only admin would leave the club with nobody able to administer it.
  if (targetRole === 'admin' && adminCount <= 1) {
    return { ok: false, error: 'Le club doit garder au moins un admin' };
  }

  return { ok: true };
}
