import { and, asc, desc, eq, inArray, isNotNull, isNull, gt, lte } from "drizzle-orm";
import * as s from "../db/schema";
import { DomainError, type Db } from "./groups";
import { recomputeStreak } from "./streak";
const audit = (tx: Db, actor: string, action: string, id: string, before: unknown, after: unknown) =>
  tx.insert(s.auditLogs).values({ actorId: actor, action, targetType: "part_assignment", targetId: id, before: before as never, after: after as never });
export async function load(tx: Db, id: string) {
  const [r] = await tx.select({ a: s.partAssignments, d: s.khatmahDays }).from(s.partAssignments)
    .innerJoin(s.khatmahDays, eq(s.khatmahDays.id, s.partAssignments.khatmahDayId)).where(eq(s.partAssignments.id, id)).for("update");
  if (!r) throw new DomainError("not_found");
  return r;
}
const activeBackup = (id: string, userId?: string) => and(eq(s.backupAssignments.partAssignmentId, id), isNull(s.backupAssignments.cancelledAt), userId ? eq(s.backupAssignments.backupUserId, userId) : undefined);
async function roleOf(tx: Db, a: typeof s.partAssignments.$inferSelect, userId: string): Promise<"primary" | "backup"> {
  if (a.primaryUserId === userId) return "primary";
  const [b] = await tx.select().from(s.backupAssignments).where(activeBackup(a.id, userId));
  if (b) return "backup";
  throw new DomainError("forbidden");
}
const primaryOrBackupDone = (id: string) => and(eq(s.readingSessions.partAssignmentId, id), isNotNull(s.readingSessions.finishedAt), isNull(s.readingSessions.undoneAt), inArray(s.readingSessions.kind, ["primary", "backup"]));
const makeupDone = (id: string) => and(eq(s.readingSessions.partAssignmentId, id), eq(s.readingSessions.kind, "makeup"), isNotNull(s.readingSessions.finishedAt), isNull(s.readingSessions.undoneAt));
const inWindow = (d: typeof s.khatmahDays.$inferSelect, now: Date) => d.status === "open" && now >= d.startsAt && now < d.endsAt;
export const startReading = (db: Db, userId: string, assignmentId: string, now = new Date()) =>
  db.transaction(async (tx) => {
    const { a, d } = await load(tx, assignmentId);
    const role = await roleOf(tx, a, userId);
    if (!inWindow(d, now)) throw new DomainError("day_closed");
    if (!["assigned", "backup_assigned", "reading"].includes(a.status)) return { status: a.status };
    const [openS] = await tx.select().from(s.readingSessions).where(and(eq(s.readingSessions.partAssignmentId, a.id), eq(s.readingSessions.userId, userId), isNull(s.readingSessions.finishedAt), isNull(s.readingSessions.undoneAt)));
    if (!openS) await tx.insert(s.readingSessions).values({ partAssignmentId: a.id, userId, kind: role, startedAt: now });
    if (role === "primary" && a.status !== "reading") await tx.update(s.partAssignments).set({ status: "reading" }).where(eq(s.partAssignments.id, a.id));
    return { status: role === "primary" ? "reading" : a.status };
  });
/** BR-P3/P4/O1: a repeat by the same person returns the same session; a different person gets already_completed. */
export const finishReading = (db: Db, userId: string, i: { assignmentId: string; idempotencyKey: string; clientTime?: Date; source?: string }, now = new Date()) =>
  db.transaction(async (tx) => {
    const [dup] = await tx.select().from(s.readingSessions).where(eq(s.readingSessions.idempotencyKey, i.idempotencyKey));
    if (dup) return dup;
    const { a, d } = await load(tx, i.assignmentId);
    const role = await roleOf(tx, a, userId);
    if (a.status === "completed" || a.status === "completed_by_backup") {
      const [x] = await tx.select().from(s.readingSessions).where(primaryOrBackupDone(a.id));
      if (x && x.userId === userId) return x;
      throw new DomainError("already_completed");
    }
    const at = i.clientTime && i.clientTime <= now && i.clientTime >= d.startsAt && i.clientTime < d.endsAt ? i.clientTime : now; // BR-O2
    if (at >= d.endsAt || at < d.startsAt) throw new DomainError("day_closed");
    const [open] = await tx.select().from(s.readingSessions).where(and(eq(s.readingSessions.partAssignmentId, a.id), eq(s.readingSessions.userId, userId), isNull(s.readingSessions.finishedAt), isNull(s.readingSessions.undoneAt))).orderBy(desc(s.readingSessions.createdAt)).limit(1);
    const fin = { kind: role, finishedAt: at, confirmedBy: userId, idempotencyKey: i.idempotencyKey, source: i.source ?? "online", clientTime: i.clientTime ?? null };
    const [sess] = open
      ? await tx.update(s.readingSessions).set(fin).where(eq(s.readingSessions.id, open.id)).returning()
      : await tx.insert(s.readingSessions).values({ partAssignmentId: a.id, userId, startedAt: at, ...fin }).returning();
    const status = role === "primary" ? "completed" : "completed_by_backup";
    await tx.update(s.partAssignments).set({ status }).where(eq(s.partAssignments.id, a.id));
    await audit(tx, userId, "reading.confirm", a.id, { status: a.status }, { status, role, source: fin.source });
    if (d.status === "closed" && a.primaryUserId) await recomputeStreak(tx, a.primaryUserId); // late offline sync into a closed day
    return sess;
  });
