import { z } from "zod";
import { db } from "@/db";
import { requirePermission } from "@/lib/rbac";
import { addMember, removeMember, replaceMember, moveMember, vacantSlots, DomainError } from "@/lib/groups";
const id = z.string().uuid();
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add"), userId: id, slot: z.number().int() }),
  z.object({ action: z.literal("remove"), userId: id }),
  z.object({ action: z.literal("replace"), oldUserId: id, newUserId: id }),
  z.object({ action: z.literal("move"), userId: id, newSlot: z.coerce.number().int() }), // AdminAction's <select> always posts a string
]);
type Ctx = { params: Promise<{ id: string }> };
export async function GET(_: Request, { params }: Ctx) {
  if (!(await requirePermission("groups:manage"))) return Response.json({ error: "forbidden" }, { status: 403 });
  const gid = id.safeParse((await params).id);
  if (!gid.success) return Response.json({ error: "invalid" }, { status: 400 });
  try { return Response.json(await vacantSlots(db, gid.data)); } catch (e) { return fail(e); }
}
export async function POST(req: Request, { params }: Ctx) {
  const me = await requirePermission("groups:manage");
  if (!me) return Response.json({ error: "forbidden" }, { status: 403 });
  const gid = id.safeParse((await params).id), b = Body.safeParse(await req.json().catch(() => null));
  if (!gid.success || !b.success) return Response.json({ error: "invalid" }, { status: 400 });
  const d = b.data, groupId = gid.data;
  try {
    const r = d.action === "add" ? await addMember(db, me.id, { groupId, ...d })
      : d.action === "remove" ? await removeMember(db, me.id, { groupId, userId: d.userId })
      : d.action === "move" ? await moveMember(db, me.id, { groupId, ...d })
      : await replaceMember(db, me.id, { groupId, ...d });
    return Response.json(r);
  } catch (e) { return fail(e); }
}
const fail = (e: unknown) => {
  if (e instanceof DomainError) return Response.json({ error: e.code }, { status: e.code === "group_not_found" ? 404 : 409 });
  throw e;
};
