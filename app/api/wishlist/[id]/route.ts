import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { badRequest } from "@/lib/api";
import { getOrCreateParticipant } from "@/lib/session";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const participant = await getOrCreateParticipant();
  if (!participant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number((await params).id);
  if (Number.isNaN(id)) return badRequest("Invalid id.");

  // Owner-only: scope the delete to this participant's items.
  await db
    .delete(schema.wishlistItem)
    .where(
      and(
        eq(schema.wishlistItem.id, id),
        eq(schema.wishlistItem.participantId, participant.id),
      ),
    );

  return NextResponse.json({ ok: true });
}
