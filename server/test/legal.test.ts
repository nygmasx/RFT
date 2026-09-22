import assert from 'node:assert/strict';
import { test } from 'node:test';
import { legalRouter } from '../src/routes/legal';
import { SUPPORT_EMAIL } from '../src/lib/legal-content';

// App Store Connect refuses a submission whose privacy, terms or support URL
// does not answer, so these three pages must stay reachable and self-contained.
test('the three public legal pages answer 200 with HTML', async () => {
  for (const path of ['/privacy', '/terms', '/support']) {
    const res = await legalRouter.request(path);
    assert.equal(res.status, 200, `${path} should answer 200`);
    assert.match(res.headers.get('content-type') ?? '', /text\/html/);
    const body = await res.text();
    assert.match(body, /<html lang="fr">/);
    assert.ok(body.length > 800, `${path} should not be an empty shell`);
  }
});

test('the privacy page names the subprocessors and links the support address', async () => {
  const body = await (await legalRouter.request('/privacy')).text();
  for (const processor of ['Neon', 'Fly.io', 'Resend', 'Expo']) {
    assert.ok(body.includes(processor), `privacy should name ${processor}`);
  }
  assert.ok(body.includes(`mailto:${SUPPORT_EMAIL}`), 'the contact address should be clickable');
});

test('each page links to the other two', async () => {
  const body = await (await legalRouter.request('/support')).text();
  assert.ok(body.includes('href="/privacy"'));
  assert.ok(body.includes('href="/terms"'));
});

test('an unknown legal path is not served', async () => {
  assert.equal((await legalRouter.request('/cgu')).status, 404);
});
