import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, first, schema } from "@/lib/db";
import { badRequest, requireAdmin } from "@/lib/api";

export async function GET() {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;

  const rows = await db.select().from(schema.participant);
  return NextResponse.json(rows);
}

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().trim().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Invalid participant data.");

  const row = await first(
    db
      .insert(schema.participant)
      .values({
        name: parsed.data.name,
        phone: parsed.data.phone || null,
      })
      .returning(),
  );

  return NextResponse.json(row, { status: 201 });
}
