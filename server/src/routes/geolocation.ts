import { Hono } from 'hono';

import type { AuthUser } from '../auth';
import { calculateDrivingRoute, searchFrenchAddresses, validCoordinates } from '../lib/geolocation';
import { requireApproved } from '../middleware/session';

const app = new Hono<{ Variables: { user: AuthUser } }>();

app.get('/search', requireApproved, async (c) => {
  const query = c.req.query('q')?.trim() ?? '';
  if (query.length < 3 || query.length > 160) return c.json({ suggestions: [] });
  try {
    return c.json({ suggestions: await searchFrenchAddresses(query) });
  } catch {
    return c.json({ error: 'Le service d’adresses est momentanément indisponible.' }, 503);
  }
});

app.get('/route', requireApproved, async (c) => {
  const startLatitude = Number(c.req.query('startLatitude'));
  const startLongitude = Number(c.req.query('startLongitude'));
  const endLatitude = Number(c.req.query('endLatitude'));
  const endLongitude = Number(c.req.query('endLongitude'));
  if (!validCoordinates(startLatitude, startLongitude) || !validCoordinates(endLatitude, endLongitude)) {
    return c.json({ error: 'Coordonnées invalides.' }, 400);
  }
  try {
    return c.json(await calculateDrivingRoute(
      { latitude: startLatitude, longitude: startLongitude },
      { latitude: endLatitude, longitude: endLongitude },
    ));
  } catch {
    return c.json({ error: 'Le calcul d’itinéraire est momentanément indisponible.' }, 503);
  }
});

export { app as geolocationRouter };
