import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Better Auth tables (managed by the admin plugin schema)            */
/* These mirror what `@better-auth/cli generate` produces for pg.     */
/* ------------------------------------------------------------------ */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // admin plugin fields
  role: text("role"),
  banned: boolean("banned"),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  // admin plugin field
  impersonatedBy: text("impersonated_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* App tables                                                          */
/* ------------------------------------------------------------------ */

/**
 * A participant in the secret santa. One per real person.
 * Linked to a Better Auth user once they sign up; `phone` kept for
 * WhatsApp delivery.
 */
export const participant = pgTable("participant", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  phone: text("phone"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type DeliveryMode = "reveal" | "wa_link" | "wa_direct";
export type DrawStatus = "draft" | "completed";

/**
 * A single secret-santa event/round. Holds budget + how results are
 * delivered. Multiple draws over time form the history used to avoid
 * repeating last year's pairing.
 */
export const draw = pgTable("draw", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  budget: integer("budget"),
  // Legacy single delivery mode. Superseded by the per-channel booleans
  // below; kept for back-compat / existing rows.
  deliveryMode: text("delivery_mode")
    .$type<DeliveryMode>()
    .notNull()
    .default("reveal"),
  // Delivery channels — any combination. The private reveal page/token is
  // always generated; `deliverReveal` only controls whether participants
  // are pointed at the shareable reveal link. WhatsApp/email/push each send
  // the match's name directly when enabled.
  deliverReveal: boolean("deliver_reveal").notNull().default(true),
  deliverWhatsapp: boolean("deliver_whatsapp").notNull().default(false),
  deliverEmail: boolean("deliver_email").notNull().default(false),
  deliverPush: boolean("deliver_push").notNull().default(false),
  // for the reveal page: max times a token may be viewed before it locks
  previewLimit: integer("preview_limit").notNull().default(3),
  // when true, a participant may be assigned to give a gift to themselves
  // (self-draw). Off by default — normal secret santa is a derangement.
  allowSelfDraw: boolean("allow_self_draw").notNull().default(false),
  // How many previous draws to avoid repeating pairings from (soft
  // constraint). 0 = disabled (default), 1 = last draw, 2 = last two, etc.
  historyDepth: integer("history_depth").notNull().default(0),
  status: text("status").$type<DrawStatus>().notNull().default("draft"),
  // If set and the draw is still a draft, the in-process scheduler runs +
  // delivers the draw automatically at/after this time. Null = run now.
  scheduledAt: timestamp("scheduled_at"),
  // Set when the draw was actually executed (pairs assigned + delivered).
  executedAt: timestamp("executed_at"),
  // When the giver->receiver pairs become public (admin history + every
  // participant's dashboard). Null = never reveal the full list.
  pairsVisibleAt: timestamp("pairs_visible_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * One giver -> receiver pairing within a draw. `revealToken` is the
 * secret used by the public reveal page; `revealCount` enforces the
 * per-draw preview limit.
 */
export const assignment = pgTable("assignment", {
  id: serial("id").primaryKey(),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * A symmetric forbidden pair: giver `aId` will never draw `bId` and
 * vice-versa (e.g. couples, siblings).
 */
export const exclusion = pgTable("exclusion", {
  id: serial("id").primaryKey(),
  aId: integer("a_id")
    .notNull()
    .references(() => participant.id, { onDelete: "cascade" }),
  bId: integer("b_id")
    .notNull()
    .references(() => participant.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** A wishlist line owned by a participant, visible to their santa. */
export const wishlistItem = pgTable("wishlist_item", {
  id: serial("id").primaryKey(),
  participantId: integer("participant_id")
    .notNull()
    .references(() => participant.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  url: text("url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * A Web Push subscription (PWA notifications) owned by a user. One user
 * may have several (multiple devices/browsers). `endpoint` is unique.
 */
export const pushSubscription = pgTable("push_subscription", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Generic key/value app settings, edited at runtime from the admin panel.
 * Currently holds OpenGraph / site metadata (title, description, icon,
 * banner). One row per key.
 */
export const appSetting = pgTable("app_setting", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type User = typeof user.$inferSelect;
export type Participant = typeof participant.$inferSelect;
export type Draw = typeof draw.$inferSelect;
export type Assignment = typeof assignment.$inferSelect;
export type Exclusion = typeof exclusion.$inferSelect;
export type WishlistItem = typeof wishlistItem.$inferSelect;
export type AppSetting = typeof appSetting.$inferSelect;
export type PushSubscription = typeof pushSubscription.$inferSelect;
