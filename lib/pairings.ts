import "server-only";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { Draw } from "@/lib/db/schema";

export interface PairLine {
  giver: string;
  receiver: string;
}

export interface DrawPairs {
  draw: Draw;
  pairs: PairLine[];
}

/** True when a draw's pairs should be public right now. */
export function pairsAreVisible(draw: Draw, at: Date = new Date()): boolean {
  return draw.pairsVisibleAt != null && draw.pairsVisibleAt.getTime() <= at.getTime();
}

async function pairsForDraws(draws: Draw[]): Promise<DrawPairs[]> {
  if (draws.length === 0) return [];
  const participants = await db.select().from(schema.participant);
  const nameById = new Map(participants.map((p) => [p.id, p.name]));

  const out: DrawPairs[] = [];
  for (const draw of draws) {
    const assignments = await db
      .select()
      .from(schema.assignment)
      .where(eq(schema.assignment.drawId, draw.id));
    out.push({
      draw,
      pairs: assignments.map((a) => ({
        giver: nameById.get(a.giverId) ?? `#${a.giverId}`,
        receiver: nameById.get(a.receiverId) ?? `#${a.receiverId}`,
      })),
    });
  }
  return out;
}

/**
 * Completed draws whose pairs are currently public (pairsVisibleAt has
 * passed), with giver→receiver names resolved. For everyone's dashboard.
 */
export async function getVisiblePairings(): Promise<DrawPairs[]> {
  const draws = await db
    .select()
    .from(schema.draw)
    .orderBy(desc(schema.draw.createdAt));
  const visible = draws.filter((d) => pairsAreVisible(d));
  return pairsForDraws(visible);
}

export interface MyMatch {
  drawId: number;
  drawName: string;
  date: Date;
  receiver: string;
  revealToken: string;
  deliveryMode: string;
}

/**
 * Every match where the given participant is the giver — their personal
 * draw history. Always visible to the participant themselves (it's their
 * own secret), independent of the public `pairsVisibleAt` reveal.
 */
export async function getMyMatchHistory(
  participantId: number,
): Promise<MyMatch[]> {
  const rows = await db
    .select({
      drawId: schema.draw.id,
      drawName: schema.draw.name,
      date: schema.draw.createdAt,
      executedAt: schema.draw.executedAt,
      receiverId: schema.assignment.receiverId,
      revealToken: schema.assignment.revealToken,
      deliveryMode: schema.draw.deliveryMode,
    })
    .from(schema.assignment)
    .innerJoin(schema.draw, eq(schema.assignment.drawId, schema.draw.id))
    .where(eq(schema.assignment.giverId, participantId))
    .orderBy(desc(schema.draw.createdAt));

  const participants = await db.select().from(schema.participant);
  const nameById = new Map(participants.map((p) => [p.id, p.name]));

  return rows.map((r) => ({
    drawId: r.drawId,
    drawName: r.drawName,
    date: r.executedAt ?? r.date,
    receiver: nameById.get(r.receiverId) ?? `#${r.receiverId}`,
    revealToken: r.revealToken,
    deliveryMode: r.deliveryMode,
  }));
}

/** All draws' pairs (admin history) with names resolved. */
export async function getAllPairings(): Promise<DrawPairs[]> {
  const draws = await db
    .select()
    .from(schema.draw)
    .orderBy(desc(schema.draw.createdAt));
  return pairsForDraws(draws);
}
