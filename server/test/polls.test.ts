import assert from 'node:assert/strict';
import { test } from 'node:test';

import { validatePollInput } from '../src/lib/polls';

test('poll validation normalizes a valid payload', () => {
  assert.deepEqual(validatePollInput({
    question: '  Quel créneau ? ',
    options: [' 18 h ', '20 h'],
    allows_multiple: true,
  }), {
    ok: true,
    value: { question: 'Quel créneau ?', options: ['18 h', '20 h'], allowsMultiple: true },
  });
});

test('poll validation rejects missing, duplicate and oversized choices', () => {
  assert.equal(validatePollInput({ question: 'Choix ?', options: ['Oui'] }).ok, false);
  assert.equal(validatePollInput({ question: 'Choix ?', options: ['Oui', ' oui '] }).ok, false);
  assert.equal(validatePollInput({ question: 'Choix ?', options: Array.from({ length: 11 }, (_, index) => `${index}`) }).ok, false);
  assert.equal(validatePollInput({ question: 'Choix ?', options: ['Oui', 'x'.repeat(121)] }).ok, false);
});
