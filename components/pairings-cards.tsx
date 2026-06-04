"use client";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DrawPairs } from "@/lib/pairings";

/**
 * Clickable list of draws; tapping one opens a modal with that draw's full
 * giver→receiver pairing list. Used on the dashboard ("Pairings revealed").
 */
export function PairingsCards({ pairings }: { pairings: DrawPairs[] }) {
  const [openId, setOpenId] = useState<number | null>(null);
  const active = pairings.find((p) => p.draw.id === openId) ?? null;

  return (
    <>
      <ul className="space-y-2 text-sm">
        {pairings.map(({ draw, pairs }) => (
          <li key={draw.id}>
            <button
              type="button"
              onClick={() => setOpenId(draw.id)}
              className="flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left hover:bg-accent"
            >
              <span>
                <span className="font-medium">{draw.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {pairs.length} pairs ·{" "}
                  {new Date(draw.executedAt ?? draw.createdAt).toLocaleDateString()}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={openId !== null} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent>
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>{active.draw.name}</DialogTitle>
              </DialogHeader>
              <ul className="space-y-1 text-sm">
                {active.pairs.map((p, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 rounded-md border px-3 py-1.5"
                  >
                    <span className="font-medium">{p.giver}</span>
                    <span className="text-muted-foreground">→</span>
                    <span>{p.receiver}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
