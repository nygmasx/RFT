import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db, sqlClient } from '../src/db/client';
import { users } from '../src/db/schema';
import { objectStorageConfigured, uploadAvatar } from '../src/lib/object-storage';

if (!objectStorageConfigured()) throw new Error('S3_* environment variables are required');
const rows = await db.select({ id: users.id, avatarUrl: users.avatarUrl }).from(users);
let migrated = 0;
for (const row of rows) {
  if (!row.avatarUrl?.startsWith('data:image/')) continue;
  const avatarUrl = await uploadAvatar(row.id, row.avatarUrl);
  await db.update(users).set({ avatarUrl, updatedAt: new Date() }).where(eq(users.id, row.id));
  migrated += 1;
}
console.log(JSON.stringify({ migrated }));
await sqlClient.end();
