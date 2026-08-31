import assert from 'node:assert/strict';
import test from 'node:test';

import { app } from '../src/app';

test('health endpoint exposes security and request tracing headers', async () => {
  const response = await app.request('/health');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(response.headers.get('x-request-id'));
});

test('CORS allows the configured local app and rejects unknown origins', async () => {
  const allowed = await app.request('/health', { headers: { Origin: 'http://localhost:8081' } });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:8081');
  const blocked = await app.request('/health', { headers: { Origin: 'https://malicious.example' } });
  assert.equal(blocked.headers.get('access-control-allow-origin'), null);
});

test('unknown routes return a JSON 404', async () => {
  const response = await app.request('/does-not-exist');
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'Route introuvable' });
});

test('support page is publicly available', async () => {
  const response = await app.request('/support');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /text\/html/);
  assert.match(await response.text(), /contact@roninbjj\.fr/);
});

test('privacy policy is publicly available', async () => {
  const response = await app.request('/privacy');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /text\/html/);
  const html = await response.text();
  assert.match(html, /Politique de confidentialité/);
  assert.match(html, /contact@roninbjj\.fr/);
});
