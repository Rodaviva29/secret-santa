import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, requireAdmin } from "@/lib/api";
import { getOgSettings, setOgSettings } from "@/lib/settings";

export async function GET() {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  return NextResponse.json(await getOgSettings());
}

// All optional URLs may be empty strings to clear them.
const urlOrEmpty = z.union([z.literal(""), z.string().url()]);

const bodySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  icon: urlOrEmpty.optional(),
  banner: urlOrEmpty.optional(),
});

export async function PUT(req: NextRequest) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid settings — icon and banner must be valid URLs.");
  }

  await setOgSettings(parsed.data);
  return NextResponse.json(await getOgSettings());
}
