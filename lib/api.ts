import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/session";

/** 401 unless logged in; returns the user otherwise. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { user, response: null };
}

/** 403 unless admin. */
export async function requireAdmin() {
  const ok = await isAdmin();
  if (!ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
