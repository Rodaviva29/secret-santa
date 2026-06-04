import { eq, sql } from "drizzle-orm";
import { Gift, Lock } from "lucide-react";
import { db, first, schema } from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">{children}</Card>
    </main>
  );
}

export default async function RevealPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const assignment = await first(
    db
      .select()
      .from(schema.assignment)
      .where(eq(schema.assignment.revealToken, token)),
  );

  if (!assignment) {
    return (
      <Shell>
        <CardHeader>
          <CardTitle>Not found</CardTitle>
          <CardDescription>This reveal link is invalid.</CardDescription>
        </CardHeader>
      </Shell>
    );
  }

  const draw = await first(
    db.select().from(schema.draw).where(eq(schema.draw.id, assignment.drawId)),
  );

  // Enforce the per-draw preview limit (reveal channel only).
  const limit = draw?.previewLimit ?? Infinity;
  if (draw?.deliverReveal && assignment.revealCount >= limit) {
    return (
      <Shell>
        <CardHeader>
          <Lock className="size-8 text-muted-foreground" />
          <CardTitle>Link locked</CardTitle>
          <CardDescription>
            This link has been viewed the maximum number of times ({limit}).
            Ask the organiser if you need to see it again.
          </CardDescription>
        </CardHeader>
      </Shell>
    );
  }

  // Count this view.
  await db
    .update(schema.assignment)
    .set({ revealCount: sql`${schema.assignment.revealCount} + 1` })
    .where(eq(schema.assignment.id, assignment.id));

  const receiver = await first(
    db
      .select()
      .from(schema.participant)
      .where(eq(schema.participant.id, assignment.receiverId)),
  );

  const wishlist = await db
    .select()
    .from(schema.wishlistItem)
    .where(eq(schema.wishlistItem.participantId, assignment.receiverId));

  const viewsLeft = draw?.deliverReveal
    ? Math.max(0, limit - (assignment.revealCount + 1))
    : null;

  return (
    <Shell>
      <CardHeader className="items-center text-center">
        <Gift className="size-10 text-primary" />
        <CardTitle>Your secret santa match 🎁</CardTitle>
        <CardDescription>You are giving a gift to…</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-center text-3xl font-bold">{receiver?.name}</p>

        {draw?.budget != null && (
          <p className="text-center text-sm text-muted-foreground">
            Budget: <span className="font-medium">{draw.budget}</span>
          </p>
        )}

        <div>
          <h2 className="mb-2 text-sm font-medium">Their wishlist</h2>
          {wishlist.length === 0 ? (
            <p className="text-sm text-muted-foreground">No wishlist yet.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {wishlist.map((w) => (
                <li key={w.id} className="rounded-md border px-3 py-2">
                  {w.url ? (
                    <a
                      href={w.url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      {w.text}
                    </a>
                  ) : (
                    w.text
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {viewsLeft != null && (
          <p className="text-center text-xs text-muted-foreground">
            {viewsLeft} view{viewsLeft === 1 ? "" : "s"} left.
          </p>
        )}
      </CardContent>
    </Shell>
  );
}
