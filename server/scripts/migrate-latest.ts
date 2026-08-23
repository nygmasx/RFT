import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { sqlClient } from '../src/db/client';

const files = [
  '20260818_result_validation_rankings.sql',
  '20260818_chat_media_receipts.sql',
  '20260823_club_management.sql',
];

try {
  await sqlClient.unsafe(`CREATE TABLE IF NOT EXISTS app_migrations (
    name text PRIMARY KEY,
    applied_at timestamp NOT NULL DEFAULT now()
  )`);
  for (const file of files) {
    const [alreadyApplied] = await sqlClient<{ name: string }[]>`SELECT name FROM app_migrations WHERE name = ${file}`;
    if (alreadyApplied) {
      console.log(`Migration already applied: ${file}`);
      continue;
    }
    const url = new URL(`../migrations/${file}`, import.meta.url);
    const migration = (await readFile(fileURLToPath(url), 'utf8'))
      .replace(/^\s*BEGIN;\s*/i, '')
      .replace(/\s*COMMIT;\s*$/i, '');
    await sqlClient.begin(async (transaction) => {
      await transaction.unsafe(migration);
      await transaction`INSERT INTO app_migrations (name) VALUES (${file})`;
    });
    console.log(`Migration applied: ${file}`);
  }
} finally {
  await sqlClient.end();
}
