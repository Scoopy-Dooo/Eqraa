import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { createRequire } from "node:module";
import { eq, and } from "drizzle-orm";
import * as s from "../src/db/schema";
import { createGroup, addMember, type Db } from "../src/lib/groups";
import { rollover } from "../src/lib/rollover";
import { finishReading } from "../src/lib/reading";
import { historyView, dayDetail } from "../src/lib/history";

const { pushSchema } = createRequire(import.meta.url)("drizzle-kit/api");
const pg = drizzle(new PGlite(), { schema: s });
const db = pg as unknown as Db;
const noProvider = { timings: async () => null };
const T = (x: string) => new Date(x);

let n = 0;
let admin: string, g: { id: string }, u1: string, u2: string;

const mkUser = async (name: string, lastName?: string) =>
  (
    await pg
      .insert(s.users)
      .values({
        firstName: name,
        lastName,
        phoneE164: `+2499300${String(++n).padStart(5, "0")}`,
        pinHash: "x",
        gender: "male",
        avatarKey: "m1",
      })
      .returning()
  )[0].id;

const asg = async (slot: number, date: string) => {
  const [d] = await pg
    .select()
    .from(s.khatmahDays)
    .where(
      and(eq(s.khatmahDays.groupId, g.id), eq(s.khatmahDays.localDate, date))
    );
  return (
    await pg
      .select()
      .from(s.partAssignments)
      .where(
        and(
          eq(s.partAssignments.khatmahDayId, d.id),
          eq(s.partAssignments.slot, slot)
        )
      )
  )[0];
};

let k = 0;
const fin = async (u: string, slot: number, date: string, at: string) =>
  finishReading(
    db,
    u,
    {
      assignmentId: (await asg(slot, date)).id,
      idempotencyKey: `key-${String(++k).padStart(8, "0")}`,
    },
    T(at)
  );

beforeAll(async () => {
  await (await pushSchema(s, pg as never)).apply();
  admin = await mkUser("Admin");
  u1 = await mkUser("Ali", "Ahmed");
  u2 = await mkUser("Sara", "Mohamed");
  g = await createGroup(db, admin, {
    name: "TestGroup",
    capacity: 2,
    startDate: "2026-09-01",
  });
  await addMember(db, admin, { groupId: g.id, userId: u1, slot: 1 });
  await addMember(db, admin, { groupId: g.id, userId: u2, slot: 2 });

  // Create 3 closed days
  await rollover(db, noProvider, T("2026-09-20T10:00:00Z"));
  await fin(u1, 1, "2026-09-20", "2026-09-20T11:00:00Z");
  await fin(u2, 2, "2026-09-20", "2026-09-20T11:00:00Z");
  await rollover(db, noProvider, T("2026-09-21T10:00:00Z"));

  await rollover(db, noProvider, T("2026-09-22T10:00:00Z"));
  await fin(u1, 1, "2026-09-21", "2026-09-21T11:00:00Z");
  // u2 misses day 21
  await rollover(db, noProvider, T("2026-09-23T10:00:00Z"));
}, 60_000);

describe("historyView", () => {
  it("returns empty for user with no group", async () => {
    const orphan = await mkUser("Orphan");
    const { days, total } = await historyView(db, orphan);
    expect(days).toEqual([]);
    expect(total).toBe(0);
  });

  it("returns closed days for user's groups, newest first", async () => {
    const { days } = await historyView(db, u1);
    expect(days.length).toBeGreaterThan(0);
    // Day 22 closed but nothing happened, day 21 had activity
    expect(days[0].date).toBe("2026-09-22");
    expect(days[1].date).toBe("2026-09-21");
  });

  it("shows correct progress for each day", async () => {
    const { days } = await historyView(db, u1);
    const day20 = days.find((d) => d.date === "2026-09-20");
    expect(day20?.completed).toBe(true);
    expect(day20?.done).toBe(2);
    expect(day20?.total).toBe(2);

    const day21 = days.find((d) => d.date === "2026-09-21");
    expect(day21?.completed).toBe(false);
    expect(day21?.done).toBe(1);
    expect(day21?.total).toBe(2);
  });

  it("never includes phone numbers", async () => {
    const { days } = await historyView(db, u1);
    const json = JSON.stringify(days);
    expect(json).not.toContain("+249");
    expect(json).not.toContain("phone");
  });

  it("supports pagination", async () => {
    const page1 = await historyView(db, u1, 1, 1);
    const page2 = await historyView(db, u1, 2, 1);
    expect(page1.days.length).toBe(1);
    expect(page2.days.length).toBe(1);
    expect(page1.days[0].dayId).not.toBe(page2.days[0].dayId);
  });
});

describe("dayDetail", () => {
  it("returns null for non-existent day", async () => {
    const detail = await dayDetail(
      db,
      u1,
      "00000000-0000-0000-0000-000000000000"
    );
    expect(detail).toBeNull();
  });

  it("returns null if user was not in the group", async () => {
    const outsider = await mkUser("Outsider");
    const [day] = await pg
      .select({ id: s.khatmahDays.id })
      .from(s.khatmahDays)
      .where(eq(s.khatmahDays.localDate, "2026-09-20"));

    const detail = await dayDetail(db, outsider, day.id);
    expect(detail).toBeNull();
  });

  it("returns complete day information with all parts", async () => {
    const [day] = await pg
      .select({ id: s.khatmahDays.id })
      .from(s.khatmahDays)
      .where(eq(s.khatmahDays.localDate, "2026-09-20"));

    const detail = await dayDetail(db, u1, day.id);
    expect(detail).not.toBeNull();
    expect(detail?.dayNumber).toBe(20);
    expect(detail?.date).toBe("2026-09-20");
    expect(detail?.groupName).toBe("TestGroup");
    expect(detail?.parts.length).toBe(2);
  });

  it("shows reader names with first and last name", async () => {
    const [day] = await pg
      .select({ id: s.khatmahDays.id })
      .from(s.khatmahDays)
      .where(eq(s.khatmahDays.localDate, "2026-09-20"));

    const detail = await dayDetail(db, u1, day.id);
    // Find the part assigned to slot 1 (which should be Ali Ahmed)
    const slot1Part = detail?.parts[0]; // parts are ordered by slot
    expect(slot1Part?.readerName).toBe("Ali Ahmed");
  });

  it("shows missed parts separately", async () => {
    const [day] = await pg
      .select({ id: s.khatmahDays.id })
      .from(s.khatmahDays)
      .where(eq(s.khatmahDays.localDate, "2026-09-21"));

    const detail = await dayDetail(db, u1, day.id);
    const missedParts = detail?.parts.filter((p) => p.status === "missed");
    expect(missedParts?.length).toBe(1);
  });

  it("never includes phone numbers in any field", async () => {
    const [day] = await pg
      .select({ id: s.khatmahDays.id })
      .from(s.khatmahDays)
      .where(eq(s.khatmahDays.localDate, "2026-09-20"));

    const detail = await dayDetail(db, u1, day.id);
    const json = JSON.stringify(detail);
    expect(json).not.toContain("+249");
    expect(json).not.toContain("phone");
  });
});
