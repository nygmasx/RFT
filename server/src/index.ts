import 'dotenv/config';
import { serve } from '@hono/node-server';
import { app } from './app';
import { startResultReminderScheduler } from './lib/result-reminders';

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, () => {
  console.log(`🥋 RFT API → http://localhost:${port}`);
});

if (process.env.DISABLE_RESULT_REMINDERS !== 'true') {
  startResultReminderScheduler();
}
