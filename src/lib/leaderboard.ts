import { and, eq, gte, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
import * as s from "../db/schema";
import { periodRange, startInstant, type Period } from "../domain/periods";
import { khartoumDate } from "./prayer";
import type { Db } from "./groups";
export type Row = { rank: number; userId: string; name: string; avatarKey: string; partsRead: number; commitment: number; streak: number };
/** Derived on demand from source records (no cached stats to drift). Never selects phone numbers (BR-L4). */
export async function leaderboard(db: Db, i: { period: Period; scope: "group" | "all"; userId: string; now?: Date }): Promise<Row[]> {
  const range = periodRange(i.period, khartoumDate(i.now ?? new Date()));
  const members = await db.select({ userId: s.users.id, groupId: s.groupMembers.groupId, first: s.users.firstName, last: s.users.lastName, avatarKey: s.users.avatarKey })
    .from(s.groupMembers).innerJoin(s.users, eq(s.users.id, s.groupMembers.userId)).where(and(isNull(s.groupMembers.leftAt), eq(s.users.status, "active")));
  const mine = members.find((m) => m.userId === i.userId);
  const pool = i.scope === "all" ? members : mine ? members.filter((m) => m.groupId === mine.groupId) : [];
  if (!pool.length) return [];
  const ids = pool.map((m) => m.userId);
  const from = range && startInstant(range.from), to = range && startInstant(range.to);
  const parts = await db.select({ userId: s.readingSessions.userId, n: sql<number>`count(*)::int` }).from(s.readingSessions) // primary + backup + make-up readings
    .where(and(inArray(s.readingSessions.userId, ids), isNotNull(s.readingSessions.finishedAt), isNull(s.readingSessions.undoneAt), from ? gte(s.readingSessions.finishedAt, from) : undefined, to ? lt(s.readingSessions.finishedAt, to) : undefined)).groupBy(s.readingSessions.userId);
  const days = await db.select({ userId: s.partAssignments.primaryUserId, assigned: sql<number>`count(*)::int`, done: sql<number>`(count(*) filter (where ${s.partAssignments.status} = 'completed'))::int` })
    .from(s.partAssignments).innerJoin(s.khatmahDays, eq(s.khatmahDays.id, s.partAssignments.khatmahDayId))
    .where(and(inArray(s.partAssignments.primaryUserId, ids), eq(s.khatmahDays.status, "closed"), range ? gte(s.khatmahDays.localDate, range.from) : undefined, range ? lt(s.khatmahDays.localDate, range.to) : undefined)).groupBy(s.partAssignments.primaryUserId);
  const streaks = await db.select().from(s.userStreaks).where(inArray(s.userStreaks.userId, ids));
  const rows = pool.map((m) => {
    const d = days.find((x) => x.userId === m.userId);
    return { userId: m.userId, name: [m.first, m.last].filter(Boolean).join(" "), avatarKey: m.avatarKey, partsRead: parts.find((x) => x.userId === m.userId)?.n ?? 0,
      commitment: d && d.assigned ? Math.round((d.done / d.assigned) * 100) : 0, streak: streaks.find((x) => x.userId === m.userId)?.current ?? 0 };
  }).sort((a, b) => b.partsRead - a.partsRead || b.commitment - a.commitment || b.streak - a.streak || a.name.localeCompare(b.name));
  return rows.map((r, idx) => { const p = rows[idx - 1]; const tie = p && p.partsRead === r.partsRead && p.commitment === r.commitment && p.streak === r.streak; return { ...r, rank: tie ? 0 : idx + 1 }; })
    .map((r, idx, all) => ({ ...r, rank: r.rank || all[idx - 1].rank })); // ties share a rank
}
