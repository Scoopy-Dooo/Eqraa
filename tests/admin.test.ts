import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { createRequire } from "node:module";
import { eq } from "drizzle-orm";
import * as s from "../src/db/schema";
import { createGroup, addMember, type Db } from "../src/lib/groups";
import { rollover } from "../src/lib/rollover";
import { changePhone, resetPin, grantAdmin, revokeAdmin, adminConfirmReading, dailyOverview } from "../src/lib/admin";
const { pushSchema } = createRequire(import.meta.url)("drizzle-kit/api");
const pg = drizzle(new PGlite(), { schema: s });
const db = pg as unknown as Db;
const noProvider = { timings: async () => null };
let n = 0, admin: string, other: string;
const mkUser = async (name: string, phone?: string) => (await pg.insert(s.users).values({ firstName: name, phoneE164: phone ?? `+2499400${String(++n).padStart(5, "0")}`, pinHash: "x", gender: "male", avatarKey: "m1" }).returning())[0].id;
beforeAll(async () => { await (await pushSchema(s, pg as never)).apply(); admin = await mkUser("admin"); other = await mkUser("other"); }, 60_000);
describe("user management", () => {
  it("changes phone, rejects invalid/taken numbers", async () => {
    await expect(changePhone(db, admin, other, "0900000")).rejects.toThrow("invalid_phone");
    await changePhone(db, admin, other, "+249900000001");
    const dupUser = await mkUser("dup", "+249900000002");
    await expect(changePhone(db, admin, dupUser, "+249900000001")).rejects.toThrow("phone_taken");
  });
  it("resets a PIN, revokes sessions, clears lockout", async () => {
    await pg.update(s.users).set({ failedPinCount: 5, lockedUntil: new Date(Date.now() + 6e5) }).where(eq(s.users.id, other));
    await pg.insert(s.sessions).values({ userId: other, tokenHash: "t1", expiresAt: new Date(Date.now() + 1e9) });
    await resetPin(db, admin, other, "482619");
    const [u] = await pg.select().from(s.users).where(eq(s.users.id, other));
    expect(u.failedPinCount).toBe(0); expect(u.lockedUntil).toBeNull();
    const [sess] = await pg.select().from(s.sessions).where(eq(s.sessions.userId, other));
    expect(sess.revokedAt).not.toBeNull();
    await expect(resetPin(db, admin, other, "111111")).rejects.toThrow("weak_pin");
  });
});
describe("admin roles (BR-A2)", () => {
  it("grants and revokes, but protects the last super admin", async () => {
    await pg.insert(s.adminRoles).values({ userId: admin, role: "super_admin" });
    await grantAdmin(db, admin, { phone: (await pg.select().from(s.users).where(eq(s.users.id, other)))[0].phoneE164, role: "admin" });
    const [r] = await pg.select().from(s.adminRoles).where(eq(s.adminRoles.userId, other));
    expect(r.role).toBe("admin");
    await expect(revokeAdmin(db, admin, admin)).rejects.toThrow("last_super_admin");
    await revokeAdmin(db, admin, other);
    await expect(revokeAdmin(db, admin, other)).rejects.toThrow("not_admin");
  });
});
describe("admin confirms a reading on the reader's behalf (decision D)", () => {
  it("counts for the reader, is tagged source=admin, and shows on the daily overview", async () => {
    const g = await createGroup(db, admin, { name: "g", capacity: 2, startDate: "2026-09-01" }), u1 = await mkUser("u1"), u2 = await mkUser("u2");
    await addMember(db, admin, { groupId: g.id, userId: u1, slot: 1 }); await addMember(db, admin, { groupId: g.id, userId: u2, slot: 2 });
    await rollover(db, noProvider, new Date("2026-09-20T10:00:00Z"));
    const [a] = await pg.select().from(s.partAssignments).innerJoin(s.khatmahDays, eq(s.khatmahDays.id, s.partAssignments.khatmahDayId)).where(eq(s.khatmahDays.groupId, g.id));
    await adminConfirmReading(db, admin, a.part_assignments.id, new Date("2026-09-20T11:00:00Z"));
    const [sess] = await pg.select().from(s.readingSessions).where(eq(s.readingSessions.partAssignmentId, a.part_assignments.id));
    expect(sess.source).toBe("admin"); expect(sess.userId).toBe(u1);
    const ov = await dailyOverview(db, new Date("2026-09-20T11:00:00Z"));
    expect(ov.find((x) => x.groupId === g.id)?.done).toBe(1);
    await expect(adminConfirmReading(db, admin, a.part_assignments.id, new Date("2026-09-20T12:00:00Z"))).rejects.toThrow("already_completed");
  });
});
