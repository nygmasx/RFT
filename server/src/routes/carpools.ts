import { Hono } from 'hono';
import { eq, gte, asc, and } from 'drizzle-orm';
import { db } from '../db/client';
import { carpools, carpoolPassengers, competitions, users } from '../db/schema';
import { requireSession } from '../middleware/session';
import type { AuthUser } from '../auth';

const app = new Hono<{ Variables: { user: AuthUser } }>();

// GET /api/carpools — upcoming carpools
app.get('/', requireSession, async (c) => {
  const user = c.get('user');
  const now = new Date();

  const rows = await db
    .select({
      id:            carpools.id,
      driverId:      carpools.driverId,
      competitionId: carpools.competitionId,
      departureCity: carpools.departureCity,
      departureAt:   carpools.departureAt,
      seatsTotal:    carpools.seatsTotal,
      seatsTaken:    carpools.seatsTaken,
      costPerSeat:   carpools.costPerSeat,
      notes:         carpools.notes,
      createdAt:     carpools.createdAt,
      profiles: {
        first_name: users.firstName,
        last_name:  users.lastName,
      },
      competitions: {
        name:      competitions.name,
        comp_date: competitions.compDate,
      },
    })
    .from(carpools)
    .leftJoin(users, eq(carpools.driverId, users.id))
    .leftJoin(competitions, eq(carpools.competitionId, competitions.id))
    .where(gte(carpools.departureAt, now))
    .orderBy(asc(carpools.departureAt));

  // Fetch passenger carpool IDs for current user
  const myPassengerRows = await db
    .select({ carpoolId: carpoolPassengers.carpoolId })
    .from(carpoolPassengers)
    .where(eq(carpoolPassengers.userId, user.id));

  const myPassengerCarpoolIds = myPassengerRows.map((r) => r.carpoolId);

  return c.json({ carpools: rows, myPassengerCarpoolIds, currentUserId: user.id });
});

// POST /api/carpools — create carpool
app.post('/', requireSession, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    competition_id?: string;
    departure_city: string;
    departure_at: string;
    seats_total: number;
    cost_per_seat?: number;
    notes?: string;
  }>();

  const [row] = await db
    .insert(carpools)
    .values({
      driverId:      user.id,
      competitionId: body.competition_id ?? null,
      departureCity: body.departure_city,
      departureAt:   new Date(body.departure_at),
      seatsTotal:    body.seats_total,
      seatsTaken:    0,
      costPerSeat:   String(body.cost_per_seat ?? 0),
      notes:         body.notes ?? null,
    })
    .returning();

  return c.json(row, 201);
});

// POST /api/carpools/:id/join
app.post('/:id/join', requireSession, async (c) => {
  const user = c.get('user');
  const carpoolId = c.req.param('id') as `${string}-${string}-${string}-${string}-${string}`;

  const [carpool] = await db.select().from(carpools).where(eq(carpools.id, carpoolId));
  if (!carpool) return c.json({ error: 'Introuvable' }, 404);
  if (carpool.seatsTaken >= carpool.seatsTotal) return c.json({ error: 'Complet' }, 400);

  await db.insert(carpoolPassengers).values({ carpoolId, userId: user.id });
  await db.update(carpools)
    .set({ seatsTaken: carpool.seatsTaken + 1 })
    .where(eq(carpools.id, carpoolId));

  return c.json({ ok: true });
});

// GET /api/carpools/mine — carpools as driver or passenger
app.get('/mine', requireSession, async (c) => {
  const user = c.get('user');

  const driverRows = await db
    .select({
      id:            carpools.id,
      competitionId: carpools.competitionId,
      departureCity: carpools.departureCity,
      departureAt:   carpools.departureAt,
      seatsTaken:    carpools.seatsTaken,
      seatsTotal:    carpools.seatsTotal,
      competition: {
        name:      competitions.name,
        comp_date: competitions.compDate,
      },
    })
    .from(carpools)
    .leftJoin(competitions, eq(carpools.competitionId, competitions.id))
    .where(eq(carpools.driverId, user.id))
    .orderBy(carpools.departureAt);

  const passengerRows = await db
    .select({
      id:            carpools.id,
      competitionId: carpools.competitionId,
      departureCity: carpools.departureCity,
      departureAt:   carpools.departureAt,
      seatsTaken:    carpools.seatsTaken,
      seatsTotal:    carpools.seatsTotal,
      competition: {
        name:      competitions.name,
        comp_date: competitions.compDate,
      },
    })
    .from(carpoolPassengers)
    .innerJoin(carpools, eq(carpoolPassengers.carpoolId, carpools.id))
    .leftJoin(competitions, eq(carpools.competitionId, competitions.id))
    .where(eq(carpoolPassengers.userId, user.id));

  return c.json({
    driver:    driverRows.map((r) => ({ ...r, role: 'driver' })),
    passenger: passengerRows.map((r) => ({ ...r, role: 'passenger' })),
  });
});

export { app as carpoolsRouter };
