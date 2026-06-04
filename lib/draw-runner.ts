import "server-only";
import { randomBytes } from "crypto";
import { desc, eq } from "drizzle-orm";
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

  // History soft-constraint: avoid pairings from the most recent
  // `historyDepth` other draws. 0 = disabled.
  let history: Array<[number, number]> = [];
  if (draw.historyDepth > 0) {
    const recentDraws = await db
      .select({ id: schema.draw.id })
      .from(schema.draw)
      .orderBy(desc(schema.draw.createdAt));
    const recentIds = new Set(
      recentDraws
        .filter((d) => d.id !== draw.id)
        .slice(0, draw.historyDepth)
        .map((d) => d.id),
    );
    if (recentIds.size > 0) {
      const assignments = await db.select().from(schema.assignment);
      history = assignments
        .filter((h) => recentIds.has(h.drawId))
        .map((h) => [h.giverId, h.receiverId] as [number, number]);
    }
  }

  const result = runDraw(
    participants.map((p) => p.id),
    exclusions.map((e) => [e.aId, e.bId] as [number, number]),
    history,
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

  // ---- WhatsApp (channel-gated) — sends the match's name directly ----
  if (draw.deliverWhatsapp && isWhatsAppConfigured()) {
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
        secondParam: receiver.name,
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

  // ---- Email (channel-gated) — names the match directly ----
  if (draw.deliverEmail && isEmailConfigured()) {
    const users = await db.select().from(schema.user);
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
        const receiver = byId.get(r.receiverId)!;
        const budgetLine =
          draw.budget != null ? ` The budget is ${draw.budget}.` : "";
        return {
          to,
          subject: `🎁 ${draw.name}: your secret santa match`,
          text: `Hi ${giver.name}! For "${draw.name}", your secret santa match is ${receiver.name}.${budgetLine}`,
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

  // ---- Web Push (channel-gated) — names the match directly ----
  if (draw.deliverPush && isPushConfigured()) {
    let sent = 0;
    let failed = 0;
    for (const r of rows) {
      const giver = byId.get(r.giverId)!;
      const receiver = byId.get(r.receiverId)!;
      if (!giver.userId) continue;
      const res = await pushToUsers([giver.userId], {
        title: `🎁 ${draw.name}`,
        body: `Your secret santa match is ${receiver.name}.`,
        url: "/dashboard",
      });
      sent += res.sent;
      failed += res.failed;
    }
    delivery.push = { sent, failed };
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
