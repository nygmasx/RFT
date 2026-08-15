import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL is required');
const parsedUrl = new URL(testDatabaseUrl);
if (!['localhost', '127.0.0.1'].includes(parsedUrl.hostname) || parsedUrl.pathname !== '/rft_test') {
  throw new Error('Integration tests only run against local database rft_test');
}
process.env.DATABASE_URL = testDatabaseUrl;
process.env.BETTER_AUTH_SECRET ||= 'integration-test-secret-at-least-32-characters';
process.env.BETTER_AUTH_URL = 'http://localhost:3001';

const { app } = await import('../src/app');
const { db, sqlClient } = await import('../src/db/client');
const { notifications: notificationsTable, users } = await import('../src/db/schema');
const { and, eq } = await import('drizzle-orm');

before(async () => {
  await sqlClient.unsafe(`TRUNCATE TABLE
    notifications, competition_bookmarks, announcement_reads, announcement_reactions,
    announcement_replies, announcements, carpool_passengers, carpools, registrations,
    competitions, messages, channel_members, channels, calendar_events, push_tokens,
    user_settings, palmares, belt_records, sessions, accounts, verifications, users
    RESTART IDENTITY CASCADE`);
});

after(async () => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  await sqlClient.end();
});

async function call(path: string, options: { method?: string; token?: string; body?: unknown } = {}) {
  return app.request(path, {
    method: options.method ?? 'GET',
    headers: {
      Origin: 'http://localhost:8081',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

async function createUser(email: string) {
  const response = await call('/api/auth/sign-up/email', { method: 'POST', body: {
    email, password: 'Password123!', name: 'Test Member', firstName: 'Test', lastName: 'Member',
    status: 'pending', role: 'member', category: 'Adultes',
  } });
  assert.equal(response.status, 200, await response.clone().text());
  const payload = await response.json() as { token?: string; user?: { id: string } };
  assert.ok(payload.token);
  assert.ok(payload.user?.id);
  return { token: payload.token as string, id: payload.user!.id };
}

test('complete member, staff, content, messaging and carpool flows', async () => {
  const coach = await createUser('coach.integration@example.com');
  const member = await createUser('member.integration@example.com');
  await db.update(users).set({ status: 'approved', role: 'coach', phone: '+33600000000' }).where(eq(users.id, coach.id));
  await db.update(users).set({ status: 'approved' }).where(eq(users.id, member.id));

  assert.equal((await call('/api/profile', { token: member.token })).status, 200);

  const announcementResponse = await call('/api/announcements', { method: 'POST', token: coach.token, body: {
    title: 'Test fonctionnel', body: 'Annonce créée par le test d’intégration.', tag: 'INFO', pinned: true,
  } });
  assert.equal(announcementResponse.status, 201, await announcementResponse.clone().text());
  const announcement = await announcementResponse.json() as { id: string };
  assert.equal((await call(`/api/announcements/${announcement.id}`, { token: member.token })).status, 200);

  const competitionResponse = await call('/api/competitions', { method: 'POST', token: coach.token, body: {
    name: 'Open Integration', comp_date: '2099-06-12', location: '10 Rue de Rivoli 75001 Paris',
    latitude: 48.8557, longitude: 2.3609, comp_type: 'GI', status: 'open',
  } });
  assert.equal(competitionResponse.status, 201, await competitionResponse.clone().text());
  const competition = await competitionResponse.json() as { id: string };
  const bookmark = await call(`/api/competitions/${competition.id}/bookmark`, { method: 'PUT', token: member.token, body: {} });
  assert.equal(bookmark.status, 200);
  assert.deepEqual(await bookmark.json(), { bookmarked: true });
  assert.equal((await call(`/api/competitions/${competition.id}/register`, { method: 'POST', token: member.token, body: {} })).status, 201);

  const calendarCompetitionResponse = await call('/api/calendar', { method: 'POST', token: coach.token, body: {
    type: 'compet', title: 'Calendar Open Integration', event_date: '2099-07-12', place: 'Place Bellecour 69002 Lyon',
    latitude: 45.7579, longitude: 4.8320,
  } });
  assert.equal(calendarCompetitionResponse.status, 201, await calendarCompetitionResponse.clone().text());
  const calendarCompetition = await calendarCompetitionResponse.json() as { id: string };
  const calendarCompetitionDetail = await call(`/api/competitions/${calendarCompetition.id}`, { token: member.token });
  assert.equal(calendarCompetitionDetail.status, 200, await calendarCompetitionDetail.clone().text());
  assert.equal((await calendarCompetitionDetail.json() as { name: string }).name, 'Calendar Open Integration');
  const calendarCarpool = await call('/api/carpools', { method: 'POST', token: coach.token, body: {
    competition_id: calendarCompetition.id,
    departure_city: '1 Rue de la Mairie 60000 Beauvais',
    departure_latitude: 49.4301,
    departure_longitude: 2.0952,
    departure_at: '2099-07-12T07:30:00.000Z',
    seats_total: 4,
  } });
  assert.equal(calendarCarpool.status, 201, await calendarCarpool.clone().text());
  const calendarCarpools = await call('/api/carpools', { token: member.token });
  const calendarCarpoolsPayload = await calendarCarpools.json() as {
    carpools: {
      competition_id: string | null; departure_at: string; seats_total: number;
      departure_latitude: number | null; departure_longitude: number | null;
      competitions?: { name: string; latitude: number | null; longitude: number | null };
    }[];
  };
  const createdCalendarCarpool = calendarCarpoolsPayload.carpools.find(
    (item) => item.competition_id === calendarCompetition.id,
  );
  assert.ok(createdCalendarCarpool);
  assert.ok(createdCalendarCarpool.departure_at);
  assert.equal(createdCalendarCarpool.seats_total, 4);
  assert.equal(createdCalendarCarpool.departure_latitude, 49.4301);
  assert.equal(createdCalendarCarpool.departure_longitude, 2.0952);
  assert.equal(createdCalendarCarpool.competitions?.name, 'Calendar Open Integration');
  assert.equal(createdCalendarCarpool.competitions?.latitude, 45.7579);
  assert.equal(createdCalendarCarpool.competitions?.longitude, 4.8320);
  const calendarRegistration = await call(`/api/competitions/${calendarCompetition.id}/register`, {
    method: 'POST', token: member.token, body: {},
  });
  assert.equal(calendarRegistration.status, 201, await calendarRegistration.clone().text());
  const competitionsAfterRegistration = await call('/api/competitions', { token: member.token });
  const competitionsPayload = await competitionsAfterRegistration.json() as { upcoming: { id: string }[] };
  assert.equal(competitionsPayload.upcoming.filter((item) => item.id === calendarCompetition.id).length, 1);

  const channelResponse = await call('/api/channels', { method: 'POST', token: coach.token, body: {
    name: 'Integration privée', is_private: true, member_ids: [member.id],
  } });
  assert.equal(channelResponse.status, 201, await channelResponse.clone().text());
  const channel = await channelResponse.json() as { id: string };
  assert.equal((await call('/api/push-tokens', {
    method: 'POST', token: coach.token, body: { token: 'ExponentPushToken[coach-integration]' },
  })).status, 200);
  assert.equal((await call('/api/push-tokens', {
    method: 'POST', token: member.token, body: { token: 'ExponentPushToken[member-integration]' },
  })).status, 200);

  const originalFetch = globalThis.fetch;
  const expoPushPayloads: unknown[][] = [];
  globalThis.fetch = async (...args: Parameters<typeof fetch>) => {
    const [input, init] = args;
    if (String(input) === 'https://exp.host/--/api/v2/push/send') {
      expoPushPayloads.push(JSON.parse(String(init?.body)) as unknown[]);
      return new Response(JSON.stringify({ data: [{ status: 'ok' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return originalFetch(...args);
  };

  let messageResponse!: Response;
  try {
    messageResponse = await call(`/api/messages/${channel.id}`, {
      method: 'POST', token: coach.token, body: { body: 'Oss !' },
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(messageResponse.status, 201, await messageResponse.clone().text());
  const message = await messageResponse.json() as { id: string };
  const sentPushes = expoPushPayloads.flat() as { to: string; data?: { senderId?: string } }[];
  assert.deepEqual(sentPushes.map(({ to }) => to), ['ExponentPushToken[member-integration]']);
  assert.equal(sentPushes[0]?.data?.senderId, coach.id);
  const messages = await call(`/api/messages/${channel.id}`, { token: member.token });
  assert.equal(messages.status, 200);
  assert.equal((await messages.json() as unknown[]).length, 1);
  const [senderMessageNotification, recipientMessageNotification] = await Promise.all([
    db.select().from(notificationsTable).where(and(
      eq(notificationsTable.userId, coach.id),
      eq(notificationsTable.type, 'message'),
    )),
    db.select().from(notificationsTable).where(and(
      eq(notificationsTable.userId, member.id),
      eq(notificationsTable.type, 'message'),
    )),
  ]);
  assert.equal(senderMessageNotification.length, 0);
  assert.equal(recipientMessageNotification.length, 1);
  assert.equal((await call(`/api/messages/item/${message.id}`, { method: 'DELETE', token: coach.token })).status, 200);

  const carpoolResponse = await call('/api/carpools', { method: 'POST', token: coach.token, body: {
    competition_id: competition.id, departure_city: '12 Rue de la République 60160 Montataire',
    departure_latitude: 49.2559, departure_longitude: 2.4371, departure_at: '2099-06-12T07:00:00.000Z',
    seats_total: 3, cost_per_seat: 5,
  } });
  assert.equal(carpoolResponse.status, 201, await carpoolResponse.clone().text());
  const carpool = await carpoolResponse.json() as { id: string };
  assert.equal((await call(`/api/carpools/${carpool.id}/join`, { method: 'POST', token: member.token, body: {} })).status, 200);
  const contact = await call(`/api/carpools/${carpool.id}/contact`, { token: member.token });
  assert.equal(contact.status, 200);
  assert.equal((await contact.json() as { phone: string }).phone, '+33600000000');

  await new Promise((resolve) => setTimeout(resolve, 100));
  const notifications = await call('/api/notifications', { token: member.token });
  assert.equal(notifications.status, 200);
  assert.ok((await notifications.json() as unknown[]).length >= 3);

  const resetRequest = await call('/api/auth/request-password-reset', { method: 'POST', body: {
    email: 'member.integration@example.com', redirectTo: 'rft://reset-password',
  } });
  assert.equal(resetRequest.status, 200);

  const revoke = await call('/api/auth/revoke-session', { method: 'POST', token: member.token, body: { token: member.token } });
  assert.equal(revoke.status, 200, await revoke.clone().text());
  assert.equal((await call('/api/profile', { token: member.token })).status, 401);
});
