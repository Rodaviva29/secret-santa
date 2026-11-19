import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin as adminPlugin } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { count } from "drizzle-orm";
import { db, schema } from "@/lib/db";

/**
 * Admin bootstrap rule. If ADMIN_EMAIL is set, only that address is an
 * admin; otherwise the very first registered user is. (With ADMIN_EMAIL set,
 * "first user wins" is disabled so a stranger reaching a fresh install can't
 * claim the admin role.) Shared by the user-create hook (role) and the
 * signup route (which lets a bootstrap admin register without having been
 * added as a participant first).
 */
export async function isBootstrapAdmin(email: string): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (adminEmail) return email.trim().toLowerCase() === adminEmail;
  const users = (await db.select({ c: count() }).from(schema.user))[0]?.c ?? 0;
  return users === 0;
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    // No email server wired up; treat addresses as verified on signup so
    // participants can log in immediately.
    requireEmailVerification: false,
  },
  databaseHooks: {
    user: {
      create: {
        // Bootstrap an admin — see isBootstrapAdmin.
        async before(user) {
          const isAdmin = await isBootstrapAdmin(user.email);
          return { data: { ...user, role: isAdmin ? "admin" : "user" } };
        },
      },
    },
  },
  plugins: [
    adminPlugin(),
    // Must be last: lets server actions/route handlers set auth cookies.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
