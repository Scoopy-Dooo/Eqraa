import { and, asc, desc, eq, gt, inArray, isNull, lte } from "drizzle-orm";
import * as s from "../db/schema";
import type { Db } from "./groups";

export type PartCard = {
  partNumber: number;
  readerName: string;
  status: string;
  backupName: string | null;
  isCurrentUser: boolean;
};

export type KhatmahView =
  | { state: "no_group" }
  | { state: "not_started"; groupName: string }
  | {
      state: "open";
      groupName: string;
      dayNumber: number;
      endsAt: string;
      progress: { done: number; total: number };
      parts: PartCard[];
    };

/**
 * Returns the current open day view for the user's group, showing all parts with reader names.
 * Never includes phone numbers (privacy constraint).
 */
export async function khatmahView(db: Db, userId: string, now = new Date()): Promise<KhatmahView> {
  // Check if user is in a group
  const [membership] = await db
    .select({ groupId: s.groups.id, groupName: s.groups.name })
    .from(s.groupMembers)
    .innerJoin(s.groups, eq(s.groups.id, s.groupMembers.groupId))
    .where(and(eq(s.groupMembers.userId, userId), isNull(s.groupMembers.leftAt)));

  if (!membership) return { state: "no_group" };

  // Check if there's an open day
  const [day] = await db
    .select()
    .from(s.khatmahDays)
    .where(
      and(
        eq(s.khatmahDays.groupId, membership.groupId),
        eq(s.khatmahDays.status, "open"),
        lte(s.khatmahDays.startsAt, now),
        gt(s.khatmahDays.endsAt, now)
      )
    )
    .orderBy(desc(s.khatmahDays.startsAt))
    .limit(1);

  if (!day) return { state: "not_started", groupName: membership.groupName };

  // Get all part assignments for this day with reader names (NO phone numbers)
  const assignments = await db
    .select({
      id: s.partAssignments.id,
      slot: s.partAssignments.slot,
      part: s.partAssignments.partNumber,
      status: s.partAssignments.status,
      userId: s.partAssignments.primaryUserId,
      firstName: s.users.firstName,
      lastName: s.users.lastName,
    })
    .from(s.partAssignments)
    .leftJoin(s.users, eq(s.users.id, s.partAssignments.primaryUserId))
    .where(eq(s.partAssignments.khatmahDayId, day.id))
    .orderBy(asc(s.partAssignments.slot));

  // Get active backups for all parts in this day
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

  const parts: PartCard[] = assignments.map((a) => ({
    partNumber: a.part,
    readerName: a.firstName && a.lastName
      ? `${a.firstName} ${a.lastName}`
      : a.firstName || "—",
    status: a.status,
    backupName: backupMap.get(a.id) || null,
    isCurrentUser: a.userId === userId,
  }));

  const done = parts.filter((p) =>
    ["completed", "completed_by_backup"].includes(p.status)
  ).length;

  return {
    state: "open",
    groupName: membership.groupName,
    dayNumber: day.dayNumber,
    endsAt: day.endsAt.toISOString(),
    progress: { done, total: parts.length },
    parts,
  };
}
