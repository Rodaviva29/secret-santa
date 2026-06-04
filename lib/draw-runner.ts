import "server-only";
import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { Draw, Participant } from "@/lib/db/schema";
import { DrawError, runDraw } from "@/lib/draw";
import { isWhatsAppConfigured, sendBatch, type SendInput } from "@/lib/whatsapp";
import { isEmailConfigured, sendEmailBatch } from "@/lib/email";
import { isPushConfigured, pushToUsers } from "@/lib/push";

export interface DeliverySummary {
  whatsapp: { sent: number; failed: number; errors: string[] } | null;
  email: { sent: number; failed: number } | null;
  push: { sent: number; failed: number } | null;
}

export interface ExecuteResult {
  draw: Draw;
  assignments: number;
  delivery: DeliverySummary;
  /** reveal links keyed by giver name (handy for reveal-mode admins) */
  revealLinks: { giver: string; url: string }[];
}

export function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000"
  );
}

/**
 * Execute an existing draft draw: compute the assignment, persist the
 * pairings, deliver via the draw's delivery mode (+ optional email/push),
 * and mark the draw executed. Shared by the admin route (immediate) and
 * the scheduler (due draws). Throws {@link DrawError} on infeasible draws.
 */
export async function executeDraw(draw: Draw): Promise<ExecuteResult> {
  const participants = await db.select().from(schema.participant);
  if (participants.length < 2) {
    throw new DrawError("Need at least 2 participants to run a draw.");
  }

  const exclusions = await db.select().from(schema.exclusion);
  // History = assignments from *other* draws (avoid repeating last time).
  const history = await db.select().from(schema.assignment);

  const result = runDraw(
    participants.map((p) => p.id),
    exclusions.map((e) => [e.aId, e.bId] as [number, number]),
    history
      .filter((h) => h.drawId !== draw.id)
      .map((h) => [h.giverId, h.receiverId] as [number, number]),
    { allowSelfDraw: draw.allowSelfDraw },
  );

  const byId = new Map(participants.map((p) => [p.id, p]));
  const rows = [...result.pairs.entries()].map(([giverId, receiverId]) => ({
    drawId: draw.id,
    giverId,
    receiverId,
    revealToken: randomBytes(24).toString("hex"),
  }));
  await db.insert(schema.assignment).values(rows);

  const base = appBaseUrl();
  const delivery: DeliverySummary = { whatsapp: null, email: null, push: null };

  // ---- WhatsApp (only for wa_* delivery modes) ----
  if (draw.deliveryMode !== "reveal" && isWhatsAppConfigured()) {
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
          draw.deliveryMode === "wa_direct"
            ? receiver.name
            : `${base}/reveal/${r.revealToken}`,
      });
    }
    const results = await sendBatch(inputs);
    delivery.whatsapp = {
      sent: results.filter((x) => x.ok).length,
      failed: results.filter((x) => !x.ok).length + skipped.length,
      errors: [
        ...skipped,
        ...results.filter((x) => !x.ok).map((x) => `${x.to}: ${x.error}`),
      ],
    };
  }

  // ---- Email notification (config-gated, all modes) ----
  if (isEmailConfigured()) {
    const userIds = [...new Set(participants.map((p) => p.userId).filter(Boolean))] as string[];
    const users = userIds.length
      ? await db.select().from(schema.user)
      : [];
    const emailByParticipant = new Map<number, string>();
    for (const p of participants) {
      if (!p.userId) continue;
      const u = users.find((x) => x.id === p.userId);
      if (u?.email) emailByParticipant.set(p.id, u.email);
    }
    const emails = rows
      .map((r) => {
        const to = emailByParticipant.get(r.giverId);
        if (!to) return null;
        const giver = byId.get(r.giverId)!;
        return {
          to,
          subject: `🎁 ${draw.name}: your secret santa is ready`,
          text: `Hi ${giver.name}! Your secret santa match for "${draw.name}" is ready. Open your private link to see who you got: ${base}/reveal/${r.revealToken}`,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    if (emails.length) {
      const res = await sendEmailBatch(emails);
      delivery.email = {
        sent: res.filter((x) => x.ok).length,
        failed: res.filter((x) => !x.ok).length,
      };
    }
  }

  // ---- Web Push (config-gated, all modes) ----
  if (isPushConfigured()) {
    const giverUserIds = rows
      .map((r) => byId.get(r.giverId)?.userId)
      .filter((x): x is string => !!x);
    if (giverUserIds.length) {
      delivery.push = await pushToUsers(giverUserIds, {
        title: `🎁 ${draw.name}`,
        body: "Your secret santa match is ready — tap to reveal.",
        url: "/dashboard",
      });
    }
  }

  // Mark executed + completed.
  const [updated] = await db
    .update(schema.draw)
    .set({ status: "completed", executedAt: new Date() })
    .where(eq(schema.draw.id, draw.id))
    .returning();

  return {
    draw: updated,
    assignments: rows.length,
    delivery,
    revealLinks: rows.map((r) => ({
      giver: byId.get(r.giverId)!.name,
      url: `${base}/reveal/${r.revealToken}`,
    })),
  };
}
