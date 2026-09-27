import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { createRequire } from "node:module";
import { eq, and } from "drizzle-orm";
import * as s from "../src/db/schema";
import { createGroup, addMember, replaceMember, type Db } from "../src/lib/groups";
import { rollover } from "../src/lib/rollover";
import { startReading, finishReading, undoReading, todayFor } from "../src/lib/reading";
const { pushSchema } = createRequire(import.meta.url)("drizzle-kit/api");
const pg = drizzle(new PGlite(), { schema: s });
const db = pg as unknown as Db;
const noProvider = { timings: async () => null }; // fallback Fajr = 03:00 UTC (05:00 Khartoum)
const T = (x: string) => new Date(x);
let n = 0, admin: string;
const mkUser = async (name: string) => (await pg.insert(s.users).values({ firstName: name, phoneE164: `+2499100${String(++n).padStart(5, "0")}`, pinHash: "x", gender: "male", avatarKey: "m1" }).returning())[0].id;
async function setup(cap: number, members = cap) {
  const g = await createGroup(db, admin, { name: "g", capacity: cap, startDate: "2026-09-01" }), users: string[] = [];
  for (let i = 1; i <= members; i++) { const u = await mkUser(`u${i}`); users.push(u); await addMember(db, admin, { groupId: g.id, userId: u, slot: i }); }
  return { g, users };
}
const days = (gid: string) => pg.select().from(s.khatmahDays).where(eq(s.khatmahDays.groupId, gid)).orderBy(s.khatmahDays.localDate);
const asg = async (gid: string, slot: number, date: string) => { const [d] = await pg.select().from(s.khatmahDays).where(and(eq(s.khatmahDays.groupId, gid), eq(s.khatmahDays.localDate, date))); return (await pg.select().from(s.partAssignments).where(and(eq(s.partAssignments.khatmahDayId, d.id), eq(s.partAssignments.slot, slot))))[0]; };
beforeAll(async () => { await (await pushSchema(s, pg as never)).apply(); admin = await mkUser("admin"); }, 60_000);
describe("rollover", () => {
  it("opens the right day with rotation parts, and is idempotent", async () => {
    const { g } = await setup(12);
    await rollover(db, noProvider, T("2026-09-20T10:00:00Z")); await rollover(db, noProvider, T("2026-09-20T10:05:00Z"));
    const d = await days(g.id);
    expect(d.length).toBe(1); expect(d[0].dayNumber).toBe(20);
    expect((await asg(g.id, 1, "2026-09-20")).partNumber).toBe(20);
    expect((await asg(g.id, 12, "2026-09-20")).partNumber).toBe(1);
    expect((await pg.select().from(s.partAssignments).where(eq(s.partAssignments.khatmahDayId, d[0].id))).length).toBe(12);
  });
  it("stays on the same day until Fajr, then starts the next and closes the old (unread -> missed)", async () => {
    const { g } = await setup(3);
    await rollover(db, noProvider, T("2026-09-20T10:00:00Z"));
    const a = await asg(g.id, 1, "2026-09-20");
    await rollover(db, noProvider, T("2026-09-21T02:59:00Z"));
    expect((await days(g.id)).length).toBe(1);
    await rollover(db, noProvider, T("2026-09-21T03:00:00Z"));
    const d = await days(g.id);
    expect(d.map((x) => x.status)).toEqual(["closed", "open"]);
    expect((await asg(g.id, 1, "2026-09-20")).status).toBe("missed");
    expect((await asg(g.id, 1, "2026-09-21")).partNumber).toBe(((a.partNumber) % 30) + 1);
  });
});
describe("reading", () => {
  it("start -> finish, double press and retries are idempotent, others are forbidden", async () => {
    const { g, users } = await setup(3);
    await rollover(db, noProvider, T("2026-09-20T10:00:00Z"));
    const a = await asg(g.id, 1, "2026-09-20"), now = T("2026-09-20T11:00:00Z");
    await expect(startReading(db, users[1], a.id, now)).rejects.toThrow("forbidden");
    await startReading(db, users[0], a.id, now);
    const f1 = await finishReading(db, users[0], { assignmentId: a.id, idempotencyKey: "key-aaaaaaaa" }, now);
    const f2 = await finishReading(db, users[0], { assignmentId: a.id, idempotencyKey: "key-aaaaaaaa" }, now);
    const f3 = await finishReading(db, users[0], { assignmentId: a.id, idempotencyKey: "key-bbbbbbbb" }, now);
    expect(f2.id).toBe(f1.id); expect(f3.id).toBe(f1.id);
    expect((await pg.select().from(s.readingSessions).where(eq(s.readingSessions.partAssignmentId, a.id))).length).toBe(1);
    const t = await todayFor(db, users[0], now);
    expect(t.state === "open" && t.progress).toEqual({ done: 1, total: 3 });
  });
  it("rejects finishing after the day ends; offline time inside the window is honoured", async () => {
    const { g, users } = await setup(2);
    await rollover(db, noProvider, T("2026-09-20T10:00:00Z"));
    const a = await asg(g.id, 1, "2026-09-20"), b = await asg(g.id, 2, "2026-09-20");
    await expect(finishReading(db, users[0], { assignmentId: a.id, idempotencyKey: "key-cccccccc" }, T("2026-09-21T03:00:01Z"))).rejects.toThrow("day_closed");
    const s2 = await finishReading(db, users[1], { assignmentId: b.id, idempotencyKey: "key-dddddddd", clientTime: T("2026-09-20T12:00:00Z"), source: "offline_sync" }, T("2026-09-20T13:00:00Z"));
    expect(s2.finishedAt?.toISOString()).toBe("2026-09-20T12:00:00.000Z");
  });
  it("only the confirmer can undo, and only until the day ends", async () => {
    const { g, users } = await setup(2);
    await rollover(db, noProvider, T("2026-09-20T10:00:00Z"));
    const a = await asg(g.id, 1, "2026-09-20"), now = T("2026-09-20T11:00:00Z");
    await finishReading(db, users[0], { assignmentId: a.id, idempotencyKey: "key-eeeeeeee" }, now);
    await expect(undoReading(db, users[1], a.id, {}, now)).rejects.toThrow("forbidden");
    await expect(undoReading(db, users[0], a.id, {}, T("2026-09-21T04:00:00Z"))).rejects.toThrow("day_closed");
    expect((await undoReading(db, users[0], a.id, {}, now)).status).toBe("assigned");
    const acts = (await pg.select().from(s.auditLogs)).map((r) => r.action);
    expect(acts).toContain("reading.confirm"); expect(acts).toContain("reading.undo");
  });
  it("a replacement takes over an unread part, but not one already read", async () => {
    const { g, users } = await setup(2);
    await rollover(db, noProvider, T("2026-09-20T10:00:00Z"));
    await finishReading(db, users[1], { assignmentId: (await asg(g.id, 2, "2026-09-20")).id, idempotencyKey: "key-ffffffff" }, T("2026-09-20T11:00:00Z"));
    const [x, y] = [await mkUser("x"), await mkUser("y")];
    await replaceMember(db, admin, { groupId: g.id, oldUserId: users[0], newUserId: x });
    await replaceMember(db, admin, { groupId: g.id, oldUserId: users[1], newUserId: y });
    expect((await asg(g.id, 1, "2026-09-20")).primaryUserId).toBe(x);
    expect((await asg(g.id, 2, "2026-09-20")).primaryUserId).toBe(users[1]);
  });
});
