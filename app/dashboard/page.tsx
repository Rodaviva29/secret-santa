import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Gift } from "lucide-react";
import { db, first, schema } from "@/lib/db";
import { getCurrentUser, getOrCreateParticipant, isAdmin } from "@/lib/session";
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

      {latest && myDraw && (
        <Card>
          <CardHeader>
            <CardTitle>Your secret santa is ready 🎉</CardTitle>
            <CardDescription>
              {myDraw.deliveryMode === "wa_direct"
                ? "Check WhatsApp for your match."
                : "Open your private reveal link to see who you got."}
            </CardDescription>
          </CardHeader>
          {myDraw.deliveryMode !== "wa_direct" && (
            <CardContent>
              <Button asChild>
                <Link href={`/reveal/${latest.revealToken}`}>Reveal my match</Link>
              </Button>
            </CardContent>
          )}
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
    </main>
  );
}
