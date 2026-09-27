import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { notificationPreferences } from "@/db/schema";
import { currentUser } from "@/lib/session";
import { OPTIONAL_TYPES } from "@/i18n/templates";
export async function GET() {
  const me = await currentUser();
  if (!me) return Response.json({ error: "unauthorized" }, { status: 401 });
  const rows = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, me.id));
  return Response.json(Object.fromEntries(OPTIONAL_TYPES.map((t) => [t, rows.find((r) => r.type === t)?.enabled !== 0])));
}
const Body = z.object({ type: z.enum(OPTIONAL_TYPES), enabled: z.boolean() });
export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return Response.json({ error: "unauthorized" }, { status: 401 });
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return Response.json({ error: "invalid" }, { status: 400 });
  await db.insert(notificationPreferences).values({ userId: me.id, type: b.data.type, enabled: b.data.enabled ? 1 : 0 }).onConflictDoUpdate({ target: [notificationPreferences.userId, notificationPreferences.type], set: { enabled: b.data.enabled ? 1 : 0 } });
  return Response.json({ ok: true });
}