/** BR-P5: only who confirmed can undo, until the day ends. Admins can undo any time. */
export const undoReading = (db: Db, actorId: string, assignmentId: string, opts: { admin?: boolean } = {}, now = new Date()) =>
  db.transaction(async (tx) => {
    const { a, d } = await load(tx, assignmentId);
    const [sess] = await tx.select().from(s.readingSessions).where(primaryOrBackupDone(a.id));
    if (!sess) throw new DomainError("not_completed");
    if (!opts.admin && sess.confirmedBy !== actorId) throw new DomainError("forbidden");
    if (!opts.admin && !inWindow(d, now)) throw new DomainError("day_closed");
    const [b] = await tx.select().from(s.backupAssignments).where(activeBackup(a.id));
    const status = d.status !== "open" ? "missed" : b ? "backup_assigned" : "assigned";
    await tx.update(s.readingSessions).set({ undoneAt: now, undoneBy: actorId }).where(eq(s.readingSessions.id, sess.id));
    await tx.update(s.partAssignments).set({ status }).where(eq(s.partAssignments.id, a.id));
    await audit(tx, actorId, "reading.undo", a.id, { status: a.status }, { status });
    if (d.status === "closed" && a.primaryUserId) await recomputeStreak(tx, a.primaryUserId);
    return { status };
  });
/** BR-U1/U2: a make-up is an independent extra reading of a missed part. It never touches the day or its status. */
export const finishMakeup = (db: Db, userId: string, i: { assignmentId: string; idempotencyKey: string; clientTime?: Date; source?: string }, now = new Date()) =>
  db.transaction(async (tx) => {
    const [dup] = await tx.select().from(s.readingSessions).where(eq(s.readingSessions.idempotencyKey, i.idempotencyKey));
    if (dup) return dup;
    const { a, d } = await load(tx, i.assignmentId);
    if (a.primaryUserId !== userId) throw new DomainError("forbidden");
    if (a.status !== "missed" || d.status !== "closed") throw new DomainError("not_missed");
    const [ex] = await tx.select().from(s.readingSessions).where(makeupDone(a.id));
    if (ex) return ex;
    const at = i.clientTime && i.clientTime <= now && i.clientTime >= d.endsAt ? i.clientTime : now;
    const [sess] = await tx.insert(s.readingSessions).values({ partAssignmentId: a.id, userId, kind: "makeup", startedAt: at, finishedAt: at, confirmedBy: userId, source: i.source ?? "online", clientTime: i.clientTime ?? null, idempotencyKey: i.idempotencyKey }).returning();
    await audit(tx, userId, "reading.makeup", a.id, null, { part: a.partNumber, dayDate: d.localDate });
    return sess;
  });
export const undoMakeup = (db: Db, actorId: string, assignmentId: string, opts: { admin?: boolean } = {}, now = new Date()) =>
  db.transaction(async (tx) => {
    const { a } = await load(tx, assignmentId);
    const [sess] = await tx.select().from(s.readingSessions).where(makeupDone(a.id));
    if (!sess) throw new DomainError("not_completed");
    if (!opts.admin && sess.confirmedBy !== actorId) throw new DomainError("forbidden");
    await tx.update(s.readingSessions).set({ undoneAt: now, undoneBy: actorId }).where(eq(s.readingSessions.id, sess.id));
    await audit(tx, actorId, "reading.makeup_undo", a.id, null, null);
    return { ok: true };
  });
