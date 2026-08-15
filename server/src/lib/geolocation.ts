const GEOCODING_URL = 'https://data.geopf.fr/geocodage/search/';
const ROUTING_URL = 'https://data.geopf.fr/navigation/itineraire';

export type GeoPoint = {
  label: string;
  latitude: number;
  longitude: number;
  postcode?: string;
  city?: string;
};

export type RouteGeometry = {
  coordinates: { latitude: number; longitude: number }[];
  distanceKm: number;
  durationMinutes: number;
  bbox: number[] | null;
};

type GeoFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: { label?: string; postcode?: string; city?: string };
};

const searchCache = new Map<string, { expiresAt: number; value: GeoPoint[] }>();
const routeCache = new Map<string, { expiresAt: number; value: RouteGeometry }>();

export function validCoordinates(latitude: unknown, longitude: unknown): latitude is number {
  return typeof latitude === 'number' && Number.isFinite(latitude)
    && typeof longitude === 'number' && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

function trimCaches() {
  const now = Date.now();
  if (searchCache.size > 250) {
    for (const [key, entry] of searchCache) if (entry.expiresAt <= now) searchCache.delete(key);
  }
  if (routeCache.size > 250) {
    for (const [key, entry] of routeCache) if (entry.expiresAt <= now) routeCache.delete(key);
  }
}

export async function searchFrenchAddresses(query: string, limit = 6): Promise<GeoPoint[]> {
  const normalized = query.trim().replace(/\s+/g, ' ');
  if (normalized.length < 3) return [];
  const cacheKey = `${normalized.toLocaleLowerCase('fr-FR')}:${limit}`;
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const url = new URL(GEOCODING_URL);
  url.searchParams.set('q', normalized);
  url.searchParams.set('limit', String(Math.min(Math.max(limit, 1), 8)));
  const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
  if (!response.ok) throw new Error(`GEOCODING_${response.status}`);
  const payload = await response.json() as { features?: GeoFeature[] };
  const value = (payload.features ?? []).flatMap((feature) => {
    const coordinates = feature.geometry?.coordinates;
    const label = feature.properties?.label;
    if (!coordinates || !label || !validCoordinates(coordinates[1], coordinates[0])) return [];
    return [{
      label,
      longitude: coordinates[0],
      latitude: coordinates[1],
      postcode: feature.properties?.postcode,
      city: feature.properties?.city,
    }];
  });
  searchCache.set(cacheKey, { expiresAt: Date.now() + 10 * 60_000, value });
  trimCaches();
  return value;
}

export async function geocodeFrenchAddress(address: string): Promise<GeoPoint | null> {
  return (await searchFrenchAddresses(address, 1))[0] ?? null;
}

export async function calculateDrivingRoute(
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number },
): Promise<RouteGeometry> {
  const cacheKey = [start.longitude, start.latitude, end.longitude, end.latitude]
    .map((value) => value.toFixed(5)).join(':');
  const cached = routeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const url = new URL(ROUTING_URL);
  url.searchParams.set('resource', 'bdtopo-osrm');
  url.searchParams.set('start', `${start.longitude},${start.latitude}`);
  url.searchParams.set('end', `${end.longitude},${end.latitude}`);
  url.searchParams.set('profile', 'car');
  url.searchParams.set('optimization', 'fastest');
  url.searchParams.set('getBbox', 'true');
  url.searchParams.set('distanceUnit', 'kilometer');
  url.searchParams.set('timeUnit', 'minute');
  url.searchParams.set('crs', 'EPSG:4326');

  const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error(`ROUTING_${response.status}`);
  const payload = await response.json() as {
    distance?: number;
    duration?: number;
    bbox?: number[];
    geometry?: { coordinates?: [number, number][] };
  };
  const coordinates = (payload.geometry?.coordinates ?? []).flatMap(([longitude, latitude]) =>
    validCoordinates(latitude, longitude) ? [{ latitude, longitude }] : []);
  if (coordinates.length < 2) throw new Error('ROUTING_EMPTY');

  const value = {
    coordinates,
    distanceKm: Number(payload.distance ?? 0),
    durationMinutes: Number(payload.duration ?? 0),
    bbox: Array.isArray(payload.bbox) ? payload.bbox : null,
  };
  routeCache.set(cacheKey, { expiresAt: Date.now() + 24 * 60 * 60_000, value });
  trimCaches();
  return value;
}
