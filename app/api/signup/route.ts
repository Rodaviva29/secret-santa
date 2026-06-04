import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { db, first, schema } from "@/lib/db";
import { auth } from "@/lib/auth";
import { digitsOnly } from "@/lib/phone";

const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const parsed = signupSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data." }, { status: 400 });
  }

  const { name, email, password, phone } = parsed.data;
  const normalizedPhone = digitsOnly(phone);

  if (!normalizedPhone) {
    return NextResponse.json(
      { error: "Invalid phone number." },
      { status: 400 },
    );
  }

  const participant = await first(
    db
      .select()
      .from(schema.participant)
      .where(
        and(
          eq(schema.participant.phone, normalizedPhone),
          isNull(schema.participant.userId),
        ),
      ),
  );

  if (!participant) {
    return NextResponse.json(
      {
        error:
          "Phone number not found. Check with the administrator that you were added.",
      },
      { status: 400 },
    );
  }

  // Create the user via better-auth (nextCookies plugin sets cookies automatically).
  let userId: string | undefined;
  try {
    const result = await auth.api.signUpEmail({
      body: { name, email, password },
    });
    userId = result?.user?.id;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Could not create account.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!userId) {
    return NextResponse.json({ error: "Could not create account." }, { status: 500 });
  }

  // Link the existing participant to the new user.
  await db
    .update(schema.participant)
    .set({ userId, name })
    .where(eq(schema.participant.id, participant.id));

  return NextResponse.json({ ok: true });
}
