import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/* ------------------------------------------------------------------ */
/* Better Auth tables (managed by the admin plugin schema)            */
/* These mirror what `@better-auth/cli generate` produces for sqlite. */
/* ------------------------------------------------------------------ */

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  // admin plugin fields
  role: text("role"),
  banned: integer("banned", { mode: "boolean" }),
  banReason: text("ban_reason"),
  banExpires: integer("ban_expires", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  // admin plugin field
  impersonatedBy: text("impersonated_by"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/* ------------------------------------------------------------------ */
/* App tables                                                          */
/* ------------------------------------------------------------------ */

/**
 * A participant in the secret santa. One per real person.
 * Linked to a Better Auth user once they sign up; `phone` kept for
 * WhatsApp delivery.
 */
export const participant = sqliteTable("participant", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  phone: text("phone"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type DeliveryMode = "reveal" | "wa_link" | "wa_direct";
export type DrawStatus = "draft" | "completed";

/**
 * A single secret-santa event/round. Holds budget + how results are
 * delivered. Multiple draws over time form the history used to avoid
 * repeating last year's pairing.
 */
export const draw = sqliteTable("draw", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  budget: integer("budget"),
  deliveryMode: text("delivery_mode").$type<DeliveryMode>().notNull().default("reveal"),
  // for `reveal` mode: max times a token may be viewed before it locks
  previewLimit: integer("preview_limit").notNull().default(3),
  status: text("status").$type<DrawStatus>().notNull().default("draft"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/**
 * One giver -> receiver pairing within a draw. `revealToken` is the
 * secret used by the public reveal page; `revealCount` enforces the
 * per-draw preview limit.
 */
export const assignment = sqliteTable("assignment", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  drawId: integer("draw_id")
    .notNull()
    .references(() => draw.id, { onDelete: "cascade" }),
  giverId: integer("giver_id")
    .notNull()
    .references(() => participant.id, { onDelete: "cascade" }),
  receiverId: integer("receiver_id")
    .notNull()
    .references(() => participant.id, { onDelete: "cascade" }),
  revealToken: text("reveal_token").notNull().unique(),
  revealCount: integer("reveal_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/**
 * A symmetric forbidden pair: giver `aId` will never draw `bId` and
 * vice-versa (e.g. couples, siblings).
 */
export const exclusion = sqliteTable("exclusion", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  aId: integer("a_id")
    .notNull()
    .references(() => participant.id, { onDelete: "cascade" }),
  bId: integer("b_id")
    .notNull()
    .references(() => participant.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/** A wishlist line owned by a participant, visible to their santa. */
export const wishlistItem = sqliteTable("wishlist_item", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  participantId: integer("participant_id")
    .notNull()
    .references(() => participant.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  url: text("url"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type User = typeof user.$inferSelect;
export type Participant = typeof participant.$inferSelect;
export type Draw = typeof draw.$inferSelect;
export type Assignment = typeof assignment.$inferSelect;
export type Exclusion = typeof exclusion.$inferSelect;
export type WishlistItem = typeof wishlistItem.$inferSelect;
