import { and, eq, isNull } from "drizzle-orm";
import * as s from "../db/schema";
import { DomainError, type Db } from "./groups";
import { load } from "./reading";
import { notify } from "./notify";
const audit = (tx: Db, actor: string, action: string, id: string, before: unknown, after: unknown) =>
  tx.insert(s.auditLogs).values({ actorId: actor, action, targetType: "part_assignment", targetId: id, before: before as never, after: after as never });
const active = (id: string) => and(eq(s.backupAssignments.partAssignmentId, id), isNull(s.backupAssignments.cancelledAt));
/** BR-B1: admin picks a backup for one part of an open day. Replaces any previous backup for that part. */
export const assignBackup = (db: Db, actor: string, i: { assignmentId: string; backupUserId: string }) =>
  db.transaction(async (tx) => {
    const { a, d } = await load(tx, i.assignmentId);
    if (d.status !== "open") throw new DomainError("day_closed");
    if (a.status === "completed" || a.status === "completed_by_backup") throw new DomainError("already_completed");
    if (a.primaryUserId === i.backupUserId) throw new DomainError("backup_is_primary");
    const [u] = await tx.select().from(s.users).where(and(eq(s.users.id, i.backupUserId), eq(s.users.status, "active")));
    if (!u) throw new DomainError("user_not_found");
    await tx.update(s.backupAssignments).set({ cancelledAt: new Date() }).where(active(a.id));
    const [b] = await tx.insert(s.backupAssignments).values({ partAssignmentId: a.id, backupUserId: i.backupUserId, assignedBy: actor }).returning();
    if (a.status === "assigned") await tx.update(s.partAssignments).set({ status: "backup_assigned" }).where(eq(s.partAssignments.id, a.id));
    await audit(tx, actor, "backup.assign", a.id, null, { backupUserId: i.backupUserId });
    const [g] = await tx.select({ name: s.groups.name }).from(s.groups).innerJoin(s.khatmahDays, eq(s.khatmahDays.groupId, s.groups.id)).where(eq(s.khatmahDays.id, d.id));
    await notify(tx, { userId: i.backupUserId, type: "backup_assigned", vars: { part: a.partNumber, group: g?.name ?? "" } });
    return b;
  });
export const cancelBackup = (db: Db, actor: string, assignmentId: string) =>
  db.transaction(async (tx) => {
    const { a } = await load(tx, assignmentId);
    const [b] = await tx.update(s.backupAssignments).set({ cancelledAt: new Date() }).where(active(a.id)).returning();
    if (!b) throw new DomainError("no_backup");
    if (a.status === "backup_assigned") await tx.update(s.partAssignments).set({ status: "assigned" }).where(eq(s.partAssignments.id, a.id));
    await audit(tx, actor, "backup.cancel", a.id, { backupUserId: b.backupUserId }, null);
    return { ok: true };
  });
