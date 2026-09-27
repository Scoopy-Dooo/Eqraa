import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { createRequire } from "node:module";
const { pushSchema } = createRequire(import.meta.url)("drizzle-kit/api");
import { eq, and, isNull } from "drizzle-orm";
import * as s from "../src/db/schema";
import { createGroup, addMember, removeMember, replaceMember, moveMember, vacantSlots, type Db } from "../src/lib/groups";
const pg = drizzle(new PGlite(), { schema: s });
const db = pg as unknown as Db;
let n = 0, admin: string;
const mkUser = async (name: string) => (await pg.insert(s.users).values({ firstName: name, phoneE164: `+2499000${String(++n).padStart(5, "0")}`, pinHash: "x", gender: "male", avatarKey: "m1" }).returning())[0].id;
const mkGroup = (capacity: number) => createGroup(db, admin, { name: "g", capacity, startDate: "2026-09-01" });
beforeAll(async () => { await (await pushSchema(s, pg as never)).apply(); admin = await mkUser("admin"); }, 60_000);
describe("groups & members (real Postgres constraints)", () => {
  it("rejects capacity above 30 at the database level", async () => { await expect(pg.insert(s.groups).values({ name: "x", capacity: 31, startDate: "2026-09-01" })).rejects.toThrow(); });
  it("one group per user, one holder per slot", async () => {
    const g1 = await mkGroup(10), g2 = await mkGroup(10), a = await mkUser("a"), b = await mkUser("b");
    await addMember(db, admin, { groupId: g1.id, userId: a, slot: 1 });
    await expect(addMember(db, admin, { groupId: g2.id, userId: a, slot: 1 })).rejects.toThrow("user_in_group");
    await expect(addMember(db, admin, { groupId: g1.id, userId: b, slot: 1 })).rejects.toThrow("slot_taken");
  });
  it("group of 10 grows to 11 with slot 11, but not beyond capacity+1 or above 30", async () => {
    const g = await mkGroup(10), u = await mkUser("u"), v = await mkUser("v");
    await expect(addMember(db, admin, { groupId: g.id, userId: u, slot: 12 })).rejects.toThrow("slot_invalid");
    await addMember(db, admin, { groupId: g.id, userId: u, slot: 11 });
    expect((await vacantSlots(db, g.id)).next).toBe(12);
    const full = await mkGroup(30);
    await expect(addMember(db, admin, { groupId: full.id, userId: v, slot: 31 })).rejects.toThrow("slot_invalid");
    expect((await vacantSlots(db, full.id)).next).toBeNull();
  });
  it("replacement inherits the slot; removed user can return; history is kept", async () => {
    const g = await mkGroup(10), a = await mkUser("a"), b = await mkUser("b");
    await addMember(db, admin, { groupId: g.id, userId: a, slot: 7 });
    const m = await replaceMember(db, admin, { groupId: g.id, oldUserId: a, newUserId: b });
    expect(m.slot).toBe(7);
    await removeMember(db, admin, { groupId: g.id, userId: b });
    await addMember(db, admin, { groupId: g.id, userId: a, slot: 3 });
    expect((await pg.select().from(s.groupMembers).where(eq(s.groupMembers.groupId, g.id))).length).toBe(3);
  });
  it("writes audit records for sensitive actions", async () => {
    const acts = (await pg.select().from(s.auditLogs)).map((r) => r.action);
    for (const a of ["group.create", "member.add", "member.replace", "member.remove"]) expect(acts).toContain(a);
  });
  it("moves a seated member to a vacant slot (BR-34 'change rotation slot'), rejecting a taken or out-of-range slot", async () => {
    const g = await mkGroup(5), a = await mkUser("mv1"), b = await mkUser("mv2");
    await addMember(db, admin, { groupId: g.id, userId: a, slot: 1 });
    await addMember(db, admin, { groupId: g.id, userId: b, slot: 2 });
    await expect(moveMember(db, admin, { groupId: g.id, userId: a, newSlot: 2 })).rejects.toThrow("slot_taken");
    await expect(moveMember(db, admin, { groupId: g.id, userId: a, newSlot: 6 })).rejects.toThrow("slot_invalid");
    const moved = await moveMember(db, admin, { groupId: g.id, userId: a, newSlot: 3 });
    expect(moved.slot).toBe(3);
    expect((await pg.select().from(s.groupMembers).where(and(eq(s.groupMembers.groupId, g.id), eq(s.groupMembers.userId, a), isNull(s.groupMembers.leftAt))))[0].slot).toBe(3);
    const acts = (await pg.select().from(s.auditLogs)).map((r) => r.action);
    expect(acts).toContain("member.move_slot");
  });
});
