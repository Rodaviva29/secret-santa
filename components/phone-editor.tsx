"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/phone-input";

export function PhoneEditor({
  participantId,
  initialPhone,
}: {
  participantId: number;
  initialPhone: string | null;
}) {
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

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
    <form onSubmit={save} className="space-y-3">
      <PhoneInput value={phone} onChange={(v) => { setPhone(v); setSaved(false); }} />
      <Button type="submit" disabled={busy}>
        {saved ? "Saved ✓" : "Save phone"}
      </Button>
    </form>
  );
}
