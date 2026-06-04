"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2 as LinkIcon, Trash2 } from "lucide-react";
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
import type { OgSettings } from "@/lib/settings";
import type { DrawPairs } from "@/lib/pairings";
import { OgSettingsForm } from "@/components/og-settings";
import { cn } from "@/lib/utils";

interface UserOption {
  id: string;
  name: string;
  email: string;
}

interface Integrations {
  whatsapp: boolean;
  email: boolean;
  push: boolean;
}

interface Props {
  participants: Participant[];
  exclusions: Exclusion[];
  pairings: DrawPairs[];
  users: UserOption[];
  og: OgSettings;
  integrations: Integrations;
}

type DrawDelivery = {
  whatsapp: { sent: number; failed: number; errors: string[] } | null;
  email: { sent: number; failed: number } | null;
  push: { sent: number; failed: number } | null;
};

type DrawResponse = {
  draw: Draw;
  assignments?: number;
  delivery?: DrawDelivery;
  revealLinks?: { giver: string; url: string }[];
  scheduled?: boolean;
  scheduledAt?: string;
};

export function AdminPanel({
  participants,
  exclusions,
  pairings,
  users,
  og,
  integrations,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"santa" | "technical">("santa");
  const nameById = new Map(participants.map((p) => [p.id, p.name]));
  const userById = new Map(users.map((u) => [u.id, u]));

  // Accounts not yet tied to any participant — candidates for linking.
  const linkedUserIds = new Set(
    participants.map((p) => p.userId).filter((id): id is string => !!id),
  );
  const linkableUsers = users.filter((u) => !linkedUserIds.has(u.id));

  async function linkParticipant(id: number, userId: string | null) {
    const res = await fetch(`/api/participants/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      const json = await res.json().catch(() => ({}));
      alert(json.error ?? "Could not update the link.");
    }
  }

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
  const [allowSelfDraw, setAllowSelfDraw] = useState(false);
  // datetime-local strings ("" = unset)
  const [scheduledAt, setScheduledAt] = useState("");
  const [pairsVisibleAt, setPairsVisibleAt] = useState("");
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
        allowSelfDraw,
        // datetime-local has no timezone; interpret as local, send ISO.
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        pairsVisibleAt: pairsVisibleAt
          ? new Date(pairsVisibleAt).toISOString()
          : null,
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
      {/* Tabs */}
      <div className="flex gap-1 rounded-md border p-1 text-sm">
        <button
          type="button"
          onClick={() => setTab("santa")}
          className={cn(
            "flex-1 rounded-sm px-3 py-1.5 font-medium transition-colors",
            tab === "santa"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Secret Santa
        </button>
        <button
          type="button"
          onClick={() => setTab("technical")}
          className={cn(
            "flex-1 rounded-sm px-3 py-1.5 font-medium transition-colors",
            tab === "technical"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Technical
        </button>
      </div>

      {tab === "technical" && <OgSettingsForm initial={og} />}

      {tab === "santa" && (
        <>
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
            {participants.map((p) => {
              const linkedUser = p.userId ? userById.get(p.userId) : undefined;
              return (
                <li
                  key={p.id}
                  className="flex flex-col gap-2 rounded-md border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <span>
                      {p.name}
                      {p.phone ? (
                        <span className="text-muted-foreground"> · {p.phone}</span>
                      ) : (
                        <span className="text-muted-foreground"> · no phone</span>
                      )}
                    </span>
                    <div className="mt-0.5 flex items-center gap-1 text-xs">
                      {linkedUser ? (
                        <>
                          <LinkIcon className="size-3 text-primary" />
                          <span className="text-muted-foreground">
                            {linkedUser.email}
                          </span>
                          <button
                            type="button"
                            className="ml-1 underline text-muted-foreground hover:text-foreground"
                            onClick={() => linkParticipant(p.id, null)}
                          >
                            unlink
                          </button>
                        </>
                      ) : p.userId ? (
                        <span className="text-muted-foreground">
                          linked account (not found)
                        </span>
                      ) : (
                        <span className="text-muted-foreground">no account</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!p.userId && (
                      <Select
                        value=""
                        onValueChange={(v) => linkParticipant(p.id, v)}
                        disabled={linkableUsers.length === 0}
                      >
                        <SelectTrigger className="h-8 w-40 text-xs">
                          <SelectValue
                            placeholder={
                              linkableUsers.length === 0
                                ? "No free accounts"
                                : "Link account…"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {linkableUsers.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name} ({u.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => delParticipant(p.id)}
                      aria-label="Remove"
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  </div>
                </li>
              );
            })}
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
              <div className="flex flex-col gap-2">
                <Label>Schedule (optional)</Label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to run now. Future = runs + delivers
                  automatically then.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Reveal pairs to everyone (optional)</Label>
                <Input
                  type="datetime-local"
                  value={pairsVisibleAt}
                  onChange={(e) => setPairsVisibleAt(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  When set, the full giver→receiver list becomes public (admin
                  history + everyone&apos;s dashboard) at this time. Empty =
                  never.
                </p>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={allowSelfDraw}
                onChange={(e) => setAllowSelfDraw(e.target.checked)}
              />
              <span>
                Allow self-draw
                <span className="text-muted-foreground">
                  {" "}
                  — a person may be matched to themselves
                </span>
              </span>
            </label>
            <Button type="submit" disabled={running}>
              {running ? "Drawing…" : "Run draw 🎲"}
            </Button>
          </form>

          {drawError && (
            <p className="mt-4 text-sm text-destructive">{drawError}</p>
          )}

          {result && (
            <div className="mt-4 space-y-3 rounded-md border p-4 text-sm">
              {result.scheduled ? (
                <p className="font-medium">
                  Draw &quot;{result.draw.name}&quot; scheduled for{" "}
                  {result.scheduledAt
                    ? new Date(result.scheduledAt).toLocaleString()
                    : "later"}
                  . It will run + deliver automatically.
                </p>
              ) : (
                <p className="font-medium">
                  Draw &quot;{result.draw.name}&quot; — {result.assignments}{" "}
                  pairs.
                </p>
              )}
              {result.delivery?.whatsapp && (
                <p>
                  WhatsApp: {result.delivery.whatsapp.sent} sent,{" "}
                  {result.delivery.whatsapp.failed} failed.
                  {result.delivery.whatsapp.errors.length > 0 && (
                    <ul className="mt-1 list-disc pl-5 text-destructive">
                      {result.delivery.whatsapp.errors.map((er, i) => (
                        <li key={i}>{er}</li>
                      ))}
                    </ul>
                  )}
                </p>
              )}
              {result.delivery?.email && (
                <p>
                  Email: {result.delivery.email.sent} sent,{" "}
                  {result.delivery.email.failed} failed.
                </p>
              )}
              {result.delivery?.push && (
                <p>
                  Push: {result.delivery.push.sent} sent,{" "}
                  {result.delivery.push.failed} failed.
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
          <CardDescription>
            Past draws inform future pairings. Pairs show here once their
            reveal time has passed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pairings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No draws yet.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {pairings.map(({ draw: d, pairs }) => {
                const pending =
                  d.status !== "completed" && d.scheduledAt != null;
                const visible =
                  d.pairsVisibleAt != null &&
                  new Date(d.pairsVisibleAt).getTime() <= Date.now();
                return (
                  <li key={d.id} className="rounded-md border px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{d.name}</span>
                      <span className="text-muted-foreground">
                        {pending ? (
                          <>
                            scheduled ·{" "}
                            {new Date(d.scheduledAt!).toLocaleString()}
                          </>
                        ) : (
                          <>
                            {d.deliveryMode}
                            {d.budget != null ? ` · budget ${d.budget}` : ""} ·{" "}
                            {new Date(
                              d.executedAt ?? d.createdAt,
                            ).toLocaleDateString()}
                          </>
                        )}
                      </span>
                    </div>
                    {!pending && (
                      <div className="mt-1 text-xs">
                        {d.pairsVisibleAt == null ? (
                          <span className="text-muted-foreground">
                            Pairs hidden (never revealed)
                          </span>
                        ) : visible ? (
                          <ul className="mt-1 space-y-0.5">
                            {pairs.map((p, i) => (
                              <li key={i}>
                                <span className="font-medium">{p.giver}</span>{" "}
                                <span className="text-muted-foreground">→</span>{" "}
                                {p.receiver}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-muted-foreground">
                            Pairs reveal{" "}
                            {new Date(d.pairsVisibleAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Integrations status */}
      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>
            Configured via environment variables. Delivery/notifications only
            fire for enabled channels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm">
            <li>
              WhatsApp:{" "}
              <IntegrationBadge on={integrations.whatsapp} /> (WA_API_TOKEN…)
            </li>
            <li>
              Email (Resend): <IntegrationBadge on={integrations.email} />{" "}
              (RESEND_API_KEY, RESEND_FROM)
            </li>
            <li>
              Push (Web Push): <IntegrationBadge on={integrations.push} />{" "}
              (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
            </li>
          </ul>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}

function IntegrationBadge({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-xs font-medium",
        on
          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
          : "bg-muted text-muted-foreground",
      )}
    >
      {on ? "enabled" : "not configured"}
    </span>
  );
}
