import Link from "next/link";
import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { ShieldCheck } from "lucide-react";
import { db, schema } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { AdminPanel } from "@/components/admin-panel";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(await isAdmin())) redirect("/dashboard");

  const participants = await db.select().from(schema.participant).all();
  const exclusions = await db.select().from(schema.exclusion).all();
  const draws = await db
    .select()
    .from(schema.draw)
    .orderBy(desc(schema.draw.createdAt))
    .all();

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-6 text-primary" />
          <h1 className="text-xl font-semibold">Admin</h1>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">Back</Link>
        </Button>
      </header>

      <AdminPanel
        participants={participants}
        exclusions={exclusions}
        draws={draws}
      />
    </main>
  );
}
