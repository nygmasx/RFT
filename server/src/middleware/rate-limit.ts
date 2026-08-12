import { createMiddleware } from 'hono/factory';

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(options: { limit: number; windowMs: number; prefix: string }) {
  return createMiddleware(async (c, next) => {
    const forwarded = c.req.header('fly-client-ip') ?? c.req.header('x-forwarded-for')?.split(',')[0]?.trim();
    const ip = forwarded ?? 'unknown';
    const key = `${options.prefix}:${ip}`;
    const now = Date.now();
    const current = buckets.get(key);
    const bucket = !current || current.resetAt <= now
      ? { count: 1, resetAt: now + options.windowMs }
      : { count: current.count + 1, resetAt: current.resetAt };
    buckets.set(key, bucket);

    c.header('RateLimit-Limit', String(options.limit));
    c.header('RateLimit-Remaining', String(Math.max(0, options.limit - bucket.count)));
    c.header('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > options.limit) {
      c.header('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      return c.json({ error: 'Trop de requêtes, réessaie dans quelques instants.' }, 429);
    }

    if (buckets.size > 10_000) {
      for (const [bucketKey, value] of buckets) {
        if (value.resetAt <= now) buckets.delete(bucketKey);
      }
    }
    await next();
  });
}
