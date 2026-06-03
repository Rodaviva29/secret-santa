import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { badRequest } from "@/lib/api";
import { getOrCreateParticipant } from "@/lib/session";

export async function GET() {
  const participant = await getOrCreateParticipant();
  if (!participant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await db
    .select()
    .from(schema.wishlistItem)
    .where(eq(schema.wishlistItem.participantId, participant.id))
    .all();

  return NextResponse.json(items);
}

const createSchema = z.object({
  text: z.string().min(1),
  url: z.string().url().optional().nullable().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  const participant = await getOrCreateParticipant();
  if (!participant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Invalid wishlist item.");

  const row = await db
    .insert(schema.wishlistItem)
    .values({
      participantId: participant.id,
      text: parsed.data.text,
      url: parsed.data.url || null,
    })
    .returning()
    .get();

  return NextResponse.json(row, { status: 201 });
}