export async function missedFor(db: Db, userId: string, limit = 30) {
  const rows = await db.select({ id: s.partAssignments.id, part: s.partAssignments.partNumber, date: s.khatmahDays.localDate }).from(s.partAssignments)
    .innerJoin(s.khatmahDays, eq(s.khatmahDays.id, s.partAssignments.khatmahDayId))
    .where(and(eq(s.partAssignments.primaryUserId, userId), eq(s.partAssignments.status, "missed"))).orderBy(desc(s.khatmahDays.localDate)).limit(limit);
  if (!rows.length) return [];
  const done = new Set((await db.select({ id: s.readingSessions.partAssignmentId }).from(s.readingSessions).where(and(inArray(s.readingSessions.partAssignmentId, rows.map((r) => r.id)), eq(s.readingSessions.kind, "makeup"), isNotNull(s.readingSessions.finishedAt), isNull(s.readingSessions.undoneAt)))).map((r) => r.id));
  return rows.filter((r) => !done.has(r.id));
}
async function progressOf(db: Db, dayId: string) {
  const rows = await db.select({ status: s.partAssignments.status }).from(s.partAssignments).where(eq(s.partAssignments.khatmahDayId, dayId));
  return { done: rows.filter((r) => r.status === "completed" || r.status === "completed_by_backup").length, total: rows.length };
}
/** Parts of open days where this user is the assigned backup (the backup may belong to another group). */
async function backupsFor(db: Db, userId: string, now: Date) {
  const rows = await db.select({ a: s.partAssignments, d: s.khatmahDays, groupName: s.groups.name }).from(s.backupAssignments)
    .innerJoin(s.partAssignments, eq(s.partAssignments.id, s.backupAssignments.partAssignmentId))
    .innerJoin(s.khatmahDays, eq(s.khatmahDays.id, s.partAssignments.khatmahDayId)).innerJoin(s.groups, eq(s.groups.id, s.khatmahDays.groupId))
    .where(and(eq(s.backupAssignments.backupUserId, userId), isNull(s.backupAssignments.cancelledAt), eq(s.khatmahDays.status, "open"), lte(s.khatmahDays.startsAt, now), gt(s.khatmahDays.endsAt, now), inArray(s.partAssignments.status, ["assigned", "reading", "backup_assigned", "completed_by_backup"])));
  return Promise.all(rows.map(async ({ a, d, groupName }) => {
    const [o] = await db.select().from(s.readingSessions).where(and(eq(s.readingSessions.partAssignmentId, a.id), eq(s.readingSessions.userId, userId), isNull(s.readingSessions.undoneAt)));
    return { id: a.id, part: a.partNumber, groupName, day: d.dayNumber, endsAt: d.endsAt.toISOString(), status: a.status === "completed_by_backup" ? "completed" : o ? "reading" : "assigned", progress: await progressOf(db, d.id) };
  }));
}
/** Everything the home screen needs. A member removed mid-day keeps their part until the day ends (BR-M6). */
export async function todayFor(db: Db, userId: string, now = new Date()) {
  const backups = await backupsFor(db, userId, now), win = and(eq(s.khatmahDays.status, "open"), lte(s.khatmahDays.startsAt, now), gt(s.khatmahDays.endsAt, now));
  const open = async (day: typeof s.khatmahDays.$inferSelect, groupName: string, mine: typeof s.partAssignments.$inferSelect | null) => ({
    state: "open" as const, groupId: day.groupId, groupName, backups, day: { number: day.dayNumber, endsAt: day.endsAt.toISOString() },
    mine: mine && { id: mine.id, part: mine.partNumber, status: mine.status }, progress: await progressOf(db, day.id), serverNow: now.toISOString() });
  const [own] = await db.select({ a: s.partAssignments, d: s.khatmahDays, groupName: s.groups.name }).from(s.partAssignments)
    .innerJoin(s.khatmahDays, eq(s.khatmahDays.id, s.partAssignments.khatmahDayId)).innerJoin(s.groups, eq(s.groups.id, s.khatmahDays.groupId))
    .where(and(eq(s.partAssignments.primaryUserId, userId), win)).orderBy(desc(s.khatmahDays.startsAt)).limit(1);
  if (own) return open(own.d, own.groupName, own.a);
  const [m] = await db.select({ groupId: s.groups.id, groupName: s.groups.name }).from(s.groupMembers)
    .innerJoin(s.groups, eq(s.groups.id, s.groupMembers.groupId)).where(and(eq(s.groupMembers.userId, userId), isNull(s.groupMembers.leftAt)));
  if (!m) return { state: "no_group" as const, backups };
  const [day] = await db.select().from(s.khatmahDays).where(and(eq(s.khatmahDays.groupId, m.groupId), win)).orderBy(desc(s.khatmahDays.startsAt)).limit(1);
  return day ? open(day, m.groupName, null) : { state: "not_started" as const, ...m, backups };
}
