import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { auth } from './auth';
import { channelsRouter } from './routes/channels';
import { messagesRouter } from './routes/messages';
import { carpoolsRouter } from './routes/carpools';
import { competitionsRouter } from './routes/competitions';
import { announcementsRouter } from './routes/announcements';
import { calendarRouter } from './routes/calendar';
import { profileRouter } from './routes/profile';
import { beltRouter } from './routes/belt';
import { palmaresRouter } from './routes/palmares';

const app = new Hono();

app.use('/*', cors({
  origin: (origin) => origin ?? '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

// Better Auth — handles /api/auth/*
app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw));

// App routes
app.route('/api/channels',      channelsRouter);
app.route('/api/messages',      messagesRouter);
app.route('/api/carpools',      carpoolsRouter);
app.route('/api/competitions',  competitionsRouter);
app.route('/api/announcements', announcementsRouter);
app.route('/api/calendar',      calendarRouter);
app.route('/api/profile',       profileRouter);
app.route('/api/belt',          beltRouter);
app.route('/api/palmares',      palmaresRouter);

app.get('/health', (c) => c.json({ ok: true }));

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, () => {
  console.log(`🥋 RFT API → http://localhost:${port}`);
});
