"use client";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DIAL_CODES,
  dialCodeInfo,
  digitsOnly,
  joinPhone,
  splitPhone,
} from "@/lib/phone";

/** Flag size shared by the trigger + list rows. */
const FLAG_CLS = "fi rounded-[2px] !h-4 !w-[1.333rem] shrink-0";

/** Small SVG flag for a dial code, or a neutral globe placeholder. */
function CodeFlag({ code }: { code: string }) {
  const info = dialCodeInfo(code);
  if (!info) {
    return <span className="text-muted-foreground">🌐</span>;
  }
  return <span className={`${FLAG_CLS} fi-${info.iso2}`} aria-hidden />;
}

export function PhoneEditor({
  participantId,
  initialPhone,
}: {
  participantId: number;
  initialPhone: string | null;
}) {
  const parsed = splitPhone(initialPhone);
  const [code, setCode] = useState(parsed.code);
  const [number, setNumber] = useState(parsed.number);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stored value: dial code immediately followed by the local number.
  const phone = number ? joinPhone(code, number) : "";

  // Filter the country list by name or numeric code as the user types.
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DIAL_CODES;
    const qDigits = digitsOnly(q);
    return DIAL_CODES.filter(
      (d) =>
        d.label.toLowerCase().includes(q) ||
        (qDigits && d.code.startsWith(qDigits)),
    );
  }, [query]);

  function pick(c: string) {
    setCode(c);
    setQuery("");
    setOpen(false);
    setSaved(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    const res = await fetch(`/api/me`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phone || null }),
    });
    setBusy(false);
    if (res.ok) setSaved(true);
    void participantId;
  }

  return (
    <form onSubmit={save} className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        {/* Dial-code combobox: free-type the code, or pick from the list. */}
        <div className="relative sm:w-44">
          <div className="flex h-9 items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-within:ring-1 focus-within:ring-ring">
            <CodeFlag code={code} />
            <span className="text-muted-foreground">+</span>
            <input
              type="text"
              inputMode="numeric"
              aria-label="Country dial code"
              className="w-full bg-transparent outline-none"
              value={code}
              onChange={(e) => {
                const c = digitsOnly(e.target.value);
                setCode(c);
                setQuery(c);
                setOpen(true);
                setSaved(false);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => {
                // Delay so a click on a suggestion still registers.
                blurTimer.current = setTimeout(() => setOpen(false), 150);
              }}
            />
          </div>

          {open && matches.length > 0 && (
            <ul
              className="absolute z-50 mt-1 max-h-60 w-64 overflow-auto rounded-md border bg-popover p-1 text-sm shadow-md"
              onMouseDown={() => {
                // Prevent the input blur from firing before the click.
                if (blurTimer.current) clearTimeout(blurTimer.current);
              }}
            >
              {matches.map((d) => (
                <li key={`${d.iso2}-${d.code}`}>
                  <button
                    type="button"
                    onClick={() => pick(d.code)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-accent",
                      d.code === code && "bg-accent",
                    )}
                  >
                    <span className={`${FLAG_CLS} fi-${d.iso2}`} aria-hidden />
                    <span className="flex-1 truncate">{d.label}</span>
                    <span className="text-muted-foreground">+{d.code}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex-1">
          <Input
            inputMode="numeric"
            placeholder="912345678"
            value={number}
            onChange={(e) => {
              setNumber(digitsOnly(e.target.value));
              setSaved(false);
            }}
          />
        </div>
        <Button type="submit" disabled={busy}>
          {saved ? "Saved ✓" : "Save phone"}
        </Button>
      </div>
      {phone && (
        <p className="text-xs text-muted-foreground">
          Will be saved as <span className="font-medium">+{phone}</span>
        </p>
      )}
    </form>
  );
}
