import { and, eq, inArray, isNull, lte, max } from "drizzle-orm";
import * as s from "../db/schema";
import { partFor, dayNumber } from "../domain/rotation";
import { addDays, fajrAt, khartoumDate, type PrayerProvider } from "./prayer";
import { refreshStreaks } from "./streak";
import { notifyDayClosed, notifyKhatmahStarted } from "./reminders";
import type { Db } from "./groups";
/**
 * Idempotent day rollover (safe to run every few minutes, or lazily): opens the current Fajr-to-Fajr day for each
 * active group, catches up any missed days, and closes ended days (unread parts become Missed, BR-P6).
 */
export async function rollover(db: Db, provider: PrayerProvider, now = new Date(), opts: { groupId?: string } = {}) {
  const local = khartoumDate(now);
  const current = now >= (await fajrAt(db, provider, local)) ? local : addDays(local, -1);
  const gs = await db.select().from(s.groups).where(opts.groupId ? and(eq(s.groups.status, "active"), eq(s.groups.id, opts.groupId)) : eq(s.groups.status, "active"));
  for (const g of gs) {
    const [{ last }] = await db.select({ last: max(s.khatmahDays.localDate) }).from(s.khatmahDays).where(eq(s.khatmahDays.groupId, g.id));
    let d = last ? addDays(last, 1) : g.startDate > current ? g.startDate : current;
    for (let n = 0; d <= current && n < 60; d = addDays(d, 1), n++) {
      const startsAt = await fajrAt(db, provider, d), endsAt = await fajrAt(db, provider, addDays(d, 1));
      const isFirstDay = !last && n === 0;
      await db.transaction(async (tx) => {
        const [day] = await tx.insert(s.khatmahDays).values({ groupId: g.id, dayNumber: dayNumber(g.startDate, d), localDate: d, startsAt, endsAt, sizeSnapshot: g.capacity }).onConflictDoNothing().returning();
        if (!day) return;
        const ms = await tx.select().from(s.groupMembers).where(and(eq(s.groupMembers.groupId, g.id), isNull(s.groupMembers.leftAt)));
        await tx.insert(s.partAssignments).values(Array.from({ length: g.capacity }, (_, i) => ({
          khatmahDayId: day.id, slot: i + 1, partNumber: partFor(i + 1, day.dayNumber, g.startOffset), primaryUserId: ms.find((m) => m.slot === i + 1)?.userId ?? null,
        }))).onConflictDoNothing();
        // BR-35 "New Khatmah started": sent once, for a group's very first day, not on every daily rotation.
        if (isFirstDay) await notifyKhatmahStarted(tx, g.id, g.name);
      });
    }
  }
  const due = await db.select({ id: s.khatmahDays.id, groupId: s.khatmahDays.groupId, groupName: s.groups.name }).from(s.khatmahDays).innerJoin(s.groups, eq(s.groups.id, s.khatmahDays.groupId))
    .where(and(eq(s.khatmahDays.status, "open"), lte(s.khatmahDays.endsAt, now), gs.length ? inArray(s.khatmahDays.groupId, gs.map((g) => g.id)) : undefined));
  for (const day of due) await db.transaction(async (tx) => {
    await tx.update(s.khatmahDays).set({ status: "closed" }).where(eq(s.khatmahDays.id, day.id));
    await tx.update(s.partAssignments).set({ status: "missed" }).where(and(eq(s.partAssignments.khatmahDayId, day.id), inArray(s.partAssignments.status, ["assigned", "reading", "backup_assigned"])));
    await notifyDayClosed(tx, day.id, day.groupName); // BR-16: alerts the reader and the admins for each missed part
  });
  // Streaks are evaluated from closed days (BR-S7)
  const ids = (await db.selectDistinct({ id: s.partAssignments.primaryUserId }).from(s.partAssignments).where(inArray(s.partAssignments.khatmahDayId, due.map((d) => d.id)))).flatMap((r) => (r.id ? [r.id] : []));
  await refreshStreaks(db, ids);
}
