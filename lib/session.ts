import "server-only";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import type { Participant } from "@/lib/db/schema";

/** Current Better Auth session, or null. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

export async function isAdmin() {
  const user = await getCurrentUser();
  return user?.role === "admin";
}

/**
 * The participant row linked to the current user, creating one lazily
 * the first time a logged-in user is seen. Keeps participant + auth in
 * sync without a separate onboarding step.
 */
export async function getOrCreateParticipant(): Promise<Participant | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const existing = await db
    .select()
    .from(schema.participant)
    .where(eq(schema.participant.userId, user.id))
    .get();
  if (existing) return existing;

  const inserted = await db
    .insert(schema.participant)
    .values({ userId: user.id, name: user.name, phone: null })
    .returning()
    .get();
  return inserted;
}
