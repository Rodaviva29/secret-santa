import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin as adminPlugin } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { count } from "drizzle-orm";
import { db, schema } from "@/lib/db";

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
        // Bootstrap an admin: the very first registered user, or anyone
        // matching ADMIN_EMAIL, is promoted to the `admin` role.
        async before(user) {
          const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
          const isFirstUser =
            (await db.select({ c: count() }).from(schema.user))[0]?.c === 0;
          const isAdmin =
            isFirstUser ||
            (!!adminEmail && user.email.toLowerCase() === adminEmail);
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
