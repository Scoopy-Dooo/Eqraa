import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
export async function Bell({ userId }: { userId: string }) {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(notifications).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return (
    <a href="/notifications" aria-label="الإشعارات" className="relative flex size-11 items-center justify-center rounded-full border border-line text-lg">
      🔔{n > 0 && <span className="absolute -end-1 -top-1 flex size-5 items-center justify-center rounded-full bg-danger text-xs text-on-primary">{n > 9 ? "9+" : n}</span>}
    </a>
  );
}
