import { z } from "zod";
import { db } from "@/db";
import { requirePermission } from "@/lib/rbac";
import { domainFail } from "@/lib/http";
import { changePhone, resetPin } from "@/lib/admin";
const Body = z.discriminatedUnion("action", [z.object({ action: z.literal("changePhone"), phone: z.string().max(20) }), z.object({ action: z.literal("resetPin"), pin: z.string().max(6) })]);
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await requirePermission("users:manage");
  if (!me) return Response.json({ error: "forbidden" }, { status: 403 });
  const id = z.string().uuid().safeParse((await params).id), b = Body.safeParse(await req.json().catch(() => null));
  if (!id.success || !b.success) return Response.json({ error: "invalid" }, { status: 400 });
  try { return Response.json(b.data.action === "changePhone" ? await changePhone(db, me.id, id.data, b.data.phone) : await resetPin(db, me.id, id.data, b.data.pin)); } catch (e) { return domainFail(e); }
}
