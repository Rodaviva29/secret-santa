import "server-only";
import { inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";

/**
 * Site / OpenGraph metadata, edited at runtime from the admin panel and
 * read by the root `generateMetadata`. Stored as key/value rows in
 * `app_setting`; missing keys fall back to {@link OG_DEFAULTS}.
 */
export interface OgSettings {
  title: string;
  description: string;
  /** favicon / app icon URL */
  icon: string;
  /** OpenGraph banner image URL */
  banner: string;
}

export const OG_DEFAULTS: OgSettings = {
  title: "WhatsApp Secret Santa",
  description:
    "Run a secret santa with exclusions, wishlists and WhatsApp delivery.",
  icon: "",
  banner: "",
};

export const OG_KEYS = Object.keys(OG_DEFAULTS) as Array<keyof OgSettings>;

const PREFIX = "og.";

/**
 * Read OG settings, merged over defaults. Resilient by design: returns
 * defaults if the DB is unreachable or the table doesn't exist yet. This
 * matters because the root `generateMetadata` calls it during static
 * prerender / `next build`, where DATABASE_URL may be absent or migrations
 * unapplied — it must never fail the build.
 */
export async function getOgSettings(): Promise<OgSettings> {
  const out: OgSettings = { ...OG_DEFAULTS };
  try {
    const rows = await db
      .select()
      .from(schema.appSetting)
      .where(inArray(schema.appSetting.key, OG_KEYS.map((k) => PREFIX + k)));

    for (const r of rows) {
      const k = r.key.slice(PREFIX.length) as keyof OgSettings;
      if (OG_KEYS.includes(k) && r.value != null) out[k] = r.value;
    }
  } catch {
    // Defaults are fine; the table may not exist yet (pre-migration build).
  }
  return out;
}

/** Upsert a partial set of OG settings. */
export async function setOgSettings(partial: Partial<OgSettings>) {
  const entries = Object.entries(partial).filter(([k]) =>
    OG_KEYS.includes(k as keyof OgSettings),
  );
  for (const [k, value] of entries) {
    await db
      .insert(schema.appSetting)
      .values({ key: PREFIX + k, value: value ?? "", updatedAt: new Date() })
      .onConflictDoUpdate({
        target: schema.appSetting.key,
        set: { value: value ?? "", updatedAt: new Date() },
      });
  }
}
