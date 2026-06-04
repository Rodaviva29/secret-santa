"use client";
import { useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DIAL_CODES,
  dialCodeInfo,
  digitsOnly,
  formatPhone,
  joinPhone,
  splitPhone,
} from "@/lib/phone";

const FLAG_CLS = "fi rounded-[2px] !h-4 !w-[1.333rem] shrink-0";

function CodeFlag({ code }: { code: string }) {
  const info = dialCodeInfo(code);
  if (!info) return <span className="text-muted-foreground">🌐</span>;
  return <span className={`${FLAG_CLS} fi-${info.iso2}`} aria-hidden />;
}

/**
 * Controlled phone picker (dial-code selector + local number input).
 * `value` and `onChange` use the stored format: digits only, e.g. "351912345678".
 */
export function PhoneInput({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (stored: string) => void;
  required?: boolean;
}) {
  const parsed = splitPhone(value);
  const [code, setCode] = useState(parsed.code);
  const [number, setNumber] = useState(parsed.number);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stored = number ? joinPhone(code, number) : "";

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
    const next = joinPhone(c, number);
    onChange(number ? next : "");
  }

  function handleNumberChange(raw: string) {
    const n = digitsOnly(raw);
    setNumber(n);
    onChange(n ? joinPhone(code, n) : "");
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        {/* Dial-code combobox */}
        <div className="relative w-36 shrink-0">
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
                onChange(number ? joinPhone(c, number) : "");
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => {
                blurTimer.current = setTimeout(() => setOpen(false), 150);
              }}
            />
          </div>

          {open && matches.length > 0 && (
            <ul
              className="absolute z-50 mt-1 max-h-60 w-64 overflow-auto rounded-md border bg-popover p-1 text-sm shadow-md"
              onMouseDown={() => {
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

        <Input
          inputMode="numeric"
          placeholder="912345678"
          value={number}
          required={required}
          onChange={(e) => handleNumberChange(e.target.value)}
          className="flex-1"
        />
      </div>

      {stored && (
        <p className="text-xs text-muted-foreground">
          Será guardado como{" "}
          <span className="font-medium">{formatPhone(stored)}</span>
        </p>
      )}
    </div>
  );
}
