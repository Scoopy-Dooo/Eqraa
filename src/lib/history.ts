import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import * as s from "../db/schema";
import type { Db } from "./groups";

export type HistoryDay = {
  dayId: string;
  date: string;
  groupName: string;
  done: number;
  total: number;
  completed: boolean;
};

export type DayDetail = {
  dayNumber: number;
  date: string;
  groupName: string;
  parts: Array<{
    partNumber: number;
    readerName: string;
    status: string;
    backupName: string | null;
    completedByBackup: boolean;
  }>;
  makeups: Array<{
    partNumber: number;
    madeUpBy: string;
    madeUpAt: string;
  }>;
};

/**
 * Returns paginated list of closed days for groups the user was a member of.
 * Never includes phone numbers.
 */
export async function historyView(
  db: Db,
  userId: string,
  page = 1,
  perPage = 30
): Promise<{ days: HistoryDay[]; total: number }> {
  // Get all groups user was ever a member of
  const memberships = await db
    .select({ groupId: s.groupMembers.groupId })
    .from(s.groupMembers)
    .where(eq(s.groupMembers.userId, userId));

  if (!memberships.length) return { days: [], total: 0 };

  const groupIds = memberships.map((m) => m.groupId);

  // Count total closed days
  const countQuery = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(s.khatmahDays)
    .where(
      and(
        inArray(s.khatmahDays.groupId, groupIds),
        eq(s.khatmahDays.status, "closed")
      )
    );

  const totalCount = countQuery[0]?.count || 0;

  // Get paginated days
  const offset = (page - 1) * perPage;
  const closedDays = await db
    .select({
      id: s.khatmahDays.id,
      date: s.khatmahDays.localDate,
      groupName: s.groups.name,
      sizeSnapshot: s.khatmahDays.sizeSnapshot,
    })
    .from(s.khatmahDays)
    .innerJoin(s.groups, eq(s.groups.id, s.khatmahDays.groupId))
    .where(
      and(
        inArray(s.khatmahDays.groupId, groupIds),
        eq(s.khatmahDays.status, "closed")
      )
    )
    .orderBy(desc(s.khatmahDays.localDate))
    .limit(perPage)
    .offset(offset);

  if (!closedDays.length) return { days: [], total: 0 };

  // Get counts for each day
  const dayIds = closedDays.map((d) => d.id);
  const counts = await db
    .select({
      dayId: s.partAssignments.khatmahDayId,
      status: s.partAssignments.status,
    })
    .from(s.partAssignments)
    .where(inArray(s.partAssignments.khatmahDayId, dayIds));

  const countMap = new Map<string, { done: number; total: number }>();
  for (const c of counts) {
    const existing = countMap.get(c.dayId) || { done: 0, total: 0 };
    existing.total++;
    if (["completed", "completed_by_backup"].includes(c.status)) {
      existing.done++;
    }
    countMap.set(c.dayId, existing);
  }

  const days: HistoryDay[] = closedDays.map((d) => {
    const stats = countMap.get(d.id) || { done: 0, total: d.sizeSnapshot };
    return {
      dayId: d.id,
      date: d.date,
      groupName: d.groupName,
      done: stats.done,
      total: stats.total,
      completed: stats.done === stats.total,
    };
  });

  return { days, total: totalCount };
}

/**
 * Returns detailed view of a single day.
 * Checks that the user was a member of the group.
 */
export async function dayDetail(
  db: Db,
  userId: string,
  dayId: string
): Promise<DayDetail | null> {
  // Get day and verify user was in the group
  const [day] = await db
    .select({
      dayNumber: s.khatmahDays.dayNumber,
      date: s.khatmahDays.localDate,
      groupId: s.khatmahDays.groupId,
      groupName: s.groups.name,
    })
    .from(s.khatmahDays)
    .innerJoin(s.groups, eq(s.groups.id, s.khatmahDays.groupId))
    .where(eq(s.khatmahDays.id, dayId));

  if (!day) return null;

  // Verify user was a member
  const [membership] = await db
    .select()
    .from(s.groupMembers)
    .where(
      and(
        eq(s.groupMembers.userId, userId),
        eq(s.groupMembers.groupId, day.groupId)
      )
    );

  if (!membership) return null;

  // Get all parts
  const assignments = await db
    .select({
      id: s.partAssignments.id,
      part: s.partAssignments.partNumber,
      slot: s.partAssignments.slot,
      status: s.partAssignments.status,
      firstName: s.users.firstName,
      lastName: s.users.lastName,
    })
    .from(s.partAssignments)
    .leftJoin(s.users, eq(s.users.id, s.partAssignments.primaryUserId))
    .where(eq(s.partAssignments.khatmahDayId, dayId))
    .orderBy(asc(s.partAssignments.slot));

  // Get backups
  const assignmentIds = assignments.map((a) => a.id);
  const backups = assignmentIds.length
    ? await db
        .select({
          partAssignmentId: s.backupAssignments.partAssignmentId,
          firstName: s.users.firstName,
          lastName: s.users.lastName,
        })
        .from(s.backupAssignments)
        .innerJoin(s.users, eq(s.users.id, s.backupAssignments.backupUserId))
        .where(
          and(
            isNull(s.backupAssignments.cancelledAt),
            inArray(s.backupAssignments.partAssignmentId, assignmentIds)
          )
        )
    : [];

  const backupMap = new Map(
    backups.map((b) => [
      b.partAssignmentId,
      [b.firstName, b.lastName].filter(Boolean).join(" "),
    ])
  );

  // Get makeup readings
  const makeupSessions = await db
    .select({
      part: s.partAssignments.partNumber,
      firstName: s.users.firstName,
      lastName: s.users.lastName,
      finishedAt: s.readingSessions.finishedAt,
    })
    .from(s.readingSessions)
    .innerJoin(
      s.partAssignments,
      eq(s.partAssignments.id, s.readingSessions.partAssignmentId)
    )
    .innerJoin(s.users, eq(s.users.id, s.readingSessions.userId))
    .where(
      and(
        eq(s.partAssignments.khatmahDayId, dayId),
        eq(s.readingSessions.kind, "makeup"),
        isNotNull(s.readingSessions.finishedAt),
        isNull(s.readingSessions.undoneAt)
      )
    )
    .orderBy(asc(s.readingSessions.finishedAt));

  const parts = assignments.map((a) => ({
    partNumber: a.part,
    readerName:
      a.firstName && a.lastName
        ? `${a.firstName} ${a.lastName}`
        : a.firstName || "—",
    status: a.status,
    backupName: backupMap.get(a.id) || null,
    completedByBackup: a.status === "completed_by_backup",
  }));

  const makeups = makeupSessions.map((m) => ({
    partNumber: m.part,
    madeUpBy: [m.firstName, m.lastName].filter(Boolean).join(" "),
    madeUpAt: m.finishedAt!.toISOString(),
  }));

  return {
    dayNumber: day.dayNumber,
    date: day.date,
    groupName: day.groupName,
    parts,
    makeups,
  };
}
