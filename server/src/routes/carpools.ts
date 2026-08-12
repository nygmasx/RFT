import { Hono } from 'hono';
import { and, eq, gte, asc, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { carpools, carpoolPassengers, competitions, users } from '../db/schema';
import { requireApproved } from '../middleware/session';
import type { AuthUser } from '../auth';
import { notifyMembers, notifyUser } from './push';
import { isStaff } from '../lib/access';

const app = new Hono<{ Variables: { user: AuthUser } }>();

// GET /api/carpools — upcoming carpools
app.get('/', requireApproved, async (c) => {
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

  return c.json({
    carpools: rows.map((row) => ({
      id: row.id,
      driver_id: row.driverId,
      competition_id: row.competitionId,
      departure_city: row.departureCity,
      departure_at: row.departureAt,
      seats_total: row.seatsTotal,
      seats_taken: row.seatsTaken,
      cost_per_seat: Number(row.costPerSeat ?? 0),
      notes: row.notes,
      created_at: row.createdAt,
      profiles: row.profiles,
      competitions: row.competitions,
    })),
    myPassengerCarpoolIds,
    currentUserId: user.id,
  });
});

// POST /api/carpools — create carpool
app.post('/', requireApproved, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    competition_id?: string;
    departure_city: string;
    departure_at: string;
    seats_total: number;
    cost_per_seat?: number;
    notes?: string;
  }>();

  const departureCity = body.departure_city?.trim();
  const departureAt = new Date(body.departure_at);
  if (!departureCity) return c.json({ error: 'Ville de départ obligatoire' }, 400);
  if (Number.isNaN(departureAt.getTime()) || departureAt <= new Date()) {
    return c.json({ error: 'Date de départ invalide' }, 400);
  }
  if (!Number.isInteger(body.seats_total) || body.seats_total < 1 || body.seats_total > 8) {
    return c.json({ error: 'Le nombre de places doit être compris entre 1 et 8' }, 400);
  }
  if ((body.cost_per_seat ?? 0) < 0 || (body.cost_per_seat ?? 0) > 500) {
    return c.json({ error: 'Participation invalide' }, 400);
  }

  const [row] = await db
    .insert(carpools)
    .values({
      driverId:      user.id,
      competitionId: body.competition_id ?? null,
      departureCity,
      departureAt,
      seatsTotal:    body.seats_total,
      seatsTaken:    0,
      costPerSeat:   String(body.cost_per_seat ?? 0),
      notes:         body.notes ?? null,
    })
    .returning();

  void notifyMembers(
    'notifyCarpools',
    '🚗 Nouveau covoiturage',
    `Départ de ${row.departureCity} · ${row.departureAt.toLocaleString('fr-FR')}`,
    { carpoolId: row.id },
    'carpool',
  );

  return c.json({
    id: row.id,
    driver_id: row.driverId,
    competition_id: row.competitionId,
    departure_city: row.departureCity,
    departure_at: row.departureAt,
    seats_total: row.seatsTotal,
    seats_taken: row.seatsTaken,
    cost_per_seat: Number(row.costPerSeat ?? 0),
    notes: row.notes,
    created_at: row.createdAt,
  }, 201);
});

// POST /api/carpools/:id/join
app.post('/:id/join', requireApproved, async (c) => {
  const user = c.get('user');
  const carpoolId = c.req.param('id') as `${string}-${string}-${string}-${string}-${string}`;

  const result = await db.execute(sql`
    WITH reserved AS (
      UPDATE carpools
      SET seats_taken = seats_taken + 1
      WHERE id = ${carpoolId}
        AND driver_id <> ${user.id}
        AND seats_taken < seats_total
        AND NOT EXISTS (
          SELECT 1 FROM carpool_passengers
          WHERE carpool_id = ${carpoolId} AND user_id = ${user.id}
        )
      RETURNING id
    ), joined AS (
      INSERT INTO carpool_passengers (carpool_id, user_id)
      SELECT id, ${user.id} FROM reserved
      ON CONFLICT DO NOTHING
      RETURNING carpool_id
    ), rollback_duplicate AS (
      UPDATE carpools
      SET seats_taken = GREATEST(0, seats_taken - 1)
      WHERE id IN (SELECT id FROM reserved)
        AND NOT EXISTS (SELECT 1 FROM joined)
    )
    SELECT
      EXISTS (SELECT 1 FROM joined) AS joined,
      EXISTS (SELECT 1 FROM carpool_passengers WHERE carpool_id = ${carpoolId} AND user_id = ${user.id}) AS already_joined,
      EXISTS (SELECT 1 FROM carpools WHERE id = ${carpoolId}) AS exists,
      EXISTS (SELECT 1 FROM carpools WHERE id = ${carpoolId} AND driver_id = ${user.id}) AS is_driver,
      EXISTS (SELECT 1 FROM carpools WHERE id = ${carpoolId} AND seats_taken >= seats_total) AS is_full
  `);
  const state = result[0] as {
    joined: boolean; already_joined: boolean; exists: boolean; is_driver: boolean; is_full: boolean;
  };

  if (!state.exists) return c.json({ error: 'Introuvable' }, 404);
  if (state.is_driver) return c.json({ error: 'Tu conduis déjà ce trajet' }, 409);
  if (state.joined || state.already_joined) {
    if (state.joined) {
      const [carpool] = await db.select({ driverId: carpools.driverId, departureCity: carpools.departureCity })
        .from(carpools).where(eq(carpools.id, carpoolId));
      if (carpool) void notifyUser(
        carpool.driverId,
        '🚗 Nouveau passager',
        `${user.firstName} ${user.lastName} rejoint ton trajet depuis ${carpool.departureCity}.`,
        { carpoolId },
        'carpool',
      );
    }
    return c.json({ ok: true });
  }
  if (state.is_full) return c.json({ error: 'Complet' }, 409);
  return c.json({ error: 'Réservation impossible' }, 409);
});

