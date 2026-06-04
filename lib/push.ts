import "server-only";
import webpush from "web-push";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";

/**
 * Optional Web Push (PWA notifications). Config is env-driven:
 *   VAPID_PUBLIC_KEY   — also exposed to the client as
 *                        NEXT_PUBLIC_VAPID_PUBLIC_KEY
 *   VAPID_PRIVATE_KEY
 *   VAPID_SUBJECT      — "mailto:you@domain" (defaults to a placeholder)
 * Generate a key pair once with `npx web-push generate-vapid-keys`.
 * When unset, push is skipped (every call is config-gated).
 */

export function isPushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let configured = false;
function ensureVapid() {
  if (configured) return;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) throw new Error("Push not configured: set VAPID keys.");
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:admin@example.com",
    pub,
    priv,
  );
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Send a push to every subscription belonging to the given users. Dead
 * subscriptions (404/410) are pruned. No-op when push isn't configured.
 */
export async function pushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<{ sent: number; failed: number }> {
  if (!isPushConfigured() || userIds.length === 0) {
    return { sent: 0, failed: 0 };
  }
  ensureVapid();

  const subs = await db
    .select()
    .from(schema.pushSubscription)
    .where(inArray(schema.pushSubscription.userId, userIds));

  const data = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;
  const dead: number[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          data,
        );
        sent++;
      } catch (e) {
        failed++;
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) dead.push(s.id);
      }
    }),
  );

  if (dead.length > 0) {
    await db
      .delete(schema.pushSubscription)
      .where(inArray(schema.pushSubscription.id, dead));
  }

  return { sent, failed };
}

/** Remove a subscription by endpoint (on client unsubscribe). */
export async function removeSubscription(endpoint: string) {
  await db
    .delete(schema.pushSubscription)
    .where(eq(schema.pushSubscription.endpoint, endpoint));
}
