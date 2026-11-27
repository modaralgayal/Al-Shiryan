import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { sql } from 'drizzle-orm';
import { createDb } from './client';
import { drugs } from './schema';

// The client's drug list (generated from their spreadsheet by scripts/xlsx_to_drugs.py).
interface DrugRow {
  name: string;
  form: string;
  strength: string;
  pack: string;
  molecule: string;
}
const DATA = join(dirname(fileURLToPath(import.meta.url)), 'data', 'drugs.json');
const BATCH = 1000;

/**
 * Idempotent. If the client catalogue is already loaded (rows with a `pack`),
 * does nothing. Otherwise it retires any legacy placeholder drugs (rows with no
 * `pack`) by SOFT-deleting them — row DELETE is blocked by the guardrail trigger,
 * and existing prescriptions keep resolving their drug name — then loads the list.
 */
async function main() {
  const { db, pool } = createDb();
  const rows: DrugRow[] = JSON.parse(readFileSync(DATA, 'utf8'));

  const loaded = await db.execute(
    sql`select 1 from drugs where pack is not null and deleted_at is null limit 1`,
  );
  if (loaded.rows.length > 0) {
    console.log('drug catalogue already loaded — skipping.');
    await pool.end();
    return;
  }

  await db.transaction(async (tx) => {
    const retired = await tx.execute(
      sql`update drugs set deleted_at = now() where pack is null and deleted_at is null`,
    );
    for (let i = 0; i < rows.length; i += BATCH) {
      await tx.insert(drugs).values(rows.slice(i, i + BATCH));
    }
    console.log(`retired ${retired.rowCount ?? 0} placeholder drugs; loaded ${rows.length} drugs`);
  });
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
