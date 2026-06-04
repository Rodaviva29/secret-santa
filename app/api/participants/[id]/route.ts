import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db, first, schema } from "@/lib/db";
import { badRequest, requireAdmin } from "@/lib/api";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().trim().nullable().optional(),
  // Associate (or clear, with null) the participant with a user account.
  userId: z.string().min(1).nullable().optional(),
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

  // When linking to a user account, validate the user exists and isn't
  // already tied to a different participant (one participant per user).
  if (parsed.data.userId) {
    const userId = parsed.data.userId;
    const userExists = await first(
      db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.id, userId)),
    );
    if (!userExists) return badRequest("That user account does not exist.");

    const taken = await first(
      db
        .select({ id: schema.participant.id })
        .from(schema.participant)
        .where(
          and(
            eq(schema.participant.userId, userId),
            ne(schema.participant.id, id),
          ),
        ),
    );
    if (taken) {
      return badRequest("That account is already linked to another participant.");
    }
  }

  const updated = await first(
    db
      .update(schema.participant)
      .set({
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.phone !== undefined
          ? { phone: parsed.data.phone || null }
          : {}),
        ...(parsed.data.userId !== undefined
          ? { userId: parsed.data.userId }
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
