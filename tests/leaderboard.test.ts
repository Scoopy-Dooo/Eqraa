import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { createRequire } from "node:module";
import { eq, and } from "drizzle-orm";
import * as s from "../src/db/schema";
import { createGroup, addMember, type Db } from "../src/lib/groups";
import { rollover } from "../src/lib/rollover";
import { assignBackup } from "../src/lib/backup";
import { finishReading, finishMakeup } from "../src/lib/reading";
import { getStreak } from "../src/lib/streak";
import { leaderboard } from "../src/lib/leaderboard";
const { pushSchema } = createRequire(import.meta.url)("drizzle-kit/api");
const pg = drizzle(new PGlite(), { schema: s });
const db = pg as unknown as Db;
const noProvider = { timings: async () => null };
const T = (x: string) => new Date(x);
let n = 0, admin: string, g: { id: string }, u1: string, u2: string, bk: string;
const mkUser = async (name: string) => (await pg.insert(s.users).values({ firstName: name, phoneE164: `+2499300${String(++n).padStart(5, "0")}`, pinHash: "x", gender: "male", avatarKey: "m1" }).returning())[0].id;
const asg = async (slot: number, date: string) => { const [d] = await pg.select().from(s.khatmahDays).where(and(eq(s.khatmahDays.groupId, g.id), eq(s.khatmahDays.localDate, date))); return (await pg.select().from(s.partAssignments).where(and(eq(s.partAssignments.khatmahDayId, d.id), eq(s.partAssignments.slot, slot))))[0]; };
let k = 0; const fin = async (u: string, slot: number, date: string, at: string) => finishReading(db, u, { assignmentId: (await asg(slot, date)).id, idempotencyKey: `key-${String(++k).padStart(8, "0")}` }, T(at));
beforeAll(async () => {
  await (await pushSchema(s, pg as never)).apply();
  admin = await mkUser("admin"); u1 = await mkUser("Ali"); u2 = await mkUser("Sara"); bk = await mkUser("Backup");
  g = await createGroup(db, admin, { name: "g", capacity: 2, startDate: "2026-09-01" });
  await addMember(db, admin, { groupId: g.id, userId: u1, slot: 1 }); await addMember(db, admin, { groupId: g.id, userId: u2, slot: 2 });
  await rollover(db, noProvider, T("2026-09-20T10:00:00Z"));
  await fin(u1, 1, "2026-09-20", "2026-09-20T11:00:00Z");
  await assignBackup(db, admin, { assignmentId: (await asg(2, "2026-09-20")).id, backupUserId: bk }); await fin(bk, 2, "2026-09-20", "2026-09-20T11:00:00Z"); // u2's day-1 part read by backup
  await rollover(db, noProvider, T("2026-09-21T10:00:00Z"));
  await fin(u1, 1, "2026-09-21", "2026-09-21T11:00:00Z"); await fin(u2, 2, "2026-09-21", "2026-09-21T11:00:00Z");
  await rollover(db, noProvider, T("2026-09-22T10:00:00Z"));
  await rollover(db, noProvider, T("2026-09-23T10:00:00Z")); // day 22 closes with nobody having read
}, 60_000);
describe("streaks are evaluated when days close", () => {
  it("counts only the user's own readings, and a miss without protection resets", async () => {
    expect(await getStreak(db, u1)).toMatchObject({ current: 0, best: 2 });
    expect(await getStreak(db, u2)).toMatchObject({ current: 0, best: 1 }); // backup day did not count; day 21 did; day 22 missed
  });
  it("a backup reader gets no streak of their own", async () => { expect(await getStreak(db, bk)).toMatchObject({ current: 0 }); });
});
describe("leaderboard", () => {
  const now = T("2026-09-23T10:00:00Z");
  it("ranks by parts, then commitment; make-up counts parts but not commitment", async () => {
    await finishMakeup(db, u2, { assignmentId: (await asg(2, "2026-09-22")).id, idempotencyKey: "key-makeup01" }, now);
    const rows = await leaderboard(db, { period: "weekly", scope: "group", userId: u1, now });
    expect(rows.map((r) => [r.name, r.partsRead, r.commitment, r.rank])).toEqual([["Ali", 2, 67, 1], ["Sara", 2, 33, 2]]);
  });
  it("monthly and all agree here; scope=all includes every seated member; never exposes phones", async () => {
    for (const period of ["monthly", "all"] as const) expect((await leaderboard(db, { period, scope: "all", userId: u2, now })).length).toBe(2);
    const row = (await leaderboard(db, { period: "all", scope: "group", userId: u1, now }))[0];
    expect(Object.keys(row)).not.toContain("phone"); expect(JSON.stringify(row)).not.toContain("+249");
  });
  it("is empty for someone with no group in group scope; backup readings count for the backup", async () => {
    expect(await leaderboard(db, { period: "weekly", scope: "group", userId: bk, now })).toEqual([]);
    const sess = await pg.select().from(s.readingSessions).where(and(eq(s.readingSessions.userId, bk), eq(s.readingSessions.kind, "backup")));
    expect(sess.length).toBe(1);
  });
  it("ties share a rank", async () => {
    const rows = await leaderboard(db, { period: "weekly", scope: "group", userId: u1, now: T("2026-09-30T10:00:00Z") }); // next week: everyone at zero
    expect(rows.map((r) => r.rank)).toEqual([1, 1]);
  });
});
