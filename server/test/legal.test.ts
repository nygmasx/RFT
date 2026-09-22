import assert from 'node:assert/strict';
import { test } from 'node:test';
import { legalRouter } from '../src/routes/legal';
import { DOCUMENTS, SUPPORT_EMAIL } from '../src/lib/legal-content';

// App Store Connect refuses a submission whose privacy, terms or support URL
// does not answer, and Google Play's Data safety form needs the account
// deletion URL, so every one of these pages must stay reachable.
test('every public legal page answers 200 with HTML', async () => {
  const slugs = Object.keys(DOCUMENTS);
  assert.deepEqual(slugs.sort(), ['account-deletion', 'privacy', 'support', 'terms']);
  for (const path of slugs.map((slug) => `/${slug}`)) {
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

test('each page links to the others', async () => {
  const body = await (await legalRouter.request('/support')).text();
  assert.ok(body.includes('href="/privacy"'));
  assert.ok(body.includes('href="/terms"'));
  assert.ok(body.includes('href="/account-deletion"'));
});

// Google requires a route a user can reach without the app installed.
test('the account deletion page states the in-app path, the email fallback and the delay', async () => {
  const body = await (await legalRouter.request('/account-deletion')).text();
  assert.ok(body.includes('Supprimer mon compte'), 'it should name the in-app action');
  assert.ok(body.includes(`mailto:${SUPPORT_EMAIL}`), 'it should offer a contact without the app');
  assert.ok(body.includes('30 jours'), 'it should state how long a request takes');
});

test('an unknown legal path is not served', async () => {
  assert.equal((await legalRouter.request('/cgu')).status, 404);
});
