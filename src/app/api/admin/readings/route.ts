import { z } from "zod";
import { db } from "@/db";
import { requirePermission } from "@/lib/rbac";
import { domainFail } from "@/lib/http";
import { adminConfirmReading } from "@/lib/admin";
export async function POST(req: Request) {
  const me = await requirePermission("readings:manage");
  if (!me) return Response.json({ error: "forbidden" }, { status: 403 });
  const b = z.object({ assignmentId: z.string().uuid() }).safeParse(await req.json().catch(() => null));
  if (!b.success) return Response.json({ error: "invalid" }, { status: 400 });
  try { return Response.json(await adminConfirmReading(db, me.id, b.data.assignmentId)); } catch (e) { return domainFail(e); }
}
