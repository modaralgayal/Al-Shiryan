import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'src/db/migrations');

/**
 * Statements that are NEVER allowed in a normal (non-danger) migration.
 * DROP TRIGGER / DROP FUNCTION are intentionally allowed — they are used for
 * the idempotent BEFORE DELETE guard trigger setup.
 */
const BLOCKED = [
  /\bDROP\s+(TABLE|COLUMN|TYPE|SCHEMA|ROLE|DATABASE)\b/i,
  /\bDELETE\s+FROM\b/i,
  /\bTRUNCATE\b/i,
  /\bRENAME\b/i,
  /\bALTER\b[^;]*\bDROP\b/i,
];

/** Remove SQL comments before scanning, so keywords inside comments never trip the guard. */
function stripComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ');
}

export interface MigrateOptions {
  danger?: boolean;
}

/**
 * Applies pending SQL migrations in filename order. In normal mode it refuses
 * any migration containing a destructive statement. The `db:danger` command
 * flips `danger`, but only after separate gates in migrate.ts (env flags +
 * confirmation phrase + prod token) are satisfied — there is no `-force`
 * shortcut that bypasses the guard.
 */
export async function runMigrations(opts: MigrateOptions = {}): Promise<string[]> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const applied: string[] = [];
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS _aorta_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`
    );
    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      const done = await pool.query('SELECT 1 FROM _aorta_migrations WHERE name=$1', [file]);
      if ((done.rowCount ?? 0) > 0) continue;
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      if (!opts.danger) {
        const scanned = stripComments(sql);
        const hit = BLOCKED.find((re) => re.test(scanned));
        if (hit) {
          throw new Error(
            `[GUARD] Migration "${file}" was BLOCKED: matches a destructive pattern (${hit}).\n` +
              `If this is intentional, run: pnpm db:danger (requires ALLOW_DESTRUCTIVE_MIGRATIONS=1, a confirmation phrase, and a prod token in production).`
          );
        }
      }
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO _aorta_migrations(name) VALUES($1)', [file]);
        await client.query('COMMIT');
        applied.push(file);
        console.log(`✓ applied ${file}`);
      } catch (e) {
        await client.query('ROLLBACK');
        console.error(`✗ failed ${file}`);
        throw e;
      } finally {
        client.release();
      }
    }
    if (applied.length === 0) console.log('No pending migrations.');
    return applied;
  } finally {
    await pool.end();
  }
}
