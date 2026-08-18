import { and, eq, ne } from 'drizzle-orm';

import { db } from '../db/client';
import { competitions, palmares, registrations, resultReminders } from '../db/schema';
import { notifyUser } from '../routes/push';

function parisDateDaysAgo(days: number) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(Date.now() - days * 86_400_000));
}

export async function sendResultReminders() {
  const competitionDate = parisDateDaysAgo(1);
  const candidates = await db.select({
    userId: registrations.userId,
    competitionId: registrations.competitionId,
    competitionName: competitions.name,
  })
    .from(registrations)
    .innerJoin(competitions, eq(registrations.competitionId, competitions.id))
    .where(and(
      eq(competitions.compDate, competitionDate),
      ne(registrations.status, 'annulé'),
    ));

  for (const candidate of candidates) {
    const [existingResult] = await db.select({ id: palmares.id })
      .from(palmares)
      .where(and(
        eq(palmares.userId, candidate.userId),
        eq(palmares.competitionId, candidate.competitionId),
      ))
      .limit(1);
    if (existingResult) continue;

    const [claimed] = await db.insert(resultReminders)
      .values({ userId: candidate.userId, competitionId: candidate.competitionId })
      .onConflictDoNothing()
      .returning({ userId: resultReminders.userId });
    if (!claimed) continue;

    await notifyUser(
      candidate.userId,
      '🥋 Quel a été ton résultat ?',
      `${candidate.competitionName} est terminée. Ajoute ton résultat pour le faire valider par ton coach.`,
      { competitionId: candidate.competitionId, screen: 'add_result' },
      'result_reminder',
    );
  }
}

export function startResultReminderScheduler() {
  const run = () => void sendResultReminders().catch((error) => {
    console.error('[Result reminders]', error);
  });
  const initialTimer = setTimeout(run, 15_000);
  const interval = setInterval(run, 60 * 60 * 1_000);
  return () => {
    clearTimeout(initialTimer);
    clearInterval(interval);
  };
}
