import { and, eq, inArray, isNull } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import * as s from "../db/schema";
import { notify } from "./notify";
export type Db = PgDatabase<any, typeof s>;
export class DomainError extends Error { constructor(public code: string) { super(code); } }
const audit = (tx: Db, actor: string, action: string, id: string, before: unknown, after: unknown) =>
  tx.insert(s.auditLogs).values({ actorId: actor, action, targetType: "group", targetId: id, before: before as never, after: after as never });
const active = (groupId: string) => and(eq(s.groupMembers.groupId, groupId), isNull(s.groupMembers.leftAt));
async function lockGroup(tx: Db, id: string) {
  const [g] = await tx.select().from(s.groups).where(and(eq(s.groups.id, id), eq(s.groups.status, "active"))).for("update");
  if (!g) throw new DomainError("group_not_found");
  return g;
}
async function assertFree(tx: Db, userId: string) {
  const [busy] = await tx.select().from(s.groupMembers).where(and(eq(s.groupMembers.userId, userId), isNull(s.groupMembers.leftAt)));
  if (busy) throw new DomainError("user_in_group");
}
export const createGroup = (db: Db, actor: string, i: { name: string; capacity: number; startDate: string; startOffset?: number }) =>
  db.transaction(async (tx) => {
    const [g] = await tx.insert(s.groups).values({ ...i, startOffset: i.startOffset ?? 0 }).returning();
    await audit(tx, actor, "group.create", g.id, null, g);
    return g;
  });
/** Slot must be a vacant slot within capacity, or capacity+1 (group grows, max 30). BR-M7/M8. */
export const addMember = (db: Db, actor: string, i: { groupId: string; userId: string; slot: number }) =>
  db.transaction(async (tx) => {
    const g = await lockGroup(tx, i.groupId);
    if (i.slot < 1 || i.slot > 30 || i.slot > g.capacity + 1) throw new DomainError("slot_invalid");
    await assertFree(tx, i.userId);
    const [taken] = await tx.select().from(s.groupMembers).where(and(active(i.groupId), eq(s.groupMembers.slot, i.slot)));
    if (taken) throw new DomainError("slot_taken");
    const [m] = await tx.insert(s.groupMembers).values({ ...i, addedBy: actor }).returning();
    if (i.slot > g.capacity) await tx.update(s.groups).set({ capacity: i.slot }).where(eq(s.groups.id, g.id));
    await syncOpenDay(tx, g.id, i.slot, i.userId);
    await audit(tx, actor, "member.add", g.id, null, m);
    const [u] = await tx.select({ n: s.users.firstName }).from(s.users).where(eq(s.users.id, i.userId));
    await notify(tx, { userId: i.userId, type: "assigned", vars: { name: u?.n ?? "", group: g.name }, dedupeKey: `assigned:${m.id}` });
    return m;
  });
/** History is kept: the row is closed, never deleted. The account itself is untouched (BR-M4). */
export const removeMember = (db: Db, actor: string, i: { groupId: string; userId: string }) =>
  db.transaction(async (tx) => {
    await lockGroup(tx, i.groupId);
    const [m] = await tx.update(s.groupMembers).set({ leftAt: new Date(), leftReason: "removed" })
      .where(and(active(i.groupId), eq(s.groupMembers.userId, i.userId))).returning();
    if (!m) throw new DomainError("not_member");
    await audit(tx, actor, "member.remove", i.groupId, m, null);
    return m;
  });
/** New member inherits the old member's slot; the rotation is not rebuilt (BR-M3). */
export const replaceMember = (db: Db, actor: string, i: { groupId: string; oldUserId: string; newUserId: string }) =>
  db.transaction(async (tx) => {
    await lockGroup(tx, i.groupId);
    const [old] = await tx.select().from(s.groupMembers).where(and(active(i.groupId), eq(s.groupMembers.userId, i.oldUserId)));
    if (!old) throw new DomainError("not_member");
    await assertFree(tx, i.newUserId);
    await tx.update(s.groupMembers).set({ leftAt: new Date(), leftReason: "replaced" }).where(eq(s.groupMembers.id, old.id));
    const [m] = await tx.insert(s.groupMembers).values({ groupId: i.groupId, userId: i.newUserId, slot: old.slot, addedBy: actor }).returning();
    await syncOpenDay(tx, i.groupId, old.slot, i.newUserId);
    await audit(tx, actor, "member.replace", i.groupId, { userId: i.oldUserId, slot: old.slot }, { userId: i.newUserId, slot: old.slot });
    return m;
  });
/** BR-32/34 "Change rotation slot": moves a seated member to a different empty slot within the group's current
 * capacity. Only affects tomorrow's rotation onward — today's already-frozen assignment is untouched (BR-T5/M48). */
export const moveMember = (db: Db, actor: string, i: { groupId: string; userId: string; newSlot: number }) =>
  db.transaction(async (tx) => {
    const g = await lockGroup(tx, i.groupId);
    if (i.newSlot < 1 || i.newSlot > g.capacity) throw new DomainError("slot_invalid");
    const [m] = await tx.select().from(s.groupMembers).where(and(active(i.groupId), eq(s.groupMembers.userId, i.userId)));
    if (!m) throw new DomainError("not_member");
    if (m.slot === i.newSlot) return m;
    const [taken] = await tx.select().from(s.groupMembers).where(and(active(i.groupId), eq(s.groupMembers.slot, i.newSlot)));
    if (taken) throw new DomainError("slot_taken");
    const [updated] = await tx.update(s.groupMembers).set({ slot: i.newSlot }).where(eq(s.groupMembers.id, m.id)).returning();
    await audit(tx, actor, "member.move_slot", i.groupId, { userId: i.userId, slot: m.slot }, { userId: i.userId, slot: i.newSlot });
    return updated;
  });
/** Slots an admin can pick: holes inside the group, plus the next new slot if the group is under 30. */
export async function vacantSlots(db: Db, groupId: string) {
  const [g] = await db.select().from(s.groups).where(eq(s.groups.id, groupId));
  if (!g) throw new DomainError("group_not_found");
  const used = new Set((await db.select({ slot: s.groupMembers.slot }).from(s.groupMembers).where(active(groupId))).map((r) => r.slot));
  return { holes: Array.from({ length: g.capacity }, (_, i) => i + 1).filter((n) => !used.has(n)), next: g.capacity < 30 ? g.capacity + 1 : null };
}
/** BR-M3: an unread part of the open day goes to the member newly seated in that slot. */
async function syncOpenDay(tx: Db, groupId: string, slot: number, userId: string) {
  const days = tx.select({ id: s.khatmahDays.id }).from(s.khatmahDays).where(and(eq(s.khatmahDays.groupId, groupId), eq(s.khatmahDays.status, "open")));
  await tx.update(s.partAssignments).set({ primaryUserId: userId })
    .where(and(inArray(s.partAssignments.khatmahDayId, days), eq(s.partAssignments.slot, slot), inArray(s.partAssignments.status, ["assigned", "reading"])));
}
