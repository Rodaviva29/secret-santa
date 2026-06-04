/**
 * Next.js instrumentation hook — runs once when the server process boots.
 * Used to start the in-process draw scheduler (only on the Node.js runtime,
 * never the Edge runtime or during build).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Don't start a poller during `next build`.
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { startScheduler } = await import("@/lib/scheduler");
  startScheduler();
}
