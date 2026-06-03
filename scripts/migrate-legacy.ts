/**
 * One-off: import participants from the legacy Express JSON store
 * (data/users.json) into the new SQLite DB. Run once after migrating:
 *
 *   npm run migrate:legacy
 *
 * The old admin.json is intentionally ignored — admins are now created
 * via Better Auth signup (first user / ADMIN_EMAIL is promoted).
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import * as schema from "../lib/db/schema";

interface LegacyUser {
  username: string;
  phone?: string;
}

const url = (process.env.DATABASE_URL ?? "file:./sqlite.db").replace(/^file:/, "");
const sqlite = new Database(url);
const db = drizzle(sqlite, { schema });

const legacyPath = resolve(process.cwd(), "data/users.json");

let legacy: LegacyUser[];
try {
  legacy = JSON.parse(readFileSync(legacyPath, "utf8"));
} catch {
  console.log(`No legacy file at ${legacyPath} — nothing to migrate.`);
  process.exit(0);
}

let added = 0;
for (const u of legacy) {
  if (!u.username) continue;
  const exists = db
    .select()
    .from(schema.participant)
    .where(eq(schema.participant.name, u.username))
    .get();
  if (exists) continue;
  db.insert(schema.participant)
    .values({ name: u.username, phone: u.phone ?? null })
    .run();
  added++;
}

console.log(`Migrated ${added} participant(s) from legacy data/users.json.`);
