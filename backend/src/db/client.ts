import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export function createDb(connectionString: string = process.env.DATABASE_URL ?? '') {
  const pool = new Pool({ connectionString });
  return { pool, db: drizzle(pool, { schema }) };
}

const instance = createDb();
export const pool = instance.pool;
export const db = instance.db;
