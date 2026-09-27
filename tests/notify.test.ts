import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { createRequire } from "node:module";
import { eq, and } from "drizzle-orm";
import * as s from "../src/db/schema";
import { createGroup, addMember, type Db } from "../src/lib/groups";
import { rollover } from "../src/lib/rollover";
import { assignBackup } from "../src/lib/backup";
import { finishReading } from "../src/lib/reading";
import { notify } from "../src/lib/notify";
import { remindersTick, notifyDayClosed } from "../src/lib/reminders";
const { pushSchema } = createRequire(import.meta.url)("drizzle-kit/api");
const pg = drizzle(new PGlite(), { schema: s });
const db = pg as unknown as Db;
const noProvider = { timings: async () => null };
const T = (x: string) => new Date(x);
let n = 0, admin: string;
const mkUser = async (name: string) => (await pg.insert(s.users).values({ firstName: name, phoneE164: `+2499500${String(++n).padStart(5, "0")}`, pinHash: "x", gender: "male", avatarKey: "m1" }).returning())[0].id;
const inbox = (userId: string) => pg.select().from(s.notifications).where(eq(s.notifications.userId, userId));
beforeAll(async () => { await (await pushSchema(s, pg as never)).apply(); admin = await mkUser("admin"); await pg.insert(s.adminRoles).values({ userId: admin, role: "super_admin" }); }, 60_000);
describe("notify()", () => {
  it("writes to the inbox with rendered title/body, using the default template", async () => {
    const u = await mkUser("u1");
    await notify(db, { userId: u, type: "backup_assigned", vars: { part: 5, group: "التجربة" } });
    const [row] = await inbox(u);
    expect(row.payload).toMatchObject({ title: "أنت بديل اليوم", body: "عيّنك المشرف بديلًا للجزء 5 في التجربة." });
  });
  it("dedupeKey guarantees at-most-once even if called twice", async () => {
    const u = await mkUser("u2");
    await notify(db, { userId: u, type: "khatmah_started", vars: { group: "g" }, dedupeKey: "dk1" });
    await notify(db, { userId: u, type: "khatmah_started", vars: { group: "g" }, dedupeKey: "dk1" });
    expect((await inbox(u)).length).toBe(1);
  });
  it("an optional type is skipped once the user disables it; a critical type is not", async () => {
    const u = await mkUser("u3");
    await pg.insert(s.notificationPreferences).values({ userId: u, type: "backup_assigned", enabled: 0 });
    await notify(db, { userId: u, type: "backup_assigned", vars: { part: 1, group: "g" } });
    await notify(db, { userId: u, type: "streak_broken" });
    const rows = await inbox(u);
    expect(rows.map((r) => r.type)).toEqual(["streak_broken"]);
  });
  it("admin edits to a template override the default", async () => {
    const u = await mkUser("u4");
    await pg.insert(s.notificationTemplates).values({ key: "backup_assigned", locale: "ar", title: "نص مخصص", body: "بديل للجزء {{part}}" });
    await notify(db, { userId: u, type: "backup_assigned", vars: { part: 9, group: "g" } });
    expect((await inbox(u))[0].payload).toMatchObject({ title: "نص مخصص", body: "بديل للجزء 9" });
  });
});
describe("triggers wired into the domain", () => {
  it("assigning backup notifies the backup reader", async () => {
    const g = await createGroup(db, admin, { name: "gA", capacity: 2, startDate: "2026-09-01" }), u1 = await mkUser("a1"), u2 = await mkUser("a2"), bk = await mkUser("bk1");
    await addMember(db, admin, { groupId: g.id, userId: u1, slot: 1 }); await addMember(db, admin, { groupId: g.id, userId: u2, slot: 2 });
    await rollover(db, noProvider, T("2026-09-20T10:00:00Z"));
    const [asg] = await pg.select().from(s.partAssignments).innerJoin(s.khatmahDays, eq(s.khatmahDays.id, s.partAssignments.khatmahDayId)).where(and(eq(s.khatmahDays.groupId, g.id), eq(s.partAssignments.slot, 1)));
    await assignBackup(db, admin, { assignmentId: asg.part_assignments.id, backupUserId: bk });
    expect((await inbox(bk)).map((r) => r.type)).toContain("backup_assigned");
  });
  it("adding a member sends a one-time 'assigned' notification, deduped per membership", async () => {
    const g = await createGroup(db, admin, { name: "gB", capacity: 3, startDate: "2026-09-01" }), u = await mkUser("newbie");
    await addMember(db, admin, { groupId: g.id, userId: u, slot: 1 });
    expect((await inbox(u)).filter((r) => r.type === "assigned").length).toBe(1);
  });
  it("day close notifies the reader and every admin for a missed part, and completion for a full day", async () => {
    const g = await createGroup(db, admin, { name: "gC", capacity: 2, startDate: "2026-09-01" }), u1 = await mkUser("c1"), u2 = await mkUser("c2");
    await addMember(db, admin, { groupId: g.id, userId: u1, slot: 1 }); await addMember(db, admin, { groupId: g.id, userId: u2, slot: 2 });
    await rollover(db, noProvider, T("2026-09-20T10:00:00Z"));
    const [a1] = await pg.select().from(s.partAssignments).innerJoin(s.khatmahDays, eq(s.khatmahDays.id, s.partAssignments.khatmahDayId)).where(and(eq(s.khatmahDays.groupId, g.id), eq(s.partAssignments.slot, 1)));
    await finishReading(db, u1, { assignmentId: a1.part_assignments.id, idempotencyKey: "key-n0000001" }, T("2026-09-20T11:00:00Z"));
    await rollover(db, noProvider, T("2026-09-21T10:00:00Z")); // u2's part goes missing, day closes
    expect((await inbox(u2)).map((r) => r.type)).toContain("missing_part_user");
    expect((await inbox(admin)).map((r) => r.type)).toContain("missing_part_admin");
    expect((await inbox(u1)).map((r) => r.type)).not.toContain("khatmah_completed"); // day 1 had a miss
  });
  it("a fully completed day sends khatmah_completed to every reader", async () => {
    const g = await createGroup(db, admin, { name: "gD", capacity: 1, startDate: "2026-09-01" }), u = await mkUser("d1");
    await addMember(db, admin, { groupId: g.id, userId: u, slot: 1 });
    await rollover(db, noProvider, T("2026-09-20T10:00:00Z"));
    const [a] = await pg.select().from(s.partAssignments).innerJoin(s.khatmahDays, eq(s.khatmahDays.id, s.partAssignments.khatmahDayId)).where(eq(s.khatmahDays.groupId, g.id));
    await finishReading(db, u, { assignmentId: a.part_assignments.id, idempotencyKey: "key-n0000002" }, T("2026-09-20T11:00:00Z"));
    await rollover(db, noProvider, T("2026-09-21T10:00:00Z"));
    expect((await inbox(u)).map((r) => r.type)).toContain("khatmah_completed");
  });
  it("first-ever day of a group sends khatmah_started once to members, not on later days", async () => {
    const g = await createGroup(db, admin, { name: "gE", capacity: 1, startDate: "2026-09-20" }), u = await mkUser("e1");
    await addMember(db, admin, { groupId: g.id, userId: u, slot: 1 });
    await rollover(db, noProvider, T("2026-09-20T10:00:00Z"));
    await rollover(db, noProvider, T("2026-09-21T10:00:00Z"));
    await rollover(db, noProvider, T("2026-09-22T10:00:00Z"));
    expect((await inbox(u)).filter((r) => r.type === "khatmah_started").length).toBe(1);
  });
  it("remindersTick sends a reading reminder once Dhuhr has passed, and only once", async () => {
    const g = await createGroup(db, admin, { name: "gF", capacity: 1, startDate: "2026-09-01" }), u = await mkUser("f1");
    await addMember(db, admin, { groupId: g.id, userId: u, slot: 1 });
    await rollover(db, noProvider, T("2026-09-20T03:00:00Z")); // Fajr fallback 03:00 UTC
    await remindersTick(db, noProvider, T("2026-09-20T09:00:00Z")); // before fallback Dhuhr (10:15 UTC): nothing yet
    expect((await inbox(u)).some((r) => r.type === "reading_reminder")).toBe(false);
    await remindersTick(db, noProvider, T("2026-09-20T10:20:00Z")); // past Dhuhr
    await remindersTick(db, noProvider, T("2026-09-20T10:30:00Z")); // idempotent
    expect((await inbox(u)).filter((r) => r.type === "reading_reminder").length).toBe(1);
  });
  it("strong reminder fires near the end for an unread part, plus streak_warning if the user has a streak", async () => {
    const g = await createGroup(db, admin, { name: "gG", capacity: 1, startDate: "2026-09-01" }), u = await mkUser("g1");
    await addMember(db, admin, { groupId: g.id, userId: u, slot: 1 });
    await pg.insert(s.userStreaks).values({ userId: u, current: 3, best: 3, protections: 0, toward: 3 });
    await rollover(db, noProvider, T("2026-09-20T03:00:00Z"));
    await remindersTick(db, noProvider, T("2026-09-21T02:10:00Z")); // 50 min before the 03:00 end, inside the 60-min default window
    const types = (await inbox(u)).map((r) => r.type);
    expect(types).toContain("strong_reminder"); expect(types).toContain("streak_warning");
  });
});
