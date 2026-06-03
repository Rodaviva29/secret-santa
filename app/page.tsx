import Link from "next/link";
import { redirect } from "next/navigation";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/session";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <Gift className="size-16 text-primary" />
        <h1 className="text-4xl font-bold tracking-tight">WhatsApp Secret Santa</h1>
        <p className="max-w-md text-muted-foreground">
          Sign up, build your wishlist, and let the organiser run the draw —
          with exclusions, budgets and WhatsApp delivery. 🎁
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/signup">Get started</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Log in</Link>
        </Button>
      </div>
    </main>
  );
}
