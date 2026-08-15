import 'dotenv/config';
import { and, eq, isNull, isNotNull } from 'drizzle-orm';

import { db, sqlClient } from '../src/db/client';
import { calendarEvents, carpools, competitions } from '../src/db/schema';
import { geocodeFrenchAddress } from '../src/lib/geolocation';

const pause = () => new Promise((resolve) => setTimeout(resolve, 120));

async function main() {
  let competitionsUpdated = 0;
  let eventsUpdated = 0;
  let carpoolsUpdated = 0;

  const competitionRows = await db.select().from(competitions)
    .where(and(isNull(competitions.latitude), isNotNull(competitions.location)));
  for (const competition of competitionRows) {
    if (!competition.location) continue;
    const point = await geocodeFrenchAddress(competition.location).catch(() => null);
    if (point) {
      await db.update(competitions).set({
        location: point.label, latitude: point.latitude, longitude: point.longitude,
      }).where(eq(competitions.id, competition.id));
      competitionsUpdated += 1;
    }
    await pause();
  }

  const eventRows = await db.select().from(calendarEvents)
    .where(and(eq(calendarEvents.type, 'compet'), isNull(calendarEvents.latitude), isNotNull(calendarEvents.place)));
  for (const event of eventRows) {
    if (!event.place) continue;
    const point = await geocodeFrenchAddress(event.place).catch(() => null);
    if (point) {
      await db.update(calendarEvents).set({
        place: point.label, latitude: point.latitude, longitude: point.longitude,
      }).where(eq(calendarEvents.id, event.id));
      await db.update(competitions).set({
        location: point.label, latitude: point.latitude, longitude: point.longitude,
      }).where(eq(competitions.id, event.id));
      eventsUpdated += 1;
    }
    await pause();
  }

  const carpoolRows = await db.select().from(carpools).where(isNull(carpools.departureLatitude));
  for (const carpool of carpoolRows) {
    const point = await geocodeFrenchAddress(carpool.departureCity).catch(() => null);
    if (point) {
      await db.update(carpools).set({
        departureCity: point.label,
        departureLatitude: point.latitude,
        departureLongitude: point.longitude,
      }).where(eq(carpools.id, carpool.id));
      carpoolsUpdated += 1;
    }
    await pause();
  }

  console.log(JSON.stringify({ competitionsUpdated, eventsUpdated, carpoolsUpdated }));
}

main().finally(() => sqlClient.end());
