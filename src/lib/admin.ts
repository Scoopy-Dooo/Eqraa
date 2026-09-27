import { randomUUID } from "node:crypto";
import { notify } from "./notify";
import { and, asc, desc, eq, ilike, inArray, isNotNull, isNull, gt, lte, or, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import * as s from "../db/schema";
import { DomainError, type Db } from "./groups";
import { load } from "./reading";
import { normalizePhone, isStrongPin, hashPin } from "./auth-core";
const audit = (tx: Db, actor: string, action: string, type: string, id: string, before: unknown, after: unknown) =>
  tx.insert(s.auditLogs).values({ actorId: actor, action, targetType: type, targetId: id, before: before as never, after: after as never });
export const fullName = (f: string, l?: string | null) => [f, l].filter(Boolean).join(" ");
export async function listUsers(db: Db, i: { q?: string; filter?: "all" | "unassigned" | "assigned"; limit?: number } = {}) {
  const q = i.q?.trim().replace(/[\\%_]/g, "\\$&"), like = (c: AnyPgColumn) => ilike(c, `%${q}%`);
  return db.select({ id: s.users.id, firstName: s.users.firstName, lastName: s.users.lastName, phone: s.users.phoneE164, status: s.users.status, createdAt: s.users.createdAt, groupId: s.groups.id, groupName: s.groups.name, slot: s.groupMembers.slot })
    .from(s.users).leftJoin(s.groupMembers, and(eq(s.groupMembers.userId, s.users.id), isNull(s.groupMembers.leftAt))).leftJoin(s.groups, eq(s.groups.id, s.groupMembers.groupId))
    .where(and(q ? or(like(s.users.firstName), like(s.users.lastName), like(s.users.phoneE164)) : undefined, i.filter === "unassigned" ? isNull(s.groupMembers.id) : i.filter === "assigned" ? isNotNull(s.groupMembers.id) : undefined))
    .orderBy(desc(s.users.createdAt)).limit(i.limit ?? 100);
}
export async function stats(db: Db) {
  const [g] = await db.select({ n: sql<number>`count(*)::int` }).from(s.groups).where(eq(s.groups.status, "active"));
  const [m] = await db.select({ n: sql<number>`count(*)::int` }).from(s.groupMembers).where(isNull(s.groupMembers.leftAt));
  return { groups: g.n, members: m.n, unassigned: (await listUsers(db, { filter: "unassigned", limit: 1000 })).length };
}
export const changePhone = (db: Db, actor: string, userId: string, raw: string) => db.transaction(async (tx) => {
  const phone = normalizePhone(raw);
  if (!phone) throw new DomainError("invalid_phone");
  const [u] = await tx.select().from(s.users).where(eq(s.users.id, userId));
  if (!u) throw new DomainError("user_not_found");
  const [dup] = await tx.select({ id: s.users.id }).from(s.users).where(eq(s.users.phoneE164, phone));
  if (dup && dup.id !== userId) throw new DomainError("phone_taken");
  await tx.update(s.users).set({ phoneE164: phone }).where(eq(s.users.id, userId));
  await audit(tx, actor, "user.change_phone", "user", userId, { phone: u.phoneE164 }, { phone });
  return { ok: true };
});
/** No SMS in the MVP, so the admin resets a forgotten PIN. Existing sessions are revoked and the lockout cleared. The PIN is never logged. */
export const resetPin = (db: Db, actor: string, userId: string, pin: string) => db.transaction(async (tx) => {
  if (!isStrongPin(pin)) throw new DomainError("weak_pin");
  const [u] = await tx.update(s.users).set({ pinHash: await hashPin(pin), failedPinCount: 0, lockedUntil: null }).where(eq(s.users.id, userId)).returning({ id: s.users.id });
  if (!u) throw new DomainError("user_not_found");
  await tx.update(s.sessions).set({ revokedAt: new Date() }).where(and(eq(s.sessions.userId, userId), isNull(s.sessions.revokedAt)));
  await audit(tx, actor, "user.reset_pin", "user", userId, null, null);
  return { ok: true };
});
export const listAdmins = (db: Db) => db.select({ userId: s.adminRoles.userId, role: s.adminRoles.role, firstName: s.users.firstName, lastName: s.users.lastName, phone: s.users.phoneE164 }).from(s.adminRoles).innerJoin(s.users, eq(s.users.id, s.adminRoles.userId));
export const grantAdmin = (db: Db, actor: string, i: { phone: string; role: "admin" | "super_admin" }) => db.transaction(async (tx) => {
  const phone = normalizePhone(i.phone);
  const [u] = phone ? await tx.select().from(s.users).where(eq(s.users.phoneE164, phone)) : [];
  if (!u) throw new DomainError("user_not_found");
  const [old] = await tx.select().from(s.adminRoles).where(eq(s.adminRoles.userId, u.id));
  await tx.insert(s.adminRoles).values({ userId: u.id, role: i.role, grantedBy: actor }).onConflictDoUpdate({ target: s.adminRoles.userId, set: { role: i.role, grantedBy: actor } });
  await audit(tx, actor, "admin.grant", "user", u.id, old ? { role: old.role } : null, { role: i.role });
  return { ok: true };
});
export const revokeAdmin = (db: Db, actor: string, userId: string) => db.transaction(async (tx) => {
  const [r] = await tx.select().from(s.adminRoles).where(eq(s.adminRoles.userId, userId));
  if (!r) throw new DomainError("not_admin");
  const supers = await tx.select().from(s.adminRoles).where(eq(s.adminRoles.role, "super_admin"));
  if (r.role === "super_admin" && supers.length <= 1) throw new DomainError("last_super_admin");
  await tx.delete(s.adminRoles).where(eq(s.adminRoles.userId, userId));
  await audit(tx, actor, "admin.revoke", "user", userId, { role: r.role }, null);
  return { ok: true };
});
/** Admin confirms a reading on the reader's behalf. Counts for the reader (decision D) and is tagged source=admin. */
export const adminConfirmReading = (db: Db, actor: string, assignmentId: string, now = new Date()) => db.transaction(async (tx) => {
  const { a, d } = await load(tx, assignmentId);
  if (!a.primaryUserId) throw new DomainError("no_reader");
  if (d.status !== "open" || now >= d.endsAt) throw new DomainError("day_closed");
  if (a.status === "completed" || a.status === "completed_by_backup") throw new DomainError("already_completed");
  await tx.insert(s.readingSessions).values({ partAssignmentId: a.id, userId: a.primaryUserId, kind: "primary", startedAt: now, finishedAt: now, source: "admin", confirmedBy: actor, idempotencyKey: `admin:${randomUUID()}` });
  await tx.update(s.partAssignments).set({ status: "completed" }).where(eq(s.partAssignments.id, a.id));
  await audit(tx, actor, "reading.admin_confirm", "part_assignment", a.id, { status: a.status }, { status: "completed", readerId: a.primaryUserId });
  return { ok: true };
});
/** Open days of every group with each part's reader, backup and streak: feeds the dashboard and the daily screen. */
export async function dailyOverview(db: Db, now = new Date()) {
  const days = await db.select({ d: s.khatmahDays, name: s.groups.name }).from(s.khatmahDays).innerJoin(s.groups, eq(s.groups.id, s.khatmahDays.groupId))
    .where(and(eq(s.khatmahDays.status, "open"), lte(s.khatmahDays.startsAt, now), gt(s.khatmahDays.endsAt, now))).orderBy(asc(s.groups.name));
  if (!days.length) return [];
  const asgs = await db.select().from(s.partAssignments).where(inArray(s.partAssignments.khatmahDayId, days.map((x) => x.d.id))).orderBy(asc(s.partAssignments.slot));
  const bks = asgs.length ? await db.select().from(s.backupAssignments).where(and(inArray(s.backupAssignments.partAssignmentId, asgs.map((a) => a.id)), isNull(s.backupAssignments.cancelledAt))) : [];
  const uids = [...new Set([...asgs.flatMap((a) => (a.primaryUserId ? [a.primaryUserId] : [])), ...bks.map((b) => b.backupUserId)])];
  const us = uids.length ? await db.select({ id: s.users.id, f: s.users.firstName, l: s.users.lastName }).from(s.users).where(inArray(s.users.id, uids)) : [];
  const st = uids.length ? await db.select().from(s.userStreaks).where(inArray(s.userStreaks.userId, uids)) : [];
  const nm = (id: string | null) => { const u = us.find((x) => x.id === id); return u ? fullName(u.f, u.l) : null; };
  return days.map(({ d, name }) => {
    const parts = asgs.filter((a) => a.khatmahDayId === d.id).map((a) => {
      const b = bks.find((x) => x.partAssignmentId === a.id);
      return { id: a.id, slot: a.slot, part: a.partNumber, status: a.status, userId: a.primaryUserId, name: nm(a.primaryUserId), streak: st.find((x) => x.userId === a.primaryUserId)?.current ?? 0, backupName: b ? nm(b.backupUserId) : null };
    });
    return { groupId: d.groupId, name, day: d.dayNumber, endsAt: d.endsAt, parts, done: parts.filter((p) => p.status === "completed" || p.status === "completed_by_backup").length };
  });
}
export const isMissing = (status: string) => !["completed", "completed_by_backup"].includes(status);
export async function recentHistory(db: Db, limit = 60) {
  const days = await db.select({ d: s.khatmahDays, name: s.groups.name }).from(s.khatmahDays).innerJoin(s.groups, eq(s.groups.id, s.khatmahDays.groupId)).where(eq(s.khatmahDays.status, "closed")).orderBy(desc(s.khatmahDays.localDate)).limit(limit);
  if (!days.length) return [];
  const c = await db.select({ id: s.partAssignments.khatmahDayId, status: s.partAssignments.status, n: sql<number>`count(*)::int` }).from(s.partAssignments).where(inArray(s.partAssignments.khatmahDayId, days.map((x) => x.d.id))).groupBy(s.partAssignments.khatmahDayId, s.partAssignments.status);
  return days.map(({ d, name }) => { const mine = c.filter((x) => x.id === d.id), sum = (f: (st: string) => boolean) => mine.filter((x) => f(x.status)).reduce((a, x) => a + x.n, 0);
    return { name, date: d.localDate, day: d.dayNumber, total: sum(() => true), done: sum((x) => !isMissing(x)), byBackup: sum((x) => x === "completed_by_backup"), missed: sum((x) => x === "missed") }; });
}
export async function auditFeed(db: Db, limit = 100) {
  return db.select({ id: s.auditLogs.id, action: s.auditLogs.action, targetType: s.auditLogs.targetType, targetId: s.auditLogs.targetId, before: s.auditLogs.before, after: s.auditLogs.after, at: s.auditLogs.createdAt, actorFirst: s.users.firstName, actorLast: s.users.lastName })
    .from(s.auditLogs).leftJoin(s.users, eq(s.users.id, s.auditLogs.actorId)).orderBy(desc(s.auditLogs.createdAt)).limit(limit);
}

/** Notification settings & templates (BR-14/36): admin-editable, code defaults are the fallback. */
export async function getSetting<T>(db: Db, key: string, fallback: T): Promise<T> {
  const [row] = await db.select().from(s.notificationSettings).where(eq(s.notificationSettings.key, key));
  return row ? ({ ...(fallback as object), ...(row.value as object) } as T) : fallback;
}
export const setSetting = (db: Db, actor: string, key: string, value: unknown) => db.transaction(async (tx) => {
  await tx.insert(s.notificationSettings).values({ key, value: value as never, updatedBy: actor }).onConflictDoUpdate({ target: s.notificationSettings.key, set: { value: value as never, updatedBy: actor, updatedAt: new Date() } });
  await audit(tx, actor, "settings.update", "notification_settings", key, null, value);
  return { ok: true };
});
export const listTemplates = (db: Db) => db.select().from(s.notificationTemplates).where(eq(s.notificationTemplates.locale, "ar"));
export const upsertTemplate = (db: Db, actor: string, i: { key: string; title: string; body: string }) => db.transaction(async (tx) => {
  await tx.insert(s.notificationTemplates).values({ key: i.key, locale: "ar", title: i.title, body: i.body, updatedBy: actor }).onConflictDoUpdate({ target: [s.notificationTemplates.key, s.notificationTemplates.locale], set: { title: i.title, body: i.body, updatedBy: actor, updatedAt: new Date() } });
  await audit(tx, actor, "template.update", "notification_template", i.key, null, i);
  return { ok: true };
});
/** Admin-composed broadcast to a group or everyone (type=admin_message, always delivered, BR-35). */
export const sendBroadcast = (db: Db, actor: string, i: { groupId?: string; title: string; body: string }) => db.transaction(async (tx) => {
  const targets = i.groupId
    ? await tx.select({ userId: s.groupMembers.userId }).from(s.groupMembers).where(and(eq(s.groupMembers.groupId, i.groupId), isNull(s.groupMembers.leftAt)))
    : await tx.select({ userId: s.users.id }).from(s.users).where(eq(s.users.status, "active"));
  for (const t of targets) {
    await tx.insert(s.notifications).values({ userId: t.userId, type: "admin_message", payload: { title: i.title, body: i.body } });
  }
  await audit(tx, actor, "notification.broadcast", "group", i.groupId ?? "all", null, { title: i.title, count: targets.length });
  return { ok: true, count: targets.length };
});
