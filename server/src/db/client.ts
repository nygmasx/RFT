import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
export const sqlClient = postgres(process.env.DATABASE_URL, {
  max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
  prepare: false,
  idle_timeout: 20,
  connect_timeout: 10,
});
export const db = drizzle(sqlClient, { schema });
