import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, first, schema } from "@/lib/db";
import { badRequest, requireAdmin } from "@/lib/api";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().trim().nullable().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;

  const id = Number((await params).id);
  if (Number.isNaN(id)) return badRequest("Invalid id.");

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Invalid data.");

  const updated = await first(
    db
      .update(schema.participant)
      .set({
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.phone !== undefined
          ? { phone: parsed.data.phone || null }
          : {}),
      })
      .where(eq(schema.participant.id, id))
      .returning(),
  );

  if (!updated) return badRequest("Participant not found.");
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;

  const id = Number((await params).id);
  if (Number.isNaN(id)) return badRequest("Invalid id.");

  await db.delete(schema.participant).where(eq(schema.participant.id, id));
  return NextResponse.json({ ok: true });
}
