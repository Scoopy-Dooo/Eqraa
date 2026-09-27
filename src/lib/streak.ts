import { and, asc, eq } from "drizzle-orm";
import * as s from "../db/schema";
import { computeStreak } from "../domain/streak";
import { notify } from "./notify";
import type { Db } from "./groups";
/**
 * Replays every closed day for the user: always consistent with the assignments, even after late syncs or admin
 * undo. Compares against the previously stored result to fire at most one protection/break notification per date,
 * deduped by that date so a replay (e.g. an admin undo hours later) never re-sends it.
 */
export async function recomputeStreak(db: Db, userId: string) {
  const rows = await db.select({ status: s.partAssignments.status, date: s.khatmahDays.localDate }).from(s.partAssignments)
    .innerJoin(s.khatmahDays, eq(s.khatmahDays.id, s.partAssignments.khatmahDayId))
    .where(and(eq(s.partAssignments.primaryUserId, userId), eq(s.khatmahDays.status, "closed"))).orderBy(asc(s.khatmahDays.localDate));
  const [before] = await db.select().from(s.userStreaks).where(eq(s.userStreaks.userId, userId));
  const r = computeStreak(rows.map((x) => x.status === "completed"));
  const lastDate = rows.at(-1)?.date ?? null;
  const v = { ...r, lastEvaluatedDate: lastDate, updatedAt: new Date() };
  await db.insert(s.userStreaks).values({ userId, ...v }).onConflictDoUpdate({ target: s.userStreaks.userId, set: v });
  if (lastDate && before) {
    if (r.protections > before.protections) await notify(db, { userId, type: "streak_protection_earned", dedupeKey: `protect:${userId}:${lastDate}` });
    else if (r.current === 0 && before.current > 0) await notify(db, { userId, type: "streak_broken", dedupeKey: `broken:${userId}:${lastDate}` });
  }
  return r;
}
export const refreshStreaks = async (db: Db, ids: string[]) => { for (const id of ids) await recomputeStreak(db, id); };
export async function getStreak(db: Db, userId: string) {
  const [r] = await db.select().from(s.userStreaks).where(eq(s.userStreaks.userId, userId));
  return r ?? { current: 0, best: 0, protections: 0, toward: 0 };
}
