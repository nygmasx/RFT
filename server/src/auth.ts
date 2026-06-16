import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db/client';
import { users, sessions, accounts, verifications } from './db/schema';

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3001',
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user:         users,
      session:      sessions,
      account:      accounts,
      verification: verifications,
    },
  }),
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      firstName:   { type: 'string', required: true,  input: true },
      lastName:    { type: 'string', required: true,  input: true },
      status:      { type: 'string', defaultValue: 'pending' },
      role:        { type: 'string', defaultValue: 'member' },
      memberId:    { type: 'string', required: false, input: true },
      category:    { type: 'string', defaultValue: 'Adultes', input: true },
      weightClass: { type: 'string', required: false, input: true },
      stance:      { type: 'string', required: false, input: true },
      phone:       { type: 'string', required: false, input: true },
      avatarUrl:   { type: 'string', required: false, input: true },
    },
  },
  trustedOrigins: [
    'https://rfteam.fly.dev',
    'http://localhost:3001',
    'http://localhost:8081',
    'http://192.168.1.53:3001',
    'http://192.168.1.53:8081',
    'exp://',
  ],
});

export type AuthUser = typeof auth.$Infer.Session.user;
