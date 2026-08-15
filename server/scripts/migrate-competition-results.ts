import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { sqlClient } from '../src/db/client';

const migrationUrl = new URL('../migrations/20260815_competition_results.sql', import.meta.url);
const migration = await readFile(fileURLToPath(migrationUrl), 'utf8');
const statements = migration
  .replace(/^\s*BEGIN;\s*/i, '')
  .replace(/\s*COMMIT;\s*$/i, '');

try {
  await sqlClient.begin(async (transaction) => {
    await transaction.unsafe(statements);
  });
  console.log('Competition results migration applied.');
} finally {
  await sqlClient.end();
}
