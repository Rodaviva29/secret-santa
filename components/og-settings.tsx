"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { OgSettings } from "@/lib/settings";

export function OgSettingsForm({ initial }: { initial: OgSettings }) {
  const router = useRouter();
  const [form, setForm] = useState<OgSettings>(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof OgSettings>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    setError(null);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
    } else {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Could not save settings.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>OpenGraph / site metadata</CardTitle>
        <CardDescription>
          Controls the title, description, icon and link-preview banner used
          across the site and when sharing links.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="WhatsApp Secret Santa"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Run a secret santa with…"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Icon URL</Label>
            <Input
              type="url"
              value={form.icon}
              onChange={(e) => set("icon", e.target.value)}
              placeholder="https://example.com/icon.png"
            />
            {form.icon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.icon}
                alt="icon preview"
                className="size-10 rounded border object-contain"
              />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Banner URL (link preview image)</Label>
            <Input
              type="url"
              value={form.banner}
              onChange={(e) => set("banner", e.target.value)}
              placeholder="https://example.com/banner.png"
            />
            {form.banner && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.banner}
                alt="banner preview"
                className="aspect-[1.91/1] w-full max-w-sm rounded border object-cover"
              />
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={busy}>
            {saved ? "Saved ✓" : busy ? "Saving…" : "Save metadata"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
