import { and, eq } from 'drizzle-orm';

import { db } from '../db/client';
import { calendarEvents, competitions } from '../db/schema';

export type CompetitionId = `${string}-${string}-${string}-${string}-${string}`;

export async function findCalendarCompetition(id: CompetitionId) {
  const [event] = await db
    .select()
    .from(calendarEvents)
    .where(and(eq(calendarEvents.id, id), eq(calendarEvents.type, 'compet')));
  return event;
}

export async function ensureStoredCompetition(id: CompetitionId) {
  const [stored] = await db.select().from(competitions).where(eq(competitions.id, id));
  if (stored) return stored;

  const event = await findCalendarCompetition(id);
  if (!event) return null;

  await db.insert(competitions).values({
    id: event.id,
    name: event.title,
    location: event.place,
    latitude: event.latitude,
    longitude: event.longitude,
    compDate: event.eventDate,
    status: 'open',
  }).onConflictDoNothing();

  const [created] = await db.select().from(competitions).where(eq(competitions.id, id));
  return created ?? null;
}
