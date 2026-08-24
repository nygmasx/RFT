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
    email_campaigns, join_submissions, club_profile, join_forms, member_documents, payments, member_memberships,
    membership_plans, trial_registrations, class_bookings, class_sessions, family_profiles, seasons,
    notifications, message_reactions, message_mentions, channel_reads, result_reminders, competition_bookmarks, announcement_reads, announcement_reactions,
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

  const seasonResponse = await call('/api/club/admin/seasons', { method: 'POST', token: coach.token, body: {
    name: 'Saison intégration', startDate: '2098-09-01', endDate: '2099-08-31', status: 'active',
  } });
  assert.equal(seasonResponse.status, 201, await seasonResponse.clone().text());
  const season = await seasonResponse.json() as { id: string };

  const classResponse = await call('/api/club/admin/sessions', { method: 'POST', token: coach.token, body: {
    title: 'Cours fonctionnel', sessionDate: '2099-05-06', startTime: '19:30', endTime: '21:00',
    discipline: 'BJJ', place: 'Tatami intégration', capacity: 1, repeatWeeks: 2, seasonId: season.id,
  } });
  assert.equal(classResponse.status, 201, await classResponse.clone().text());
  const classSession = await classResponse.json() as { id: string; createdCount: number };
  assert.equal(classSession.createdCount, 2);

  const bookingResponse = await call(`/api/club/sessions/${classSession.id}/book`, { method: 'POST', token: member.token, body: {} });
  assert.equal(bookingResponse.status, 201, await bookingResponse.clone().text());
  assert.equal((await bookingResponse.json() as { status: string }).status, 'booked');

  const familyResponse = await call('/api/club/family', { method: 'POST', token: member.token, body: {
    firstName: 'Enfant', lastName: 'Member', birthDate: '2090-04-12', category: 'Enfants',
  } });
  assert.equal(familyResponse.status, 201, await familyResponse.clone().text());
  const family = await familyResponse.json() as { id: string };
  const waitlistResponse = await call(`/api/club/sessions/${classSession.id}/book`, { method: 'POST', token: member.token, body: { familyProfileId: family.id } });
  assert.equal(waitlistResponse.status, 201, await waitlistResponse.clone().text());
  assert.equal((await waitlistResponse.json() as { status: string }).status, 'waitlist');

  const rosterResponse = await call(`/api/club/admin/sessions/${classSession.id}/roster`, { token: coach.token });
  assert.equal(rosterResponse.status, 200, await rosterResponse.clone().text());
  const roster = await rosterResponse.json() as { bookings: { id: string; status: string }[] };
  assert.equal(roster.bookings.length, 2);
  assert.equal((await call(`/api/club/admin/bookings/${roster.bookings[0]!.id}/attendance`, { method: 'PUT', token: coach.token, body: { status: 'attended' } })).status, 200);

  const planResponse = await call('/api/club/admin/plans', { method: 'POST', token: coach.token, body: {
    name: 'Annuel intégration', priceCents: 35000, billingInterval: 'season', features: ['Cours illimités'],
  } });
  assert.equal(planResponse.status, 201, await planResponse.clone().text());
  const plan = await planResponse.json() as { id: string };
  const membershipResponse = await call('/api/club/admin/memberships', { method: 'POST', token: coach.token, body: {
    userId: member.id, planId: plan.id, startDate: '2098-09-01', endDate: '2099-08-31',
  } });
  assert.equal(membershipResponse.status, 201, await membershipResponse.clone().text());
  const membership = await membershipResponse.json() as { id: string; balanceCents: number };
  assert.equal(membership.balanceCents, 35000);
  assert.equal((await call('/api/club/admin/payments', { method: 'POST', token: coach.token, body: {
    userId: member.id, membershipId: membership.id, amountCents: 10000, method: 'card', status: 'paid',
  } })).status, 201);

  const documentResponse = await call('/api/club/documents', { method: 'POST', token: member.token, body: {
    title: 'Certificat intégration', category: 'medical', fileName: 'certificat.pdf',
    dataUrl: 'data:application/pdf;base64,JVBERi0xLjQ=',
  } });
  assert.equal(documentResponse.status, 201, await documentResponse.clone().text());
  const document = await documentResponse.json() as { url: string };
  const documentUrl = new URL(document.url);
  assert.equal((await call(`${documentUrl.pathname}${documentUrl.search}`)).status, 200);

  const formResponse = await call('/api/club/admin/forms', { method: 'POST', token: coach.token, body: {
    title: 'Rejoindre RFT', fields: [{ key: 'discipline', label: 'Discipline', type: 'text' }],
  } });
  assert.equal(formResponse.status, 201, await formResponse.clone().text());
  const form = await formResponse.json() as { id: string };
  assert.equal((await call('/api/club/admin/profile', { method: 'PUT', token: coach.token, body: {
    name: 'Ronin Fight Team', description: 'Club test', disciplines: ['BJJ'], joinFormId: form.id,
  } })).status, 200);
  assert.equal((await call('/api/club/public')).status, 200);
  assert.equal((await call(`/api/club/public/join/${form.id}`, { method: 'POST', body: {
    firstName: 'Prospect', lastName: 'Test', email: 'prospect@example.com', answers: { discipline: 'BJJ' },
  } })).status, 201);

  const clubOverview = await call('/api/club/overview', { token: member.token });
  assert.equal(clubOverview.status, 200, await clubOverview.clone().text());
  const clubData = await clubOverview.json() as { sessions: unknown[]; familyProfiles: unknown[]; memberships: { balanceCents: number }[]; documents: unknown[]; attendance: { attended: number } };
  assert.equal(clubData.sessions.length, 2);
  assert.equal(clubData.familyProfiles.length, 1);
  assert.equal(clubData.memberships[0]?.balanceCents, 25000);
  assert.equal(clubData.documents.length, 1);
  assert.equal(clubData.attendance.attended, 1);

  const announcementResponse = await call('/api/announcements', { method: 'POST', token: coach.token, body: {
    title: 'Test fonctionnel', body: 'Annonce créée par le test d’intégration.', tag: 'INFO', pinned: true,
  } });
  assert.equal(announcementResponse.status, 201, await announcementResponse.clone().text());
  const announcement = await announcementResponse.json() as { id: string };
  assert.equal((await call(`/api/announcements/${announcement.id}`, { token: member.token })).status, 200);

  const competitionResponse = await call('/api/competitions', { method: 'POST', token: coach.token, body: {
    name: 'Open Integration', comp_date: '2099-06-12', location: '10 Rue de Rivoli 75001 Paris',
    latitude: 48.8557, longitude: 2.3609, comp_type: 'GI', status: 'open', registration_url: 'https://example.com/register',
  } });
  assert.equal(competitionResponse.status, 201, await competitionResponse.clone().text());
  const competition = await competitionResponse.json() as { id: string; registration_url: string };
  assert.equal(competition.registration_url, 'https://example.com/register');
  const bookmark = await call(`/api/competitions/${competition.id}/bookmark`, { method: 'PUT', token: member.token, body: {} });
  assert.equal(bookmark.status, 200);
  assert.deepEqual(await bookmark.json(), { bookmarked: true });
  assert.equal((await call(`/api/competitions/${competition.id}/register`, { method: 'POST', token: member.token, body: {} })).status, 201);

  assert.equal((await call('/api/competitions/admin/overview', { token: member.token })).status, 403);
  const initialManagement = await call(`/api/competitions/${competition.id}/admin`, { token: coach.token });
  assert.equal(initialManagement.status, 200, await initialManagement.clone().text());
  const initialMember = (await initialManagement.json() as {
    members: { id: string; registration: { status: string } | null; result: unknown }[];
  }).members.find(({ id }) => id === member.id);
  assert.equal(initialMember?.registration?.status, 'en_attente');
  assert.equal(initialMember?.result, null);

  const removeSelfRegistration = await call(
    `/api/competitions/${competition.id}/admin/registrations/${member.id}`,
    { method: 'DELETE', token: coach.token },
  );
  assert.equal(removeSelfRegistration.status, 200, await removeSelfRegistration.clone().text());

  const createUnregisteredResult = await call(
    `/api/palmares/admin/competition/${competition.id}/user/${member.id}`,
    { method: 'PUT', token: coach.token, body: { place: 2, comp_type: 'GI', weight_class: '-70 kg', notes: 'Argent' } },
  );
  assert.equal(createUnregisteredResult.status, 201, await createUnregisteredResult.clone().text());
  const createdResult = await createUnregisteredResult.json() as { id: string; competitionId: string; place: number };
  assert.equal(createdResult.competitionId, competition.id);
  assert.equal(createdResult.place, 2);

  const updateResult = await call(
    `/api/palmares/admin/competition/${competition.id}/user/${member.id}`,
    { method: 'PUT', token: coach.token, body: { place: 1, comp_type: 'NO-GI', weight_class: '-70 kg' } },
  );
  assert.equal(updateResult.status, 200, await updateResult.clone().text());
  const updatedResult = await updateResult.json() as { id: string; place: number };
  assert.equal(updatedResult.id, createdResult.id);
  assert.equal(updatedResult.place, 1);

  const managementWithoutRegistration = await call(`/api/competitions/${competition.id}/admin`, { token: coach.token });
  const managedUnregisteredMember = (await managementWithoutRegistration.json() as {
    members: { id: string; registration: unknown; result: { id: string; place: number } | null }[];
  }).members.find(({ id }) => id === member.id);
  assert.equal(managedUnregisteredMember?.registration, null);
  assert.equal(managedUnregisteredMember?.result?.id, createdResult.id);
  assert.equal(managedUnregisteredMember?.result?.place, 1);

  const forceRegistration = await call(
    `/api/competitions/${competition.id}/admin/registrations/${member.id}`,
    { method: 'PUT', token: coach.token, body: { weight_class: '-70 kg' } },
  );
  assert.equal(forceRegistration.status, 201, await forceRegistration.clone().text());
  assert.equal((await forceRegistration.json() as { status: string }).status, 'confirmé');

  const overview = await call('/api/competitions/admin/overview', { token: coach.token });
  assert.equal(overview.status, 200, await overview.clone().text());
  const managedCompetition = (await overview.json() as {
    id: string; registered_count: number; result_count: number;
  }[]).find(({ id }) => id === competition.id);
  assert.equal(managedCompetition?.registered_count, 1);
  assert.equal(managedCompetition?.result_count, 1);

  const deleteResult = await call(
    `/api/palmares/admin/competition/${competition.id}/user/${member.id}`,
    { method: 'DELETE', token: coach.token },
  );
  assert.equal(deleteResult.status, 200, await deleteResult.clone().text());
  const managementAfterDelete = await call(`/api/competitions/${competition.id}/admin`, { token: coach.token });
  const managedMemberAfterDelete = (await managementAfterDelete.json() as {
    members: { id: string; registration: { status: string } | null; result: unknown }[];
  }).members.find(({ id }) => id === member.id);
  assert.equal(managedMemberAfterDelete?.registration?.status, 'confirmé');
  assert.equal(managedMemberAfterDelete?.result, null);

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

  const calendarTrainingResponse = await call('/api/calendar', { method: 'POST', token: coach.token, body: {
    type: 'cours', title: 'Entraînement No-Gi Integration', event_date: '2099-07-15', event_time: '19:30',
    place: 'Dojo Ronin, Montataire', latitude: 49.2559, longitude: 2.4371,
  } });
  assert.equal(calendarTrainingResponse.status, 201, await calendarTrainingResponse.clone().text());
  const calendarTraining = await calendarTrainingResponse.json() as { id: string };
  const trainingCarpoolResponse = await call('/api/carpools', { method: 'POST', token: coach.token, body: {
    calendar_event_id: calendarTraining.id,
    departure_city: 'Gare de Creil', departure_latitude: 49.2647, departure_longitude: 2.4692,
    departure_at: '2099-07-15T18:30:00.000Z', seats_total: 3, cost_per_seat: 0,
  } });
  assert.equal(trainingCarpoolResponse.status, 201, await trainingCarpoolResponse.clone().text());
  const trainingCarpool = await trainingCarpoolResponse.json() as { id: string; calendar_event_id: string };
  assert.equal(trainingCarpool.calendar_event_id, calendarTraining.id);

  const carpoolsWithTrainingResponse = await call('/api/carpools', { token: member.token });
  const carpoolsWithTraining = await carpoolsWithTrainingResponse.json() as {
    carpools: { id: string; calendar_event_id: string | null; calendar_event?: { title: string } }[];
  };
  const listedTrainingCarpool = carpoolsWithTraining.carpools.find(({ id }) => id === trainingCarpool.id);
  assert.equal(listedTrainingCarpool?.calendar_event_id, calendarTraining.id);
  assert.equal(listedTrainingCarpool?.calendar_event?.title, 'Entraînement No-Gi Integration');

  assert.equal((await call(`/api/carpools/${trainingCarpool.id}/edit`, { token: member.token })).status, 403);
  const trainingUpdateBody = {
    calendar_event_id: calendarTraining.id, competition_id: null,
    departure_city: 'Gare de Creil — quai principal',
    departure_latitude: 49.2647, departure_longitude: 2.4692,
    departure_at: '2099-07-15T18:45:00.000Z', seats_total: 4, cost_per_seat: 2, notes: 'Départ ponctuel',
  };
  assert.equal((await call(`/api/carpools/${trainingCarpool.id}`, {
    method: 'PUT', token: member.token, body: trainingUpdateBody,
  })).status, 403);
  const trainingUpdate = await call(`/api/carpools/${trainingCarpool.id}`, {
    method: 'PUT', token: coach.token, body: trainingUpdateBody,
  });
  assert.equal(trainingUpdate.status, 200, await trainingUpdate.clone().text());
  assert.equal((await trainingUpdate.json() as { departureCity: string }).departureCity, 'Gare de Creil — quai principal');
  assert.equal((await call(`/api/carpools/${trainingCarpool.id}`, { method: 'DELETE', token: member.token })).status, 403);
  assert.equal((await call(`/api/carpools/${trainingCarpool.id}`, { method: 'DELETE', token: coach.token })).status, 200);
  assert.equal((await call(`/api/carpools/${trainingCarpool.id}/edit`, { token: coach.token })).status, 404);

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
  let replyMessage!: { id: string; replyTo: { id: string } };
  try {
    messageResponse = await call(`/api/messages/${channel.id}`, {
      method: 'POST', token: coach.token, body: { body: 'Oss !' },
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(messageResponse.status, 201, await messageResponse.clone().text());
    const message = await messageResponse.json() as { id: string; readCount: number };
    assert.equal(message.readCount, 0);
    const sentPushes = expoPushPayloads.flat() as { to: string; data?: { senderId?: string; messageId?: string } }[];
    assert.deepEqual(sentPushes.map(({ to }) => to), ['ExponentPushToken[member-integration]']);
    assert.equal(sentPushes[0]?.data?.senderId, coach.id);
    assert.equal(sentPushes[0]?.data?.messageId, message.id);

    const membersResponse = await call(`/api/messages/${channel.id}/members`, { token: coach.token });
    assert.equal(membersResponse.status, 200);
    assert.ok((await membersResponse.json() as { id: string }[]).some(({ id }) => id === member.id));

    const messages = await call(`/api/messages/${channel.id}`, { token: member.token });
    assert.equal(messages.status, 200);
    const memberMessages = await messages.json() as { id: string; readCount: number }[];
    assert.equal(memberMessages.length, 1);
    assert.equal(memberMessages[0].readCount, 1);

    const receiptResponse = await call(`/api/messages/item/${message.id}/receipts`, { token: coach.token });
    assert.equal(receiptResponse.status, 200, await receiptResponse.clone().text());
    const receiptDetails = await receiptResponse.json() as {
      recipientCount: number;
      readCount: number;
      recipients: { id: string; status: string; distributedAt: string; readAt: string | null }[];
    };
    assert.equal(receiptDetails.recipientCount, 1);
    assert.equal(receiptDetails.readCount, 1);
    assert.equal(receiptDetails.recipients[0]?.id, member.id);
    assert.equal(receiptDetails.recipients[0]?.status, 'read');
    assert.ok(receiptDetails.recipients[0]?.distributedAt);
    assert.ok(receiptDetails.recipients[0]?.readAt);
    assert.equal((await call(`/api/messages/item/${message.id}/receipts`, { token: member.token })).status, 403);

    const mentionResponse = await call(`/api/messages/${channel.id}`, { method: 'POST', token: coach.token, body: {
      body: '@Test_Member à toi', mention_user_ids: [member.id],
    } });
    assert.equal(mentionResponse.status, 201, await mentionResponse.clone().text());
    assert.deepEqual((await mentionResponse.json() as { mentionedUserIds: string[] }).mentionedUserIds, [member.id]);

    const replyResponse = await call(`/api/messages/${channel.id}`, { method: 'POST', token: member.token, body: {
      body: 'Bien reçu', reply_to_id: message.id,
    } });
    assert.equal(replyResponse.status, 201, await replyResponse.clone().text());
    replyMessage = await replyResponse.json() as { id: string; replyTo: { id: string } };
    assert.equal(replyMessage.replyTo.id, message.id);

    const reactionResponse = await call(`/api/messages/item/${message.id}/reactions`, { method: 'PUT', token: member.token, body: { emoji: '🔥' } });
    assert.equal(reactionResponse.status, 200, await reactionResponse.clone().text());
    assert.deepEqual(await reactionResponse.json(), [{ emoji: '🔥', count: 1, reacted: true }]);

    const mediaResponse = await call(`/api/messages/${channel.id}/media`, { method: 'POST', token: coach.token, body: {
      data_url: 'data:audio/mp4;base64,AAAA', file_name: 'vocal.m4a', duration_ms: 500,
    } });
    assert.equal(mediaResponse.status, 201, await mediaResponse.clone().text());
    const media = await mediaResponse.json() as { messageType: string; mediaUrl: string; readCount: number };
    assert.equal(media.messageType, 'audio'); assert.equal(media.readCount, 0);
    const mediaDownload = await app.request(media.mediaUrl);
    assert.equal(mediaDownload.status, 200); assert.equal(mediaDownload.headers.get('content-type'), 'audio/mp4');

    assert.equal((await call(`/api/messages/item/${message.id}`, { method: 'DELETE', token: coach.token })).status, 200);
    await new Promise((resolve) => setTimeout(resolve, 100));
  } finally { globalThis.fetch = originalFetch; }
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
  assert.equal(senderMessageNotification.length, 1);
  assert.equal(JSON.parse(senderMessageNotification[0].data ?? '{}').messageId, replyMessage.id);
  assert.equal(recipientMessageNotification.length, 3);
  assert.ok(recipientMessageNotification.some(({ title }) => title.includes('mentionné')));
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
