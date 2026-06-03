import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { badRequest } from "@/lib/api";
import { getOrCreateParticipant } from "@/lib/session";

const schemaBody = z.object({
  phone: z.string().trim().nullable().optional(),
});

export async function PUT(req: NextRequest) {
  const participant = await getOrCreateParticipant();
  if (!participant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schemaBody.safeParse(await req.json());
  if (!parsed.success) return badRequest("Invalid data.");

  const updated = await db
    .update(schema.participant)
    .set({ phone: parsed.data.phone || null })
    .where(eq(schema.participant.id, participant.id))
    .returning()
    .get();

  return NextResponse.json(updated);
}
