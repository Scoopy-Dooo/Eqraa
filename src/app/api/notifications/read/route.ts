import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { currentUser } from "@/lib/session";
const Body = z.object({ id: z.string().uuid().optional(), all: z.boolean().optional() });
export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return Response.json({ error: "unauthorized" }, { status: 401 });
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return Response.json({ error: "invalid" }, { status: 400 });
  if (b.data.all) await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, me.id), isNull(notifications.readAt)));
  else if (b.data.id) await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, me.id), eq(notifications.id, b.data.id)));
  else return Response.json({ error: "invalid" }, { status: 400 });
  return Response.json({ ok: true });
}
