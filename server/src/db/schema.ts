import {
  pgTable, text, boolean, integer, numeric,
  timestamp, date, time, uuid, primaryKey,
} from 'drizzle-orm/pg-core';

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
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const announcements = pgTable('announcements', {
  id:        uuid('id').primaryKey().defaultRandom(),
  authorId:  text('author_id').notNull().references(() => users.id),
  tag:       text('tag'),
  title:     text('title').notNull(),
  body:      text('body').notNull(),
  pinned:    boolean('pinned').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const calendarEvents = pgTable('calendar_events', {
  id:        uuid('id').primaryKey().defaultRandom(),
  type:      text('type').notNull(), // cours | compet | stage
  title:     text('title').notNull(),
  eventDate: date('event_date').notNull(),
  eventTime: time('event_time'),
  place:     text('place'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const competitions = pgTable('competitions', {
  id:                   uuid('id').primaryKey().defaultRandom(),
  name:                 text('name').notNull(),
  location:             text('location'),
  compDate:             date('comp_date').notNull(),
  category:             text('category'),
  compType:             text('comp_type'), // GI | NO-GI | OPEN
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
});

export const carpools = pgTable('carpools', {
  id:            uuid('id').primaryKey().defaultRandom(),
  driverId:      text('driver_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  competitionId: uuid('competition_id').references(() => competitions.id),
  departureCity: text('departure_city').notNull(),
  departureAt:   timestamp('departure_at').notNull(),
  seatsTotal:    integer('seats_total').notNull(),
  seatsTaken:    integer('seats_taken').notNull().default(0),
  costPerSeat:   numeric('cost_per_seat', { precision: 6, scale: 2 }).default('0'),
  notes:         text('notes'),
  createdAt:     timestamp('created_at').notNull().defaultNow(),
});

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
}, (t) => [{ name: 'push_tokens_user_token_unique', columns: [t.userId, t.token] }]);

export const palmares = pgTable('palmares', {
  id:              uuid('id').primaryKey().defaultRandom(),
  userId:          text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  competitionName: text('competition_name').notNull(),
  compDate:        date('comp_date').notNull(),
  weightClass:     text('weight_class'),
  compType:        text('comp_type'), // GI | NO-GI
  place:           integer('place').notNull(),
  notes:           text('notes'),
  createdAt:       timestamp('created_at').notNull().defaultNow(),
});
