import { currentUser } from "@/lib/session";
import { db } from "@/db";
import { desc, eq } from "drizzle-orm";
import { notifications } from "@/db/schema";
import { PushOptIn } from "@/components/PushOptIn";
import { NotificationList } from "@/components/NotificationList";
import { PreferencesForm } from "@/components/PreferencesForm";
export default async function NotificationsPage() {
  const me = (await currentUser())!;
  const rows = await db.select().from(notifications).where(eq(notifications.userId, me.id)).orderBy(desc(notifications.createdAt)).limit(50);
  return (
    <main className="mt-4 grid gap-5">
      <h1 className="text-2xl font-bold">الإشعارات</h1>
      <PushOptIn />
      <NotificationList initial={rows.map((r) => ({ id: r.id, type: r.type, title: (r.payload as { title: string }).title, body: (r.payload as { body: string }).body, createdAt: r.createdAt.toISOString(), read: !!r.readAt }))} />
      <PreferencesForm />
    </main>
  );
}
