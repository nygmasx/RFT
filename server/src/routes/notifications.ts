import { and, desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';

import type { AuthUser } from '../auth';
import { db } from '../db/client';
import { notifications } from '../db/schema';
import { requireApproved } from '../middleware/session';

const app = new Hono<{ Variables: { user: AuthUser } }>();

function dto(row: typeof notifications.$inferSelect) {
  let data: Record<string, string> | null = null;
  if (row.data) {
    try { data = JSON.parse(row.data); } catch { data = null; }
  }
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    data,
    isRead: Boolean(row.readAt),
    createdAt: row.createdAt,
  };
}

app.get('/', requireApproved, async (c) => {
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, c.get('user').id))
    .orderBy(desc(notifications.createdAt))
    .limit(200);
  return c.json(rows.map(dto));
});

app.post('/read-all', requireApproved, async (c) => {
  await db.update(notifications)
    .set({ readAt: new Date() })
    .where(eq(notifications.userId, c.get('user').id));
  return c.json({ ok: true });
});

app.put('/:id/read', requireApproved, async (c) => {
  await db.update(notifications)
    .set({ readAt: new Date() })
    .where(and(
      eq(notifications.id, c.req.param('id') as `${string}-${string}-${string}-${string}-${string}`),
      eq(notifications.userId, c.get('user').id),
    ));
  return c.json({ ok: true });
});

app.delete('/:id', requireApproved, async (c) => {
  await db.delete(notifications)
    .where(and(
      eq(notifications.id, c.req.param('id') as `${string}-${string}-${string}-${string}-${string}`),
      eq(notifications.userId, c.get('user').id),
    ));
  return c.json({ ok: true });
});

export { app as notificationsRouter };
