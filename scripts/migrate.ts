/**
 * Apply pending Drizzle migrations against Postgres.
 *
 * Used both locally (`npm run db:migrate`) and by the Docker image's
 * start command (`node dist-migrate.cjs && node server.js`), so deploys
 * need no manual migration step. Uses drizzle-orm's runtime migrator (no
 * drizzle-kit at runtime); it only needs the SQL files in ./drizzle and
 * DATABASE_URL.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const db = drizzle(pool);

migrate(db, { migrationsFolder: "./drizzle" })
  .then(() => {
    console.log("Migrations applied.");
  })
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
