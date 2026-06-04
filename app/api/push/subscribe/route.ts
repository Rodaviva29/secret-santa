import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { badRequest, requireUser } from "@/lib/api";
import { removeSubscription } from "@/lib/push";

const subSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});

export async function POST(req: NextRequest) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const parsed = subSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Invalid subscription.");
  const { endpoint, keys } = parsed.data;

  await db
    .insert(schema.pushSubscription)
    .values({ userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth })
    .onConflictDoUpdate({
      target: schema.pushSubscription.endpoint,
      set: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth },
    });

  return NextResponse.json({ ok: true });
}

const delSchema = z.object({ endpoint: z.string().url() });

export async function DELETE(req: NextRequest) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const parsed = delSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Invalid request.");

  await removeSubscription(parsed.data.endpoint);
  return NextResponse.json({ ok: true });
}
