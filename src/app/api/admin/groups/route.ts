import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { groups, groupMembers, users } from "@/db/schema";
import { requirePermission } from "@/lib/rbac";
import { createGroup } from "@/lib/groups";
const Body = z.object({ name: z.string().trim().min(1).max(60), capacity: z.number().int().min(1).max(30), startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), startOffset: z.number().int().min(0).max(29).optional() });
export async function GET() {
  if (!(await requirePermission("groups:manage"))) return Response.json({ error: "forbidden" }, { status: 403 });
  const gs = await db.select().from(groups);
  const ms = await db.select({ groupId: groupMembers.groupId, userId: users.id, firstName: users.firstName, lastName: users.lastName, slot: groupMembers.slot })
    .from(groupMembers).innerJoin(users, eq(users.id, groupMembers.userId)).where(isNull(groupMembers.leftAt)); // no phone numbers here
  return Response.json(gs.map((g) => ({ ...g, members: ms.filter((m) => m.groupId === g.id).sort((a, b) => a.slot - b.slot) })));
}
export async function POST(req: Request) {
  const me = await requirePermission("groups:manage");
  if (!me) return Response.json({ error: "forbidden" }, { status: 403 });
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return Response.json({ error: "invalid" }, { status: 400 });
  return Response.json(await createGroup(db, me.id, b.data), { status: 201 });
}
