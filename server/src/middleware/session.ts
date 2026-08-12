import { createMiddleware } from 'hono/factory';
import { auth, AuthUser } from '../auth';
import { canAccessMemberFeatures, isStaff } from '../lib/access';

type Env = { Variables: { user: AuthUser } };

export const requireSession = createMiddleware<Env>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return c.json({ error: 'Non authentifié' }, 401);
  c.set('user', session.user);
  await next();
});

export const requireCoach = createMiddleware<Env>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return c.json({ error: 'Non authentifié' }, 401);
  if (!isStaff(session.user)) {
    return c.json({ error: 'Accès refusé' }, 403);
  }
  c.set('user', session.user);
  await next();
});

export const requireApproved = createMiddleware<Env>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return c.json({ error: 'Non authentifié' }, 401);
  if (!canAccessMemberFeatures(session.user)) {
    return c.json({ error: 'Compte en attente de validation' }, 403);
  }
  c.set('user', session.user);
  await next();
});
