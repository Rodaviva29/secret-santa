import "server-only";
import { and, eq, isNotNull, isNull, lte } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { executeDraw } from "@/lib/draw-runner";

const POLL_MS = 60_000;

const globalForScheduler = globalThis as unknown as {
  __drawSchedulerStarted?: boolean;
};

/** Find every draft draw whose scheduled time has passed and run it. */
export async function runDueDraws(): Promise<number> {
  const due = await db
    .select()
    .from(schema.draw)
    .where(
      and(
        eq(schema.draw.status, "draft"),
        isNull(schema.draw.executedAt),
        isNotNull(schema.draw.scheduledAt),
        lte(schema.draw.scheduledAt, new Date()),
      ),
    );

  let ran = 0;
  for (const draw of due) {
    try {
      await executeDraw(draw);
      ran++;
      console.log(`[scheduler] executed draw #${draw.id} "${draw.name}"`);
    } catch (e) {
      // Leave the draft in place; it retries on the next tick. Surface the
      // error so a permanently-infeasible draw is visible in the logs.
      console.error(`[scheduler] draw #${draw.id} failed:`, e);
    }
  }
  return ran;
}

/**
 * Start the in-process poller. Idempotent across hot-reloads / repeated
 * imports via a global flag. Called from `instrumentation.ts` on boot.
 */
export function startScheduler() {
  if (globalForScheduler.__drawSchedulerStarted) return;
  globalForScheduler.__drawSchedulerStarted = true;

  console.log(`[scheduler] started (every ${POLL_MS / 1000}s)`);
  // Run once shortly after boot, then on the interval.
  setTimeout(() => void runDueDraws().catch(() => {}), 5_000);
  const timer = setInterval(() => void runDueDraws().catch(() => {}), POLL_MS);
  // Don't keep the process alive solely for the timer.
  if (typeof timer.unref === "function") timer.unref();
}
