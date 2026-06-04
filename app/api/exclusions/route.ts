import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, first, schema } from "@/lib/db";
import { badRequest, requireAdmin } from "@/lib/api";

export async function GET() {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;

  const rows = await db.select().from(schema.exclusion);
  return NextResponse.json(rows);
}

const createSchema = z.object({
  aId: z.number().int().positive(),
  bId: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Invalid exclusion data.");
  if (parsed.data.aId === parsed.data.bId) {
    return badRequest("An exclusion needs two different participants.");
  }

  const row = await first(
    db
      .insert(schema.exclusion)
      .values({ aId: parsed.data.aId, bId: parsed.data.bId })
      .returning(),
  );

  return NextResponse.json(row, { status: 201 });
}
