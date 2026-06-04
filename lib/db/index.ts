import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// A connection string is required at runtime. During `next build` it may
// be absent (env is injected at deploy time) — pages are dynamic so no
// query runs at build, but the module still gets imported. Fall back to a
// placeholder so import never throws; the pool only dials on first query.
const connectionString =
  process.env.DATABASE_URL ?? "postgresql://invalid:invalid@127.0.0.1:1/none";

if (!process.env.DATABASE_URL && process.env.NODE_ENV === "production") {
  console.warn(
    "[db] DATABASE_URL is not set — queries will fail until it is provided.",
  );
}

// Reuse the pool across hot-reloads in dev to avoid exhausting connections.
const globalForDb = globalThis as unknown as { __pgPool?: Pool };
const pool = globalForDb.__pgPool ?? new Pool({ connectionString, max: 10 });
if (process.env.NODE_ENV !== "production") globalForDb.__pgPool = pool;

export const db = drizzle(pool, { schema });
export { schema };

/**
 * node-postgres queries resolve to arrays (unlike better-sqlite3's
 * `.get()`/`.all()`); this returns the first row or undefined.
 */
export async function first<T>(query: Promise<T[]>): Promise<T | undefined> {
  return (await query)[0];
}
