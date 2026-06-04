"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WishlistItem } from "@/lib/db/schema";

export function WishlistEditor({ initial }: { initial: WishlistItem[] }) {
  const [items, setItems] = useState(initial);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, url: url || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "Failed to add item.");
      return;
    }
    setItems([...items, await res.json()]);
    setText("");
    setUrl("");
  }

  async function remove(id: number) {
    const res = await fetch(`/api/wishlist/${id}`, { method: "DELETE" });
    if (res.ok) setItems(items.filter((i) => i.id !== id));
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {items.length === 0 && (
          <li className="text-sm text-muted-foreground">
            Nothing yet, add what you&apos;d like to receive.
          </li>
        )}
        {items.map((i) => (
          <li
            key={i.id}
            className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
          >
            <span>
              {i.url ? (
                <a href={i.url} target="_blank" rel="noreferrer" className="underline">
                  {i.text}
                </a>
              ) : (
                i.text
              )}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => remove(i.id)}
              aria-label="Remove"
            >
              <Trash2 className="text-destructive" />
            </Button>
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Item (e.g. a cozy scarf)"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Input
          placeholder="Link (optional)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Button type="submit" disabled={busy}>
          Add
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
