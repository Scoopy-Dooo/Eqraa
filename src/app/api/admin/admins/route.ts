import { z } from "zod";
import { db } from "@/db";
import { requirePermission } from "@/lib/rbac";
import { domainFail } from "@/lib/http";
import { grantAdmin, revokeAdmin } from "@/lib/admin";
const Body = z.discriminatedUnion("action", [z.object({ action: z.literal("grant"), phone: z.string().max(20), role: z.enum(["admin", "super_admin"]) }), z.object({ action: z.literal("revoke"), userId: z.string().uuid() })]);
export async function POST(req: Request) {
  const me = await requirePermission("admins:manage"); // Super Admin only
  if (!me) return Response.json({ error: "forbidden" }, { status: 403 });
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return Response.json({ error: "invalid" }, { status: 400 });
  try { return Response.json(b.data.action === "grant" ? await grantAdmin(db, me.id, b.data) : await revokeAdmin(db, me.id, b.data.userId)); } catch (e) { return domainFail(e); }
}
