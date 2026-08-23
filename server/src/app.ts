import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requestId } from 'hono/request-id';
import { secureHeaders } from 'hono/secure-headers';

import { auth } from './auth';
import { rateLimit } from './middleware/rate-limit';
import { announcementsRouter } from './routes/announcements';
import { beltRouter } from './routes/belt';
import { calendarRouter } from './routes/calendar';
import { carpoolsRouter } from './routes/carpools';
import { channelsRouter } from './routes/channels';
import { competitionsRouter } from './routes/competitions';
import { messagesRouter } from './routes/messages';
import { geolocationRouter } from './routes/geolocation';
import { notificationsRouter } from './routes/notifications';
import { palmaresRouter } from './routes/palmares';
import { profileRouter } from './routes/profile';
import { pushRouter } from './routes/push';
import { rankingsRouter } from './routes/rankings';
import { settingsRouter } from './routes/settings';
import { clubRouter } from './routes/club';

export const app = new Hono();

const allowedOrigins = new Set([
  process.env.APP_ORIGIN,
  'https://rfteam.fly.dev',
  'http://localhost:3001',
  'http://localhost:8081',
].filter((value): value is string => Boolean(value)));

app.use('*', requestId());
app.use('*', secureHeaders());
app.use('*', cors({
  origin: (origin) => !origin || allowedOrigins.has(origin) ? origin : '',
  allowHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  exposeHeaders: ['X-Request-Id', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));
app.use('*', async (c, next) => {
  const startedAt = Date.now();
  await next();
  console.log(JSON.stringify({
    level: 'info',
    event: 'http_request',
    requestId: c.get('requestId'),
    method: c.req.method,
    path: new URL(c.req.url).pathname,
    status: c.res.status,
    durationMs: Date.now() - startedAt,
  }));
});

app.use('/api/auth/*', rateLimit({ prefix: 'auth', limit: 20, windowMs: 60_000 }));
app.use('/api/*', rateLimit({ prefix: 'api', limit: 240, windowMs: 60_000 }));

app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw));
app.route('/api/channels', channelsRouter);
app.route('/api/messages', messagesRouter);
app.route('/api/geolocation', geolocationRouter);
app.route('/api/carpools', carpoolsRouter);
app.route('/api/competitions', competitionsRouter);
app.route('/api/announcements', announcementsRouter);
app.route('/api/calendar', calendarRouter);
app.route('/api/profile', profileRouter);
app.route('/api/belt', beltRouter);
app.route('/api/palmares', palmaresRouter);
app.route('/api/push-tokens', pushRouter);
app.route('/api/rankings', rankingsRouter);
app.route('/api/settings', settingsRouter);
app.route('/api/notifications', notificationsRouter);
app.route('/api/club', clubRouter);

app.get('/health', (c) => c.json({ ok: true }));
app.notFound((c) => c.json({ error: 'Route introuvable' }, 404));
app.onError((error, c) => {
  console.error(JSON.stringify({
    level: 'error',
    event: 'unhandled_error',
    requestId: c.get('requestId'),
    path: new URL(c.req.url).pathname,
    message: error instanceof Error ? error.message : String(error),
  }));
  return c.json({ error: 'Erreur interne', requestId: c.get('requestId') }, 500);
});
