import { z } from "zod";
import { db } from "@/db";
import { requirePermission } from "@/lib/rbac";
import { domainFail } from "@/lib/http";
import { assignBackup, cancelBackup } from "@/lib/backup";
const id = z.string().uuid();
const Body = z.discriminatedUnion("action", [z.object({ action: z.literal("assign"), assignmentId: id, backupUserId: id }), z.object({ action: z.literal("cancel"), assignmentId: id })]);
export async function POST(req: Request) {
  const me = await requirePermission("readings:manage");
  if (!me) return Response.json({ error: "forbidden" }, { status: 403 });
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return Response.json({ error: "invalid" }, { status: 400 });
  try { return Response.json(b.data.action === "assign" ? await assignBackup(db, me.id, b.data) : await cancelBackup(db, me.id, b.data.assignmentId)); } catch (e) { return domainFail(e); }
}
