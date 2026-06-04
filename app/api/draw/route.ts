import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { z } from "zod";
import { db, first, schema } from "@/lib/db";
import { badRequest, requireAdmin } from "@/lib/api";
import { DrawError, runDraw } from "@/lib/draw";
import { isWhatsAppConfigured, sendBatch, type SendInput } from "@/lib/whatsapp";

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
  deliveryMode: z.enum(["reveal", "wa_link", "wa_direct"]),
  previewLimit: z.number().int().positive().max(100).default(3),
});

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000"
  );
}

export async function POST(req: NextRequest) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Invalid draw configuration.");
  const cfg = parsed.data;

  if (cfg.deliveryMode !== "reveal" && !isWhatsAppConfigured()) {
    return badRequest(
      "WhatsApp delivery selected but WA_API_TOKEN / WA_PHONE_NUMBER_ID / WA_TEMPLATE_NAME are not set.",
    );
  }

  const participants = await db.select().from(schema.participant);
  if (participants.length < 2) {
    return badRequest("Need at least 2 participants to run a draw.");
  }

  const exclusions = await db.select().from(schema.exclusion);
  const history = await db.select().from(schema.assignment);

  // Compute the assignment.
  let pairs: Map<number, number>;
  try {
    const result = runDraw(
      participants.map((p) => p.id),
      exclusions.map((e) => [e.aId, e.bId] as [number, number]),
      history.map((h) => [h.giverId, h.receiverId] as [number, number]),
    );
    pairs = result.pairs;
  } catch (e) {
    if (e instanceof DrawError) return badRequest(e.message);
    throw e;
  }

  // Persist draw + assignments.
  const draw = (await first(
    db
      .insert(schema.draw)
      .values({
        name: cfg.name,
        budget: cfg.budget ?? null,
        deliveryMode: cfg.deliveryMode,
        previewLimit: cfg.previewLimit,
        status: "completed",
      })
      .returning(),
  ))!;

  const byId = new Map(participants.map((p) => [p.id, p]));
  const rows = [...pairs.entries()].map(([giverId, receiverId]) => ({
    drawId: draw.id,
    giverId,
    receiverId,
    revealToken: randomBytes(24).toString("hex"),
  }));
  await db.insert(schema.assignment).values(rows);

  // Deliver.
  let delivery: { sent: number; failed: number; errors: string[] } | null =
    null;

  if (cfg.deliveryMode !== "reveal") {
    const base = appBaseUrl();
    const inputs: SendInput[] = [];
    const skipped: string[] = [];

    for (const r of rows) {
      const giver = byId.get(r.giverId)!;
      const receiver = byId.get(r.receiverId)!;
      if (!giver.phone) {
        skipped.push(`${giver.name} has no phone number`);
        continue;
      }
      inputs.push({
        to: giver.phone,
        giverName: giver.name,
        secondParam:
          cfg.deliveryMode === "wa_direct"
            ? receiver.name
            : `${base}/reveal/${r.revealToken}`,
      });
    }

    const results = await sendBatch(inputs);
    delivery = {
      sent: results.filter((x) => x.ok).length,
      failed: results.filter((x) => !x.ok).length + skipped.length,
      errors: [
        ...skipped,
        ...results.filter((x) => !x.ok).map((x) => `${x.to}: ${x.error}`),
      ],
    };
  }

  return NextResponse.json(
    {
      draw,
      assignments: rows.length,
      delivery,
      // For reveal mode the admin needs the links to share.
      revealLinks:
        cfg.deliveryMode === "reveal"
          ? rows.map((r) => ({
              giver: byId.get(r.giverId)!.name,
              url: `${appBaseUrl()}/reveal/${r.revealToken}`,
            }))
          : undefined,
    },
    { status: 201 },
  );
}
