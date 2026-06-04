import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Gift } from "lucide-react";
import { db, first, schema } from "@/lib/db";
import { getCurrentUser, getOrCreateParticipant, isAdmin } from "@/lib/session";
import { getVisiblePairings } from "@/lib/pairings";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignOutButton } from "@/components/sign-out-button";
import { WishlistEditor } from "@/components/wishlist-editor";
import { PhoneEditor } from "@/components/phone-editor";
import { PushToggle } from "@/components/push-toggle";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const participant = await getOrCreateParticipant();
  const admin = await isAdmin();

  const wishlist = participant
    ? await db
        .select()
        .from(schema.wishlistItem)
        .where(eq(schema.wishlistItem.participantId, participant.id))
    : [];

  // Most recent assignment where this participant is the giver.
  const latest = participant
    ? await first(
        db
          .select()
          .from(schema.assignment)
          .where(eq(schema.assignment.giverId, participant.id))
          .orderBy(desc(schema.assignment.createdAt)),
      )
    : undefined;

  const myDraw = latest
    ? await first(
        db.select().from(schema.draw).where(eq(schema.draw.id, latest.drawId)),
      )
    : undefined;

  // The person this user is gifting to, plus their wishlist. The dashboard
  // is authenticated, so we can show the match directly here regardless of
  // the draw's delivery mode (no token / preview limit applies).
  const receiver = latest
    ? await first(
        db
          .select()
          .from(schema.participant)
          .where(eq(schema.participant.id, latest.receiverId)),
      )
    : undefined;

  const receiverWishlist = receiver
    ? await db
        .select()
        .from(schema.wishlistItem)
        .where(eq(schema.wishlistItem.participantId, receiver.id))
    : [];

  // Draws whose full pairing list has been made public.
  const visiblePairings = await getVisiblePairings();

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="size-6 text-primary" />
          <h1 className="text-xl font-semibold">Hi, {user.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          {admin && (
            <Button asChild variant="outline" size="sm">
              <Link href="/admin">Admin</Link>
            </Button>
          )}
          <SignOutButton />
        </div>
      </header>

      {latest && myDraw && receiver && (
        <Card>
          <CardHeader>
            <CardTitle>Your secret santa is ready 🎉</CardTitle>
            <CardDescription>
              {myDraw.name} — you are giving a gift to…
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-2xl font-bold">{receiver.name}</p>

            {myDraw.budget != null && (
              <p className="text-sm text-muted-foreground">
                Budget: <span className="font-medium">{myDraw.budget}</span>
              </p>
            )}

            <div>
              <h2 className="mb-2 text-sm font-medium">Their wishlist</h2>
              {receiverWishlist.length === 0 ? (
                <p className="text-sm text-muted-foreground">No wishlist yet.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {receiverWishlist.map((w) => (
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

            <Button asChild variant="outline" size="sm">
              <Link href={`/reveal/${latest.revealToken}`}>
                Open shareable reveal link
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {visiblePairings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pairings revealed 📜</CardTitle>
            <CardDescription>
              These draws have had their full results made public.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {visiblePairings.map(({ draw, pairs }) => (
              <div key={draw.id}>
                <h3 className="mb-1 text-sm font-medium">{draw.name}</h3>
                <ul className="space-y-1 text-sm">
                  {pairs.map((p, i) => (
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
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your wishlist</CardTitle>
          <CardDescription>
            Your secret santa will see this — add some ideas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WishlistEditor initial={wishlist} />
        </CardContent>
      </Card>

      {participant && (
        <Card>
          <CardHeader>
            <CardTitle>WhatsApp number</CardTitle>
            <CardDescription>
              Add it (international format, digits only) to receive your match
              by WhatsApp.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PhoneEditor
              participantId={participant.id}
              initialPhone={participant.phone}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Get a push notification on this device when your match is ready.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PushToggle />
        </CardContent>
      </Card>
    </main>
  );
}
