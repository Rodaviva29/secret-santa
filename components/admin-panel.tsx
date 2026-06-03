"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  Draw,
  Exclusion,
  Participant,
} from "@/lib/db/schema";

interface Props {
  participants: Participant[];
  exclusions: Exclusion[];
  draws: Draw[];
}

type DrawResponse = {
  draw: Draw;
  assignments: number;
  delivery: { sent: number; failed: number; errors: string[] } | null;
  revealLinks?: { giver: string; url: string }[];
};

export function AdminPanel({ participants, exclusions, draws }: Props) {
  const router = useRouter();
  const nameById = new Map(participants.map((p) => [p.id, p.name]));

  /* -------- add participant -------- */
  const [pName, setPName] = useState("");
  const [pPhone, setPPhone] = useState("");

  async function addParticipant(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/participants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: pName, phone: pPhone || undefined }),
    });
    if (res.ok) {
      setPName("");
      setPPhone("");
      router.refresh();
    }
  }

  async function delParticipant(id: number) {
    const res = await fetch(`/api/participants/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  /* -------- exclusions -------- */
  const [exA, setExA] = useState("");
  const [exB, setExB] = useState("");

  async function addExclusion(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/exclusions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aId: Number(exA), bId: Number(exB) }),
    });
    if (res.ok) {
      setExA("");
      setExB("");
      router.refresh();
    }
  }

  async function delExclusion(id: number) {
    const res = await fetch(`/api/exclusions/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  /* -------- run draw -------- */
  const [drawName, setDrawName] = useState("");
  const [budget, setBudget] = useState("");
  const [mode, setMode] = useState<"reveal" | "wa_link" | "wa_direct">("reveal");
  const [previewLimit, setPreviewLimit] = useState("3");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<DrawResponse | null>(null);
  const [drawError, setDrawError] = useState<string | null>(null);

  async function runDraw(e: React.FormEvent) {
    e.preventDefault();
    setRunning(true);
    setDrawError(null);
    setResult(null);
    const res = await fetch("/api/draw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: drawName || "Secret Santa",
        budget: budget ? Number(budget) : null,
        deliveryMode: mode,
        previewLimit: Number(previewLimit) || 3,
      }),
    });
    setRunning(false);
    const json = await res.json();
    if (!res.ok) {
      setDrawError(json.error ?? "Draw failed.");
      return;
    }
    setResult(json);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Participants */}
      <Card>
        <CardHeader>
          <CardTitle>Participants ({participants.length})</CardTitle>
          <CardDescription>
            People sign up themselves; you can also add stand-ins here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2">
            {participants.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>
                  {p.name}
                  {p.phone ? (
                    <span className="text-muted-foreground"> · {p.phone}</span>
                  ) : (
                    <span className="text-muted-foreground"> · no phone</span>
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => delParticipant(p.id)}
                  aria-label="Remove"
                >
                  <Trash2 className="text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
          <form onSubmit={addParticipant} className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Name"
              value={pName}
              onChange={(e) => setPName(e.target.value)}
              required
            />
            <Input
              placeholder="Phone (optional)"
              value={pPhone}
              onChange={(e) => setPPhone(e.target.value)}
            />
            <Button type="submit">Add</Button>
          </form>
        </CardContent>
      </Card>

      {/* Exclusions */}
      <Card>
        <CardHeader>
          <CardTitle>Exclusions</CardTitle>
          <CardDescription>
            Forbidden pairs — neither person will draw the other.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2">
            {exclusions.length === 0 && (
              <li className="text-sm text-muted-foreground">No exclusions.</li>
            )}
            {exclusions.map((ex) => (
              <li
                key={ex.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>
                  {nameById.get(ex.aId) ?? `#${ex.aId}`} ⇄{" "}
                  {nameById.get(ex.bId) ?? `#${ex.bId}`}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => delExclusion(ex.id)}
                  aria-label="Remove"
                >
                  <Trash2 className="text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
          <form onSubmit={addExclusion} className="flex flex-col gap-2 sm:flex-row">
            <Select value={exA} onValueChange={setExA}>
              <SelectTrigger>
                <SelectValue placeholder="Person A" />
              </SelectTrigger>
              <SelectContent>
                {participants.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={exB} onValueChange={setExB}>
              <SelectTrigger>
                <SelectValue placeholder="Person B" />
              </SelectTrigger>
              <SelectContent>
                {participants.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" disabled={!exA || !exB}>
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Run draw */}
      <Card>
        <CardHeader>
          <CardTitle>Run the draw</CardTitle>
          <CardDescription>
            Assigns everyone respecting exclusions, avoids repeating past
            pairings when possible, and delivers results.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={runDraw} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Draw name</Label>
                <Input
                  placeholder="Xmas 2026"
                  value={drawName}
                  onChange={(e) => setDrawName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Budget (optional)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="20"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Delivery</Label>
                <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reveal">Reveal page (links)</SelectItem>
                    <SelectItem value="wa_link">WhatsApp + reveal link</SelectItem>
                    <SelectItem value="wa_direct">WhatsApp (name in message)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {mode === "reveal" && (
                <div className="flex flex-col gap-2">
                  <Label>Preview limit</Label>
                  <Input
                    type="number"
                    min={1}
                    value={previewLimit}
                    onChange={(e) => setPreviewLimit(e.target.value)}
                  />
                </div>
              )}
            </div>
            <Button type="submit" disabled={running}>
              {running ? "Drawing…" : "Run draw 🎲"}
            </Button>
          </form>

          {drawError && (
            <p className="mt-4 text-sm text-destructive">{drawError}</p>
          )}

          {result && (
            <div className="mt-4 space-y-3 rounded-md border p-4 text-sm">
              <p className="font-medium">
                Draw &quot;{result.draw.name}&quot; — {result.assignments} pairs.
              </p>
              {result.delivery && (
                <p>
                  WhatsApp: {result.delivery.sent} sent, {result.delivery.failed}{" "}
                  failed.
                  {result.delivery.errors.length > 0 && (
                    <ul className="mt-1 list-disc pl-5 text-destructive">
                      {result.delivery.errors.map((er, i) => (
                        <li key={i}>{er}</li>
                      ))}
                    </ul>
                  )}
                </p>
              )}
              {result.revealLinks && (
                <div>
                  <p className="mb-1 font-medium">Reveal links to share:</p>
                  <ul className="space-y-1">
                    {result.revealLinks.map((l) => (
                      <li key={l.url}>
                        <span className="font-medium">{l.giver}:</span>{" "}
                        <a className="break-all underline" href={l.url}>
                          {l.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>Draw history</CardTitle>
          <CardDescription>Past draws inform future pairings.</CardDescription>
        </CardHeader>
        <CardContent>
          {draws.length === 0 ? (
            <p className="text-sm text-muted-foreground">No draws yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {draws.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <span>{d.name}</span>
                  <span className="text-muted-foreground">
                    {d.deliveryMode}
                    {d.budget != null ? ` · budget ${d.budget}` : ""} ·{" "}
                    {new Date(d.createdAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
