import assert from 'node:assert/strict';
import test from 'node:test';

import { canAccessMemberFeatures, isStaff } from '../src/lib/access';
import { checkRoleTransition, parseProfileUpdate, parseRoleUpdate } from '../src/lib/profile-input';
import { parseSettingsUpdate } from '../src/lib/settings-input';

test('staff roles are recognized explicitly', () => {
  assert.equal(isStaff({ role: 'coach' }), true);
  assert.equal(isStaff({ role: 'admin' }), true);
  assert.equal(isStaff({ role: 'member' }), false);
});

test('only approved members or staff can access member features', () => {
  assert.equal(canAccessMemberFeatures({ role: 'member', status: 'approved' }), true);
  assert.equal(canAccessMemberFeatures({ role: 'member', status: 'pending' }), false);
  assert.equal(canAccessMemberFeatures({ role: 'coach', status: 'pending' }), true);
});

test('profile updates only contain explicitly editable fields', () => {
  const result = parseProfileUpdate({ firstName: '  Driss  ', phone: '  0600000000 ' });
  assert.deepEqual(result, {
    ok: true,
    value: { firstName: 'Driss', phone: '0600000000' },
  });
});

test('profile updates reject privilege escalation fields', () => {
  const result = parseProfileUpdate({ role: 'admin' });
  assert.deepEqual(result, { ok: false, error: 'Champ non modifiable : role' });
});

test('profile updates reject avatar data outside the media endpoint', () => {
  assert.equal(parseProfileUpdate({ avatarUrl: 'https://example.com/avatar.jpg' }).ok, false);
  assert.equal(parseProfileUpdate({ avatarUrl: `data:image/jpeg;base64,${'a'.repeat(2_800_001)}` }).ok, false);
});

test('settings updates accept only typed user preferences', () => {
  assert.deepEqual(parseSettingsUpdate({ notifyCoach: false, profileVisibility: 'coaches' }), {
    ok: true,
    value: { notifyCoach: false, profileVisibility: 'coaches' },
  });
});

test('settings updates reject unknown fields and invalid visibility', () => {
  assert.deepEqual(parseSettingsUpdate({ role: 'admin' }), {
    ok: false,
    error: 'Champ non modifiable : role',
  });
  assert.deepEqual(parseSettingsUpdate({ profileVisibility: 'everyone' }), {
    ok: false,
    error: 'Visibilité du profil invalide',
  });
});

test('role updates accept only known member roles', () => {
  assert.deepEqual(parseRoleUpdate({ role: 'coach' }, 'coach-1', 'member-1'), { ok: true, value: 'coach' });
  assert.deepEqual(parseRoleUpdate({ role: 'owner' }, 'coach-1', 'member-1'), { ok: false, error: 'Rôle invalide' });
  assert.deepEqual(parseRoleUpdate({}, 'coach-1', 'member-1'), { ok: false, error: 'Rôle invalide' });
});

test('role updates refuse self-assignment in either direction', () => {
  assert.deepEqual(parseRoleUpdate({ role: 'member' }, 'coach-1', 'coach-1'), {
    ok: false,
    error: 'Impossible de modifier son propre rôle',
  });
  assert.deepEqual(parseRoleUpdate({ role: 'admin' }, 'coach-1', 'coach-1'), {
    ok: false,
    error: 'Impossible de modifier son propre rôle',
  });
});

test('staff roles cannot be granted before the registration is approved', () => {
  const pending = { targetRole: 'member', targetStatus: 'pending', adminCount: 2 } as const;
  assert.deepEqual(checkRoleTransition({ ...pending, nextRole: 'coach' }), {
    ok: false,
    error: 'Valide d’abord l’inscription de ce membre',
  });
  assert.deepEqual(checkRoleTransition({ ...pending, nextRole: 'admin' }), {
    ok: false,
    error: 'Valide d’abord l’inscription de ce membre',
  });
  assert.deepEqual(
    checkRoleTransition({ ...pending, targetStatus: 'rejected', nextRole: 'coach' }),
    { ok: false, error: 'Valide d’abord l’inscription de ce membre' },
  );
  assert.deepEqual(
    checkRoleTransition({ ...pending, targetStatus: 'approved', nextRole: 'coach' }),
    { ok: true },
  );
});

test('demoting a staff member back to member never needs an approved status', () => {
  assert.deepEqual(
    checkRoleTransition({ nextRole: 'member', targetRole: 'coach', targetStatus: 'pending', adminCount: 2 }),
    { ok: true },
  );
});

test('the last admin cannot be demoted, so the club keeps an administrator', () => {
  assert.deepEqual(
    checkRoleTransition({ nextRole: 'coach', targetRole: 'admin', targetStatus: 'approved', adminCount: 1 }),
    { ok: false, error: 'Le club doit garder au moins un admin' },
  );
  assert.deepEqual(
    checkRoleTransition({ nextRole: 'member', targetRole: 'admin', targetStatus: 'approved', adminCount: 1 }),
    { ok: false, error: 'Le club doit garder au moins un admin' },
  );
  assert.deepEqual(
    checkRoleTransition({ nextRole: 'coach', targetRole: 'admin', targetStatus: 'approved', adminCount: 2 }),
    { ok: true },
  );
});

test('re-assigning the role someone already has is a no-op, not a lockout', () => {
  assert.deepEqual(
    checkRoleTransition({ nextRole: 'admin', targetRole: 'admin', targetStatus: 'approved', adminCount: 1 }),
    { ok: true },
  );
});
