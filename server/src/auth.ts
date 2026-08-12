import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer } from 'better-auth/plugins';
import { db } from './db/client';
import { users, sessions, accounts, verifications } from './db/schema';
import { sendTransactionalEmail } from './lib/email';

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
  emailAndPassword: {
    enabled: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      void sendTransactionalEmail({
        to: user.email,
        subject: 'Réinitialise ton mot de passe RFT',
        text: 'Une demande de réinitialisation de ton mot de passe a été reçue.',
        actionUrl: url,
        actionLabel: 'Choisir un nouveau mot de passe',
      }).catch((error) => console.error('[Email] Password reset failed', error));
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: false,
    sendVerificationEmail: async ({ user, url }) => {
      void sendTransactionalEmail({
        to: user.email,
        subject: 'Vérifie ton adresse email RFT',
        text: 'Confirme ton adresse email pour sécuriser ton compte Ronin Fight Team.',
        actionUrl: url,
        actionLabel: 'Vérifier mon email',
      }).catch((error) => console.error('[Email] Verification failed', error));
    },
  },
  user: {
    deleteUser: { enabled: true },
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
    'rft://',
    'rft://verify',
    'rft://reset-password',
  ],
  plugins: [bearer()],
});

export type AuthUser = typeof auth.$Infer.Session.user;
