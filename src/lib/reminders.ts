import { and, eq, gt, inArray, isNull, lte } from "drizzle-orm";
import * as s from "../db/schema";
import { notify, notifyAdmins } from "./notify";
import { getStreak } from "./streak";
import { prayerTimesFor, type PrayerProvider } from "./prayer";
import type { Db } from "./groups";
export interface ReminderSettings { prayers: { dhuhr: boolean; asr: boolean; maghrib: boolean; isha: boolean }; strongBeforeEndMin: number; }
export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = { prayers: { dhuhr: true, asr: true, maghrib: true, isha: true }, strongBeforeEndMin: 60 };
export async function getReminderSettings(db: Db): Promise<ReminderSettings> {
  const [row] = await db.select().from(s.notificationSettings).where(eq(s.notificationSettings.key, "reminders"));
  if (!row) return DEFAULT_REMINDER_SETTINGS;
  const v = row.value as Partial<ReminderSettings>;
  return { prayers: { ...DEFAULT_REMINDER_SETTINGS.prayers, ...v.prayers }, strongBeforeEndMin: v.strongBeforeEndMin ?? DEFAULT_REMINDER_SETTINGS.strongBeforeEndMin };
}
const unread = new Set(["assigned", "reading", "backup_assigned"]);
const PRAYERS = ["dhuhr", "asr", "maghrib", "isha"] as const;
/**
 * Idempotent: safe to call every few minutes from the cron. A "day" runs Fajr-to-Fajr, so the four prayers between
 * (Dhuhr, Asr, Maghrib, Isha) of that same Khartoum calendar date fall inside it — each one due for a reminder can
 * fire once it has passed and the admin has that prayer enabled. The strong reminder still counts down to Fajr.
 */
export async function remindersTick(db: Db, provider: PrayerProvider, now = new Date()) {
  const cfg = await getReminderSettings(db);
  const days = await db.select({ d: s.khatmahDays, groupName: s.groups.name }).from(s.khatmahDays).innerJoin(s.groups, eq(s.groups.id, s.khatmahDays.groupId))
    .where(and(eq(s.khatmahDays.status, "open"), lte(s.khatmahDays.startsAt, now), gt(s.khatmahDays.endsAt, now)));
  for (const { d, groupName } of days) {
    const remainingMin = (d.endsAt.getTime() - now.getTime()) / 60000;
    const parts = await db.select().from(s.partAssignments).where(and(eq(s.partAssignments.khatmahDayId, d.id), inArray(s.partAssignments.status, ["assigned", "reading", "backup_assigned"])));
    if (parts.length && PRAYERS.some((p) => cfg.prayers[p])) {
      const t = await prayerTimesFor(db, provider, d.localDate);
      for (const prayer of PRAYERS) {
        if (!cfg.prayers[prayer] || now < t[prayer]) continue;
        for (const p of parts) if (p.primaryUserId && unread.has(p.status))
          await notify(db, { userId: p.primaryUserId, type: "reading_reminder", vars: { part: p.partNumber, group: groupName }, dedupeKey: `reminder:${p.id}:${prayer}` });
      }
    }
    if (remainingMin <= cfg.strongBeforeEndMin && remainingMin > 0) {
      for (const p of parts) {
        if (!p.primaryUserId || !unread.has(p.status)) continue;
        await notify(db, { userId: p.primaryUserId, type: "strong_reminder", vars: { part: p.partNumber, group: groupName }, dedupeKey: `strong:${p.id}` });
        if ((await getStreak(db, p.primaryUserId)).current > 0)
          await notify(db, { userId: p.primaryUserId, type: "streak_warning", vars: { part: p.partNumber }, dedupeKey: `warn:${p.id}` });
        const [b] = await db.select().from(s.backupAssignments).where(and(eq(s.backupAssignments.partAssignmentId, p.id), isNull(s.backupAssignments.cancelledAt)));
        if (b) await notify(db, { userId: b.backupUserId, type: "strong_reminder", vars: { part: p.partNumber, group: groupName }, dedupeKey: `strong:${p.id}:backup` });
      }
    }
  }
}
/** Called from rollover when a day closes: missed-part alerts and a completion message (BR-16, BR-35). */
export async function notifyDayClosed(db: Db, dayId: string, groupName: string) {
  const rows = await db.select().from(s.partAssignments).where(eq(s.partAssignments.khatmahDayId, dayId));
  const missed = rows.filter((p) => p.status === "missed");
  for (const p of missed) {
    if (p.primaryUserId) await notify(db, { userId: p.primaryUserId, type: "missing_part_user", vars: { part: p.partNumber, group: groupName }, dedupeKey: `missed_user:${p.id}` });
    await notifyAdmins(db, { type: "missing_part_admin", vars: { part: p.partNumber, group: groupName, name: "" }, dedupeKey: `missed_admin:${p.id}` });
  }
  if (missed.length === 0 && rows.length > 0) {
    const uids = [...new Set(rows.flatMap((p) => (p.primaryUserId ? [p.primaryUserId] : [])))];
    for (const uid of uids) await notify(db, { userId: uid, type: "khatmah_completed", vars: { group: groupName }, dedupeKey: `completed:${dayId}:${uid}` });
  }
}
/** Called from rollover when a group's very first day opens (BR-35 "New Khatmah started" — not sent every day, see README). */
export async function notifyKhatmahStarted(db: Db, groupId: string, groupName: string) {
  const ms = await db.select({ userId: s.groupMembers.userId }).from(s.groupMembers).where(and(eq(s.groupMembers.groupId, groupId), isNull(s.groupMembers.leftAt)));
  for (const m of ms) await notify(db, { userId: m.userId, type: "khatmah_started", vars: { group: groupName }, dedupeKey: `started:${groupId}:${m.userId}` });
}
