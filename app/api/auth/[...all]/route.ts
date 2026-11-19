import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const handlers = toNextJsHandler(auth);

export const GET = handlers.GET;

// Account creation must go through /api/signup, which enforces the
// participant phone check. Better Auth's own sign-up endpoint would let
// anyone register (and, on a fresh install, become admin), so it is closed
// here. Server-side `auth.api.signUpEmail` is unaffected.
export async function POST(req: NextRequest) {
  const path = req.nextUrl.pathname.replace(/\/+$/, "").toLowerCase();
  if (path.includes("/sign-up")) {
    return NextResponse.json(
      { error: "Sign-up is not available on this endpoint." },
      { status: 403 },
    );
  }
  return handlers.POST(req);
}