// DELETE /api/carpools/:id/join — leave a carpool atomically
app.delete('/:id/join', requireApproved, async (c) => {
  const user = c.get('user');
  const carpoolId = c.req.param('id') as `${string}-${string}-${string}-${string}-${string}`;
  await db.execute(sql`
    WITH removed AS (
      DELETE FROM carpool_passengers
      WHERE carpool_id = ${carpoolId} AND user_id = ${user.id}
      RETURNING carpool_id
    )
    UPDATE carpools
    SET seats_taken = GREATEST(0, seats_taken - 1)
    WHERE id IN (SELECT carpool_id FROM removed)
  `);
  return c.json({ ok: true });
});

app.get('/:id/contact', requireApproved, async (c) => {
  const user = c.get('user');
  const carpoolId = c.req.param('id') as `${string}-${string}-${string}-${string}-${string}`;
  const [row] = await db.select({
    driverId: carpools.driverId,
    firstName: users.firstName,
    lastName: users.lastName,
    phone: users.phone,
  }).from(carpools)
    .innerJoin(users, eq(carpools.driverId, users.id))
    .where(eq(carpools.id, carpoolId));
  if (!row) return c.json({ error: 'Introuvable' }, 404);
  const [passenger] = await db.select({ userId: carpoolPassengers.userId }).from(carpoolPassengers)
    .where(and(eq(carpoolPassengers.carpoolId, carpoolId), eq(carpoolPassengers.userId, user.id)));
  if (row.driverId !== user.id && !passenger && !isStaff(user)) {
    return c.json({ error: 'Rejoins ce trajet pour contacter le conducteur' }, 403);
  }
  if (!row.phone) return c.json({ error: 'Le conducteur n’a pas renseigné de téléphone' }, 404);
  return c.json({ name: `${row.firstName} ${row.lastName}`.trim(), phone: row.phone });
});

app.put('/:id', requireApproved, async (c) => {
  const user = c.get('user');
  const carpoolId = c.req.param('id') as `${string}-${string}-${string}-${string}-${string}`;
  const body = await c.req.json<{ departure_city: string; departure_at: string; seats_total: number; cost_per_seat?: number; notes?: string }>();
  const departureAt = new Date(body.departure_at);
  if (!body.departure_city?.trim() || Number.isNaN(departureAt.getTime()) || departureAt <= new Date()) {
    return c.json({ error: 'Départ invalide' }, 400);
  }
  const [current] = await db.select().from(carpools).where(eq(carpools.id, carpoolId));
  if (!current) return c.json({ error: 'Introuvable' }, 404);
  if (current.driverId !== user.id && !isStaff(user)) return c.json({ error: 'Accès refusé' }, 403);
  if (!Number.isInteger(body.seats_total) || body.seats_total < current.seatsTaken || body.seats_total > 8) {
    return c.json({ error: `Le trajet compte déjà ${current.seatsTaken} passager(s)` }, 409);
  }
  const [row] = await db.update(carpools).set({
    departureCity: body.departure_city.trim(), departureAt, seatsTotal: body.seats_total,
    costPerSeat: String(body.cost_per_seat ?? 0), notes: body.notes?.trim() || null,
  }).where(eq(carpools.id, carpoolId)).returning();
  return c.json(row);
});

app.delete('/:id', requireApproved, async (c) => {
  const user = c.get('user');
  const carpoolId = c.req.param('id') as `${string}-${string}-${string}-${string}-${string}`;
  const [current] = await db.select({ driverId: carpools.driverId }).from(carpools).where(eq(carpools.id, carpoolId));
  if (!current) return c.json({ error: 'Introuvable' }, 404);
  if (current.driverId !== user.id && !isStaff(user)) return c.json({ error: 'Accès refusé' }, 403);
  await db.delete(carpools).where(eq(carpools.id, carpoolId));
  return c.json({ ok: true });
});

// GET /api/carpools/mine — carpools as driver or passenger
app.get('/mine', requireApproved, async (c) => {
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
