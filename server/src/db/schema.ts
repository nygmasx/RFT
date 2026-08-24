import {
  pgTable, text, boolean, integer, numeric,
  timestamp, date, time, uuid, primaryKey, uniqueIndex, doublePrecision,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ── Better Auth tables ────────────────────────────────────────
export const users = pgTable('users', {
  id:            text('id').primaryKey(),
  name:          text('name').notNull(),
  email:         text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image:         text('image'),
  createdAt:     timestamp('created_at').notNull().defaultNow(),
  updatedAt:     timestamp('updated_at').notNull().defaultNow(),
  // App-specific fields
  firstName:  text('first_name').notNull().default(''),
  lastName:   text('last_name').notNull().default(''),
  status:     text('status').notNull().default('pending'), // pending | approved | rejected
  role:       text('role').notNull().default('member'),    // member | coach | admin
  memberId:   text('member_id').unique(),
  category:   text('category').default('Adultes'),
  weightClass: text('weight_class'),
  stance:     text('stance'),
  phone:      text('phone'),
  avatarUrl:  text('avatar_url'),
});

export const sessions = pgTable('sessions', {
  id:         text('id').primaryKey(),
  expiresAt:  timestamp('expires_at').notNull(),
  token:      text('token').notNull().unique(),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
  updatedAt:  timestamp('updated_at').notNull().defaultNow(),
  ipAddress:  text('ip_address'),
  userAgent:  text('user_agent'),
  userId:     text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
});

export const accounts = pgTable('accounts', {
  id:                     text('id').primaryKey(),
  accountId:              text('account_id').notNull(),
  providerId:             text('provider_id').notNull(),
  userId:                 text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accessToken:            text('access_token'),
  refreshToken:           text('refresh_token'),
  idToken:                text('id_token'),
  accessTokenExpiresAt:   timestamp('access_token_expires_at'),
  refreshTokenExpiresAt:  timestamp('refresh_token_expires_at'),
  scope:                  text('scope'),
  password:               text('password'),
  createdAt:              timestamp('created_at').notNull().defaultNow(),
  updatedAt:              timestamp('updated_at').notNull().defaultNow(),
});

export const verifications = pgTable('verifications', {
  id:         text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value:      text('value').notNull(),
  expiresAt:  timestamp('expires_at').notNull(),
  createdAt:  timestamp('created_at').defaultNow(),
  updatedAt:  timestamp('updated_at').defaultNow(),
});

// ── App tables ────────────────────────────────────────────────
export const channels = pgTable('channels', {
  id:          text('id').primaryKey(),
  name:        text('name').notNull(),
  description: text('description'),
  isPrivate:   boolean('is_private').notNull().default(false),
  isLocked:    boolean('is_locked').notNull().default(false),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
});

export const channelMembers = pgTable('channel_members', {
  channelId: text('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.channelId, t.userId] })]);

export const messages = pgTable('messages', {
  id:        uuid('id').primaryKey().defaultRandom(),
  channelId: text('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  body:      text('body').notNull(),
  messageType: text('message_type').notNull().default('text'), // text | image | audio
  mediaData: text('media_data'),
  mediaMimeType: text('media_mime_type'),
  mediaFileName: text('media_file_name'),
  mediaDurationMs: integer('media_duration_ms'),
  mediaToken: uuid('media_token'),
  replyToId: uuid('reply_to_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
}, (t) => [uniqueIndex('messages_media_token_unique').on(t.mediaToken)]);

export const channelReads = pgTable('channel_reads', {
  channelId: text('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  readAt:    timestamp('read_at').notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.channelId, t.userId] })]);

export const messageMentions = pgTable('message_mentions', {
  messageId: uuid('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.messageId, t.userId] })]);

export const messageReactions = pgTable('message_reactions', {
  messageId: uuid('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  emoji: text('emoji').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.messageId, t.userId, t.emoji] })]);

export const messagePolls = pgTable('message_polls', {
  messageId: uuid('message_id').primaryKey().references(() => messages.id, { onDelete: 'cascade' }),
  allowsMultiple: boolean('allows_multiple').notNull().default(false),
});

export const messagePollOptions = pgTable('message_poll_options', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id').notNull().references(() => messagePolls.messageId, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  position: integer('position').notNull(),
}, (t) => [uniqueIndex('message_poll_options_position_unique').on(t.messageId, t.position)]);

export const messagePollVotes = pgTable('message_poll_votes', {
  optionId: uuid('option_id').notNull().references(() => messagePollOptions.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.optionId, t.userId] })]);

export const announcements = pgTable('announcements', {
  id:        uuid('id').primaryKey().defaultRandom(),
  authorId:  text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tag:       text('tag'),
  title:     text('title').notNull(),
  body:      text('body').notNull(),
  pinned:    boolean('pinned').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const announcementReactions = pgTable('announcement_reactions', {
  announcementId: uuid('announcement_id').notNull().references(() => announcements.id, { onDelete: 'cascade' }),
  userId:         text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  emoji:          text('emoji').notNull(),
  createdAt:      timestamp('created_at').notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.announcementId, t.userId, t.emoji] })]);

export const announcementReplies = pgTable('announcement_replies', {
  id:             uuid('id').primaryKey().defaultRandom(),
  announcementId: uuid('announcement_id').notNull().references(() => announcements.id, { onDelete: 'cascade' }),
  userId:         text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  body:           text('body').notNull(),
  createdAt:      timestamp('created_at').notNull().defaultNow(),
});

export const announcementReads = pgTable('announcement_reads', {
  announcementId: uuid('announcement_id').notNull().references(() => announcements.id, { onDelete: 'cascade' }),
  userId:         text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  readAt:         timestamp('read_at').notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.announcementId, t.userId] })]);

export const calendarEvents = pgTable('calendar_events', {
  id:        uuid('id').primaryKey().defaultRandom(),
  type:      text('type').notNull(), // cours | compet | stage
  title:     text('title').notNull(),
  eventDate: date('event_date').notNull(),
  eventTime: time('event_time'),
  place:     text('place'),
  latitude:  doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const competitions = pgTable('competitions', {
  id:                   uuid('id').primaryKey().defaultRandom(),
  name:                 text('name').notNull(),
  location:             text('location'),
  latitude:             doublePrecision('latitude'),
  longitude:            doublePrecision('longitude'),
  compDate:             date('comp_date').notNull(),
  category:             text('category'),
  compType:             text('comp_type'), // GI | NO-GI | OPEN
  importance:           text('importance').notNull().default('regional'), // local | regional | national | international | major
  registrationUrl:      text('registration_url'),
  registrationDeadline: date('registration_deadline'),
  status:               text('status').notNull().default('open'), // open | soon | closed
  createdAt:            timestamp('created_at').notNull().defaultNow(),
});

export const registrations = pgTable('registrations', {
  id:            uuid('id').primaryKey().defaultRandom(),
  userId:        text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  competitionId: uuid('competition_id').notNull().references(() => competitions.id, { onDelete: 'cascade' }),
  weightClass:   text('weight_class'),
  status:        text('status').notNull().default('en_attente'), // confirmé | en_attente | annulé
  createdAt:     timestamp('created_at').notNull().defaultNow(),
}, (t) => [uniqueIndex('registrations_user_competition_unique').on(t.userId, t.competitionId)]);

export const competitionBookmarks = pgTable('competition_bookmarks', {
  competitionId: uuid('competition_id').notNull().references(() => competitions.id, { onDelete: 'cascade' }),
  userId:        text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt:     timestamp('created_at').notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.competitionId, t.userId] })]);

export const carpools = pgTable('carpools', {
  id:            uuid('id').primaryKey().defaultRandom(),
  driverId:      text('driver_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  competitionId: uuid('competition_id').references(() => competitions.id),
  calendarEventId: uuid('calendar_event_id').references(() => calendarEvents.id, { onDelete: 'set null' }),
  departureCity: text('departure_city').notNull(),
  departureLatitude:  doublePrecision('departure_latitude'),
  departureLongitude: doublePrecision('departure_longitude'),
  departureAt:   timestamp('departure_at').notNull(),
  seatsTotal:    integer('seats_total').notNull(),
  seatsTaken:    integer('seats_taken').notNull().default(0),
  costPerSeat:   numeric('cost_per_seat', { precision: 6, scale: 2 }).default('0'),
  notes:         text('notes'),
  createdAt:     timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  check('carpools_single_destination_check', sql`${t.competitionId} IS NULL OR ${t.calendarEventId} IS NULL`),
]);

export const carpoolPassengers = pgTable('carpool_passengers', {
  carpoolId: uuid('carpool_id').notNull().references(() => carpools.id, { onDelete: 'cascade' }),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.carpoolId, t.userId] })]);

export const beltRecords = pgTable('belt_records', {
  id:           uuid('id').primaryKey().defaultRandom(),
  userId:       text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  color:        text('color').notNull(), // blanche | bleue | violette | marron | noire
  stripes:      integer('stripes').notNull().default(0),
  promotedBy:   text('promoted_by'),
  promotedDate: date('promoted_date'),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
});

export const pushTokens = pgTable('push_tokens', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token:     text('token').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [uniqueIndex('push_tokens_token_unique').on(t.token)]);

export const notifications = pgTable('notifications', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type:      text('type').notNull(),
  title:     text('title').notNull(),
  body:      text('body').notNull(),
  data:      text('data'),
  readAt:    timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const userSettings = pgTable('user_settings', {
  userId:             text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  notifyCoach:        boolean('notify_coach').notNull().default(true),
  notifyMessages:     boolean('notify_messages').notNull().default(true),
  notifyCompetitions: boolean('notify_competitions').notNull().default(true),
  notifyCarpools:     boolean('notify_carpools').notNull().default(false),
  shareGrade:         boolean('share_grade').notNull().default(true),
  sharePalmares:      boolean('share_palmares').notNull().default(true),
  profileVisibility:  text('profile_visibility').notNull().default('members'),
  updatedAt:          timestamp('updated_at').notNull().defaultNow(),
});

export const palmares = pgTable('palmares', {
  id:              uuid('id').primaryKey().defaultRandom(),
  userId:          text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  competitionId:   uuid('competition_id').references(() => competitions.id, { onDelete: 'set null' }),
  competitionName: text('competition_name').notNull(),
  compDate:        date('comp_date').notNull(),
  weightClass:     text('weight_class'),
  compType:        text('comp_type'), // GI | NO-GI
  place:           integer('place').notNull(),
  resultStage:     text('result_stage').notNull().default('participant'),
  validationStatus: text('validation_status').notNull().default('approved'), // pending | approved | rejected
  submissionSource: text('submission_source').notNull().default('coach'), // athlete | coach
  beltColor:       text('belt_color'),
  submittedAt:     timestamp('submitted_at').notNull().defaultNow(),
  reviewedBy:      text('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  reviewedAt:      timestamp('reviewed_at'),
  notes:           text('notes'),
  createdAt:       timestamp('created_at').notNull().defaultNow(),
}, (t) => [uniqueIndex('palmares_user_competition_unique').on(t.userId, t.competitionId)]);

export const resultReminders = pgTable('result_reminders', {
  userId:        text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  competitionId: uuid('competition_id').notNull().references(() => competitions.id, { onDelete: 'cascade' }),
  sentAt:        timestamp('sent_at').notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.competitionId] })]);

// ── Club management ────────────────────────────────────────────────
export const seasons = pgTable('seasons', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  status: text('status').notNull().default('draft'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const familyProfiles = pgTable('family_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerUserId: text('owner_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  birthDate: date('birth_date'),
  category: text('category'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const classSessions = pgTable('class_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  seasonId: uuid('season_id').references(() => seasons.id, { onDelete: 'set null' }),
  coachId: text('coach_id').references(() => users.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  discipline: text('discipline').notNull().default('BJJ'),
  category: text('category'),
  sessionDate: date('session_date').notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time'),
  place: text('place'),
  capacity: integer('capacity').notNull().default(30),
  status: text('status').notNull().default('scheduled'),
  trialAllowed: boolean('trial_allowed').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const classBookings = pgTable('class_bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => classSessions.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  familyProfileId: uuid('family_profile_id').references(() => familyProfiles.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('booked'),
  checkedInAt: timestamp('checked_in_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('class_bookings_session_user_unique').on(t.sessionId, t.userId).where(sql`${t.userId} is not null`),
  uniqueIndex('class_bookings_session_family_unique').on(t.sessionId, t.familyProfileId).where(sql`${t.familyProfileId} is not null`),
]);

export const trialRegistrations = pgTable('trial_registrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => classSessions.id, { onDelete: 'cascade' }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  status: text('status').notNull().default('registered'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const membershipPlans = pgTable('membership_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  priceCents: integer('price_cents').notNull().default(0),
  currency: text('currency').notNull().default('EUR'),
  billingInterval: text('billing_interval').notNull().default('season'),
  checkoutUrl: text('checkout_url'),
  features: text('features').notNull().default('[]'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const memberMemberships = pgTable('member_memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id').notNull().references(() => membershipPlans.id, { onDelete: 'restrict' }),
  status: text('status').notNull().default('active'),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  nextPaymentDate: date('next_payment_date'),
  balanceCents: integer('balance_cents').notNull().default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  membershipId: uuid('membership_id').references(() => memberMemberships.id, { onDelete: 'set null' }),
  amountCents: integer('amount_cents').notNull(),
  currency: text('currency').notNull().default('EUR'),
  method: text('method').notNull().default('manual'),
  status: text('status').notNull().default('pending'),
  dueDate: date('due_date'),
  paidAt: timestamp('paid_at'),
  reference: text('reference'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const memberDocuments = pgTable('member_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  uploadedBy: text('uploaded_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  category: text('category').notNull().default('other'),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  fileData: text('file_data').notNull(),
  accessToken: uuid('access_token').notNull().defaultRandom(),
  expiresOn: date('expires_on'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [uniqueIndex('member_documents_access_token_unique').on(t.accessToken)]);

export const joinForms = pgTable('join_forms', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  fields: text('fields').notNull().default('[]'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const joinSubmissions = pgTable('join_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  formId: uuid('form_id').notNull().references(() => joinForms.id, { onDelete: 'cascade' }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  answers: text('answers').notNull().default('{}'),
  status: text('status').notNull().default('new'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const clubProfile = pgTable('club_profile', {
  id: text('id').primaryKey().default('rft'),
  name: text('name').notNull().default('Ronin Fight Team'),
  description: text('description'),
  address: text('address'),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  phone: text('phone'),
  email: text('email'),
  website: text('website'),
  disciplines: text('disciplines').notNull().default('[]'),
  scheduleSummary: text('schedule_summary'),
  joinButtonLabel: text('join_button_label').notNull().default('Rejoindre le club'),
  joinFormId: uuid('join_form_id').references(() => joinForms.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const emailCampaigns = pgTable('email_campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  senderId: text('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  audience: text('audience').notNull().default('all'),
  status: text('status').notNull().default('draft'),
  sentCount: integer('sent_count').notNull().default(0),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
