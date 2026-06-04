import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, first, schema } from "@/lib/db";
import { badRequest, requireAdmin } from "@/lib/api";
import { DrawError } from "@/lib/draw";
import { executeDraw } from "@/lib/draw-runner";
import { isWhatsAppConfigured } from "@/lib/whatsapp";

export async function GET() {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;

  const draws = await db
    .select()
    .from(schema.draw)
    .orderBy(desc(schema.draw.createdAt));
  return NextResponse.json(draws);
}

const bodySchema = z.object({
  name: z.string().min(1),
  budget: z.number().int().nonnegative().nullable().optional(),
  // Delivery channels — any combination (reveal page always generated).
  deliverReveal: z.boolean().default(true),
  deliverWhatsapp: z.boolean().default(false),
  deliverEmail: z.boolean().default(false),
  deliverPush: z.boolean().default(false),
  previewLimit: z.number().int().positive().max(100).default(3),
  allowSelfDraw: z.boolean().default(false),
  // 0 = don't avoid previous pairings; N = avoid the last N draws.
  historyDepth: z.number().int().nonnegative().max(50).default(0),
  // ISO datetime string. When in the future the draw is created as a draft
  // and the scheduler runs it then; otherwise it runs immediately.
  scheduledAt: z.string().datetime().nullable().optional(),
  // ISO datetime string. When the pairs become public; null = never.
  pairsVisibleAt: z.string().datetime().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Invalid draw configuration.");
  const cfg = parsed.data;

  if (cfg.deliverWhatsapp && !isWhatsAppConfigured()) {
    return badRequest(
      "WhatsApp delivery selected but WA_API_TOKEN / WA_PHONE_NUMBER_ID / WA_TEMPLATE_NAME are not set.",
    );
  }

  const scheduledAt = cfg.scheduledAt ? new Date(cfg.scheduledAt) : null;
  const pairsVisibleAt = cfg.pairsVisibleAt ? new Date(cfg.pairsVisibleAt) : null;
  const isFuture = scheduledAt != null && scheduledAt.getTime() > Date.now();

  // Quick participant check up-front so scheduling a doomed draw fails fast.
  const participants = await db.select().from(schema.participant);
  if (participants.length < 2) {
    return badRequest("Need at least 2 participants to run a draw.");
  }

  // Always create the draw row first (status draft).
  const draw = (await first(
    db
      .insert(schema.draw)
      .values({
        name: cfg.name,
        budget: cfg.budget ?? null,
        deliverReveal: cfg.deliverReveal,
        deliverWhatsapp: cfg.deliverWhatsapp,
        deliverEmail: cfg.deliverEmail,
        deliverPush: cfg.deliverPush,
        previewLimit: cfg.previewLimit,
        allowSelfDraw: cfg.allowSelfDraw,
        historyDepth: cfg.historyDepth,
        status: "draft",
        scheduledAt,
        pairsVisibleAt,
      })
      .returning(),
  ))!;

  // Future-scheduled: leave as a draft for the in-process scheduler.
  if (isFuture) {
    return NextResponse.json(
      { draw, scheduled: true, scheduledAt: scheduledAt!.toISOString() },
      { status: 201 },
    );
  }

  // Run now.
  try {
    const result = await executeDraw(draw);
    return NextResponse.json(
      {
        draw: result.draw,
        assignments: result.assignments,
        delivery: result.delivery,
        revealLinks: cfg.deliverReveal ? result.revealLinks : undefined,
      },
      { status: 201 },
    );
  } catch (e) {
    // Roll back the empty draft so a failed draw doesn't litter history.
    await db.delete(schema.draw).where(eq(schema.draw.id, draw.id));
    if (e instanceof DrawError) return badRequest(e.message);
    throw e;
  }
}
