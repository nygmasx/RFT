import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { calculateDrivingRoute, searchFrenchAddresses, validCoordinates } from '../src/lib/geolocation';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

test('coordinate validation rejects malformed points', () => {
  assert.equal(validCoordinates(49.25, 2.46), true);
  assert.equal(validCoordinates(120, 2.46), false);
  assert.equal(validCoordinates(49.25, Number.NaN), false);
});

test('French address results are normalized for the mobile client', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({
    features: [{
      geometry: { coordinates: [2.4371, 49.2559] },
      properties: { label: '12 Rue de la République 60160 Montataire', postcode: '60160', city: 'Montataire' },
    }],
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  const results = await searchFrenchAddresses('12 rue test unique montataire', 5);
  assert.deepEqual(results, [{
    label: '12 Rue de la République 60160 Montataire',
    latitude: 49.2559,
    longitude: 2.4371,
    postcode: '60160',
    city: 'Montataire',
  }]);
});

test('IGN route geometry is converted to map coordinates', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({
    distance: 18.4,
    duration: 24.6,
    bbox: [2.4, 49.1, 2.6, 49.3],
    geometry: { coordinates: [[2.4, 49.1], [2.5, 49.2], [2.6, 49.3]] },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  const route = await calculateDrivingRoute(
    { latitude: 49.10111, longitude: 2.40111 },
    { latitude: 49.30111, longitude: 2.60111 },
  );
  assert.equal(route.distanceKm, 18.4);
  assert.equal(route.durationMinutes, 24.6);
  assert.deepEqual(route.coordinates[1], { latitude: 49.2, longitude: 2.5 });
});
