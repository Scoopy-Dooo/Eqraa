import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { createRequire } from "node:module";
import { eq, and } from "drizzle-orm";
import * as s from "../src/db/schema";
import { createGroup, addMember, removeMember, type Db } from "../src/lib/groups";
import { rollover } from "../src/lib/rollover";
import { assignBackup, cancelBackup } from "../src/lib/backup";
import { startReading, finishReading, undoReading, finishMakeup, undoMakeup, missedFor, todayFor } from "../src/lib/reading";
const { pushSchema } = createRequire(import.meta.url)("drizzle-kit/api");
const pg = drizzle(new PGlite(), { schema: s });
const db = pg as unknown as Db;
const noProvider = { timings: async () => null };
const T = (x: string) => new Date(x), D1 = "2026-09-20", NOW = T("2026-09-20T10:00:00Z"), LATER = T("2026-09-20T11:00:00Z");
let n = 0, admin: string;
const mkUser = async (name: string) => (await pg.insert(s.users).values({ firstName: name, phoneE164: `+2499200${String(++n).padStart(5, "0")}`, pinHash: "x", gender: "male", avatarKey: "m1" }).returning())[0].id;
async function setup(cap: number, members = cap) {
  const g = await createGroup(db, admin, { name: "g", capacity: cap, startDate: "2026-09-01" }), users: string[] = [];
  for (let i = 1; i <= members; i++) { const u = await mkUser(`u${i}`); users.push(u); await addMember(db, admin, { groupId: g.id, userId: u, slot: i }); }
  return { g, users };
}
const asg = async (gid: string, slot: number, date = D1) => { const [d] = await pg.select().from(s.khatmahDays).where(and(eq(s.khatmahDays.groupId, gid), eq(s.khatmahDays.localDate, date))); return (await pg.select().from(s.partAssignments).where(and(eq(s.partAssignments.khatmahDayId, d.id), eq(s.partAssignments.slot, slot))))[0]; };
const status = async (id: string) => (await pg.select().from(s.partAssignments).where(eq(s.partAssignments.id, id)))[0].status;
const fin = (u: string, id: string, key: string, at = LATER) => finishReading(db, u, { assignmentId: id, idempotencyKey: key }, at);
beforeAll(async () => { await (await pushSchema(s, pg as never)).apply(); admin = await mkUser("admin"); }, 60_000);
describe("backup (Cases 5, 6)", () => {
  it("backup completes the part as backup; primary then cannot record it (and vice versa)", async () => {
    const { g, users } = await setup(2); const outsider = await mkUser("bk");
    await rollover(db, noProvider, NOW);
    const a = await asg(g.id, 1), b = await asg(g.id, 2);
    await expect(fin(outsider, a.id, "key-00000001")).rejects.toThrow("forbidden");
    await expect(assignBackup(db, admin, { assignmentId: a.id, backupUserId: users[0] })).rejects.toThrow("backup_is_primary");
    await assignBackup(db, admin, { assignmentId: a.id, backupUserId: outsider });
    expect(await status(a.id)).toBe("backup_assigned");
    const t = await todayFor(db, outsider, NOW);
    expect(t.backups.map((x) => x.part)).toEqual([a.partNumber]);
    const sess = await fin(outsider, a.id, "key-00000002");
    expect(sess.kind).toBe("backup"); expect(await status(a.id)).toBe("completed_by_backup");
    await expect(fin(users[0], a.id, "key-00000003")).rejects.toThrow("already_completed");
    await assignBackup(db, admin, { assignmentId: b.id, backupUserId: outsider });
    await fin(users[1], b.id, "key-00000004");
    await expect(fin(outsider, b.id, "key-00000005")).rejects.toThrow("already_completed");
    expect(await status(b.id)).toBe("completed");
  });
  it("undoing a backup reading restores backup_assigned; cancelled backup loses access", async () => {
    const { g, users } = await setup(2); const bk = await mkUser("bk");
    await rollover(db, noProvider, NOW);
    const a = await asg(g.id, 1);
    await assignBackup(db, admin, { assignmentId: a.id, backupUserId: bk });
    await startReading(db, bk, a.id, NOW); await fin(bk, a.id, "key-00000006");
    await expect(undoReading(db, users[0], a.id, {}, LATER)).rejects.toThrow("forbidden");
    expect((await undoReading(db, bk, a.id, {}, LATER)).status).toBe("backup_assigned");
    await cancelBackup(db, admin, a.id);
    expect(await status(a.id)).toBe("assigned");
    await expect(fin(bk, a.id, "key-00000007")).rejects.toThrow("forbidden");
    await fin(users[0], a.id, "key-00000008");
    expect(await status(a.id)).toBe("completed");
  });
});
describe("make-up (Case 10)", () => {
  it("is an independent extra reading: day and status stay as they were, and it is idempotent", async () => {
    const { g, users } = await setup(2);
    await rollover(db, noProvider, NOW);
    const a = await asg(g.id, 1);
    await expect(finishMakeup(db, users[0], { assignmentId: a.id, idempotencyKey: "key-00000009" }, LATER)).rejects.toThrow("not_missed"); // day still open
    await rollover(db, noProvider, T("2026-09-23T10:00:00Z")); // days later
    expect((await missedFor(db, users[0])).map((x) => x.id)).toContain(a.id);
    await expect(finishMakeup(db, users[1], { assignmentId: a.id, idempotencyKey: "key-00000010" })).rejects.toThrow("forbidden");
    const m1 = await finishMakeup(db, users[0], { assignmentId: a.id, idempotencyKey: "key-00000011" }, T("2026-09-23T10:00:00Z"));
    const m2 = await finishMakeup(db, users[0], { assignmentId: a.id, idempotencyKey: "key-00000012" }, T("2026-09-23T10:01:00Z"));
    expect(m1.kind).toBe("makeup"); expect(m2.id).toBe(m1.id);
    expect(await status(a.id)).toBe("missed");
    const [day] = await pg.select().from(s.khatmahDays).where(eq(s.khatmahDays.id, a.khatmahDayId));
    expect(day.status).toBe("closed");
    expect((await missedFor(db, users[0])).map((x) => x.id)).not.toContain(a.id);
    await undoMakeup(db, users[0], a.id, {}, T("2026-09-23T11:00:00Z"));
    expect((await missedFor(db, users[0])).map((x) => x.id)).toContain(a.id);
  });
});
describe("membership edge cases (Cases 1, 2, 12)", () => {
  it("removed before the day: part has no owner; removed during the day: keeps the part until it ends", async () => {
    const { g, users } = await setup(3);
    await removeMember(db, admin, { groupId: g.id, userId: users[2] });
    await rollover(db, noProvider, NOW);
    expect((await asg(g.id, 3)).primaryUserId).toBeNull();
    await removeMember(db, admin, { groupId: g.id, userId: users[0] });
    const t = await todayFor(db, users[0], LATER);
    expect(t.state === "open" && t.mine?.part).toBe((await asg(g.id, 1)).partNumber);
    await fin(users[0], (await asg(g.id, 1)).id, "key-00000013");
  });
  it("growing the group mid-day changes tomorrow, not today", async () => {
    const { g } = await setup(10); const extra = await mkUser("x");
    await rollover(db, noProvider, NOW);
    await addMember(db, admin, { groupId: g.id, userId: extra, slot: 11 });
    await rollover(db, noProvider, NOW);
    const count = async (date: string) => { const [d] = await pg.select().from(s.khatmahDays).where(and(eq(s.khatmahDays.groupId, g.id), eq(s.khatmahDays.localDate, date))); return (await pg.select().from(s.partAssignments).where(eq(s.partAssignments.khatmahDayId, d.id))).length; };
    expect(await count(D1)).toBe(10);
    await rollover(db, noProvider, T("2026-09-21T10:00:00Z"));
    expect(await count("2026-09-21")).toBe(11);
  });
});
