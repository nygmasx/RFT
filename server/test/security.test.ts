import assert from 'node:assert/strict';
import test from 'node:test';

import { canAccessMemberFeatures, isStaff } from '../src/lib/access';
import { parseProfileUpdate } from '../src/lib/profile-input';
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

test('profile updates reject invalid or oversized avatars', () => {
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
