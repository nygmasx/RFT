import { Hono } from 'hono';
import { DOCUMENTS, LEGAL_UPDATED_AT, SUPPORT_EMAIL, type LegalDocument } from '../lib/legal-content';

const app = new Hono();

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character]!);
}

// Turn the bare email in the body text into a usable mailto link.
function linkEmails(value: string) {
  return value.replace(
    new RegExp(escapeHtml(SUPPORT_EMAIL).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
    `<a href="mailto:${escapeHtml(SUPPORT_EMAIL)}">${escapeHtml(SUPPORT_EMAIL)}</a>`,
  );
}

function render(document: LegalDocument) {
  const sections = document.sections.map(([title, body]) => `
      <section>
        <h2>${escapeHtml(title)}</h2>
        <p>${linkEmails(escapeHtml(body))}</p>
      </section>`).join('');

  const nav = (Object.values(DOCUMENTS) as LegalDocument[])
    .map((d) => d.slug === document.slug
      ? `<span aria-current="page">${escapeHtml(d.title)}</span>`
      : `<a href="/${d.slug}">${escapeHtml(d.title)}</a>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(document.title)} — Ronin Fight Team</title>
<meta name="description" content="${escapeHtml(document.title)} de l’application Ronin Fight Team.">
<style>
  :root {
    --ink: #0A0A0A; --surface: #14110F; --bone: #F5F2ED; --text: #D9D4CC;
    --mute: #6B665E; --dim: #9C968D; --crimson: #C8362D; --line: rgba(255,255,255,0.09);
  }
  @media (prefers-color-scheme: light) {
    :root {
      --ink: #F5F2ED; --surface: #FFFFFF; --bone: #14110F; --text: #2B2722;
      --mute: #8E887F; --dim: #5C564E; --line: rgba(0,0,0,0.10);
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--ink); color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.65; -webkit-font-smoothing: antialiased;
  }
  main { max-width: 680px; margin: 0 auto; padding: 48px 16px 72px; }
  header { border-bottom: 1px solid var(--line); padding-bottom: 22px; margin-bottom: 8px; }
  .brand {
    font-size: 11px; letter-spacing: 2.5px; font-weight: 700;
    color: var(--crimson); text-transform: uppercase; margin: 0 0 14px;
  }
  h1 { font-size: clamp(26px, 6vw, 34px); line-height: 1.15; color: var(--bone); margin: 0 0 10px; font-weight: 800; }
  .updated { font-size: 11px; letter-spacing: 1.2px; color: var(--mute); text-transform: uppercase; margin: 0; }
  .intro { color: var(--dim); margin: 26px 0 0; }
  section { border-top: 1px solid var(--line); padding: 22px 0 4px; }
  h2 { font-size: 11px; letter-spacing: 1.6px; color: var(--crimson); text-transform: uppercase; font-weight: 700; margin: 0 0 8px; }
  p { margin: 0; font-size: 15px; }
  a { color: var(--bone); text-decoration: underline; text-underline-offset: 3px; }
  nav { margin-top: 44px; padding-top: 22px; border-top: 1px solid var(--line); display: flex; flex-wrap: wrap; gap: 18px; }
  nav a, nav span { font-size: 13px; color: var(--mute); text-decoration: none; }
  nav a:hover { color: var(--bone); }
  nav span[aria-current] { color: var(--bone); }
</style>
</head>
<body>
<main>
  <header>
    <p class="brand">Ronin Fight Team</p>
    <h1>${escapeHtml(document.title)}</h1>
    <p class="updated">Mise à jour · ${escapeHtml(LEGAL_UPDATED_AT)}</p>
  </header>
  ${document.intro ? `<p class="intro">${escapeHtml(document.intro)}</p>` : ''}
  ${sections}
  <nav>${nav}</nav>
</main>
</body>
</html>`;
}

for (const document of Object.values(DOCUMENTS) as LegalDocument[]) {
  app.get(`/${document.slug}`, (c) =>
    c.html(render(document), 200, { 'Cache-Control': 'public, max-age=3600' }));
}

export { app as legalRouter };
