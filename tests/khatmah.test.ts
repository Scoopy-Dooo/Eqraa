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
import { khatmahView } from "../src/lib/khatmah";

const { pushSchema } = createRequire(import.meta.url)("drizzle-kit/api");
const pg = drizzle(new PGlite(), { schema: s });
const db = pg as unknown as Db;
const noProvider = { timings: async () => null };
const T = (x: string) => new Date(x);

let n = 0;
let admin: string, g: { id: string }, u1: string, u2: string;

const mkUser = async (name: string) =>
  (
    await pg
      .insert(s.users)
      .values({
        firstName: name,
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
  admin = await mkUser("admin");
  u1 = await mkUser("Ali");
  u2 = await mkUser("Sara");
  g = await createGroup(db, admin, {
    name: "TestGroup",
    capacity: 2,
    startDate: "2026-09-01",
  });
  await addMember(db, admin, { groupId: g.id, userId: u1, slot: 1 });
  await addMember(db, admin, { groupId: g.id, userId: u2, slot: 2 });
  await rollover(db, noProvider, T("2026-09-20T10:00:00Z"));
}, 60_000);

describe("khatmahView", () => {
  it("returns no_group for a user not in any group", async () => {
    const orphan = await mkUser("Orphan");
    const view = await khatmahView(db, orphan);
    expect(view.state).toBe("no_group");
  });

  it("returns not_started when no day is open", async () => {
    const u3 = await mkUser("Ahmed");
    const g2 = await createGroup(db, admin, {
      name: "NewGroup",
      capacity: 1,
      startDate: "2030-01-01",
    });
    await addMember(db, admin, { groupId: g2.id, userId: u3, slot: 1 });
    const view = await khatmahView(db, u3, T("2026-09-20T10:00:00Z"));
    expect(view.state).toBe("not_started");
    if (view.state === "not_started") {
      expect(view.groupName).toBe("NewGroup");
    }
  });

  it("returns open day with all parts and progress", async () => {
    const view = await khatmahView(db, u1, T("2026-09-20T12:00:00Z"));
    expect(view.state).toBe("open");
    if (view.state === "open") {
      expect(view.groupName).toBe("TestGroup");
      expect(view.dayNumber).toBe(20);
      expect(view.parts.length).toBe(2);
      expect(view.progress).toEqual({ done: 0, total: 2 });
    }
  });

  it("marks current user's part with isCurrentUser=true", async () => {
    const view = await khatmahView(db, u1, T("2026-09-20T12:00:00Z"));
    if (view.state === "open") {
      const myPart = view.parts.find((p) => p.isCurrentUser);
      expect(myPart).toBeDefined();
      expect(myPart?.readerName).toBe("Ali");
    }
  });

  it("never includes phone numbers in output", async () => {
    const view = await khatmahView(db, u1, T("2026-09-20T12:00:00Z"));
    const json = JSON.stringify(view);
    expect(json).not.toContain("+249");
    expect(json).not.toContain("phone");
  });

  it("shows backup name when assigned", async () => {
    const bk = await mkUser("Backup");
    await assignBackup(db, admin, {
      assignmentId: (await asg(2, "2026-09-20")).id,
      backupUserId: bk,
    });
    const view = await khatmahView(db, u1, T("2026-09-20T12:00:00Z"));
    if (view.state === "open") {
      // Slot 2 has the backup
      const withBackup = view.parts[1]; // parts[1] is slot 2
      expect(withBackup.backupName).toBe("Backup");
    }
  });

  it("updates progress when parts are completed", async () => {
    await fin(u1, 1, "2026-09-20", "2026-09-20T13:00:00Z");
    const view = await khatmahView(db, u1, T("2026-09-20T14:00:00Z"));
    if (view.state === "open") {
      expect(view.progress).toEqual({ done: 1, total: 2 });
      // Slot 1 completed
      const completedPart = view.parts[0]; // parts[0] is slot 1
      expect(completedPart.status).toBe("completed");
    }
  });
});
