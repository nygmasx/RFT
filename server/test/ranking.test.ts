import assert from 'node:assert/strict';
import test from 'node:test';

import { resultScore } from '../src/lib/ranking';

test('ranking score combines stage and competition importance', () => {
  assert.equal(resultScore({
    stage: 'champion',
    importance: 'national',
    belt: 'blanche',
    weightClass: '-77 kg',
    p4p: false,
  }), 175);
});

test('belt multiplier only applies to pound-for-pound', () => {
  const input = {
    stage: 'quarterfinal' as const,
    importance: 'international' as const,
    belt: 'noire' as const,
    weightClass: '-88 kg',
  };
  assert.equal(resultScore({ ...input, p4p: false }), 63);
  assert.equal(resultScore({ ...input, p4p: true }), 100);
});

test('absolute divisions receive the documented bonus', () => {
  assert.equal(resultScore({
    stage: 'round_of_16',
    importance: 'local',
    belt: null,
    weightClass: 'Absolute',
    p4p: false,
  }), 14);
});
