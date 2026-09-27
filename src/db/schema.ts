import { pgTable, uuid, text, integer, timestamp, pgEnum, date, jsonb, check, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
export const gender = pgEnum("gender", ["male", "female"]);
export const role = pgEnum("admin_role", ["admin", "super_admin"]);
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  firstName: text("first_name").notNull(), lastName: text("last_name"),
  phoneE164: text("phone_e164").notNull().unique(), pinHash: text("pin_hash").notNull(),
  gender: gender("gender").notNull(), avatarKey: text("avatar_key").notNull(),
  locale: text("locale").notNull().default("ar"), theme: text("theme").notNull().default("system"),
  status: text("status").notNull().default("active"),
  failedPinCount: integer("failed_pin_count").notNull().default(0), lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(), userId: uuid("user_id").notNull().references(() => users.id),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), revokedAt: timestamp("revoked_at", { withTimezone: true }),
});
export const adminRoles = pgTable("admin_roles", {
  userId: uuid("user_id").primaryKey().references(() => users.id), role: role("role").notNull(),
  grantedBy: uuid("granted_by"), grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
});

export const groups = pgTable("groups", {
  id: uuid("id").defaultRandom().primaryKey(), name: text("name").notNull(),
  capacity: integer("capacity").notNull(), // current number of slots (1..30)
  startDate: date("start_date", { mode: "string" }).notNull(), startOffset: integer("start_offset").notNull().default(0),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [check("groups_capacity_1_30", sql`${t.capacity} between 1 and 30`), check("groups_offset_0_29", sql`${t.startOffset} between 0 and 29`)]);
export const groupMembers = pgTable("group_members", {
  id: uuid("id").defaultRandom().primaryKey(), groupId: uuid("group_id").notNull().references(() => groups.id),
  userId: uuid("user_id").notNull().references(() => users.id), slot: integer("slot").notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  leftAt: timestamp("left_at", { withTimezone: true }), leftReason: text("left_reason"), addedBy: uuid("added_by"),
}, (t) => [
  check("gm_slot_1_30", sql`${t.slot} between 1 and 30`),
  uniqueIndex("gm_active_slot").on(t.groupId, t.slot).where(sql`${t.leftAt} is null`), // one holder per slot
  uniqueIndex("gm_active_user").on(t.userId).where(sql`${t.leftAt} is null`), // one group per user
]);
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(), actorId: uuid("actor_id"), action: text("action").notNull(),
  targetType: text("target_type").notNull(), targetId: text("target_id").notNull(), before: jsonb("before"), after: jsonb("after"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const prayerTimes = pgTable("prayer_times", {
  date: date("date", { mode: "string" }).primaryKey(), fajrAt: timestamp("fajr_at", { withTimezone: true }).notNull(),
  dhuhrAt: timestamp("dhuhr_at", { withTimezone: true }), asrAt: timestamp("asr_at", { withTimezone: true }),
  maghribAt: timestamp("maghrib_at", { withTimezone: true }), ishaAt: timestamp("isha_at", { withTimezone: true }),
  source: text("source").notNull(), isOverride: integer("is_override").notNull().default(0),
});
// A day of a group's Khatmah. Written when the day opens and never rewritten (BR-T5).
export const khatmahDays = pgTable("khatmah_days", {
  id: uuid("id").defaultRandom().primaryKey(), groupId: uuid("group_id").notNull().references(() => groups.id),
  dayNumber: integer("day_number").notNull(), localDate: date("local_date", { mode: "string" }).notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(), endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("open"), sizeSnapshot: integer("size_snapshot").notNull(),
}, (t) => [uniqueIndex("kd_group_date").on(t.groupId, t.localDate)]);
export const partAssignments = pgTable("part_assignments", {
  id: uuid("id").defaultRandom().primaryKey(), khatmahDayId: uuid("khatmah_day_id").notNull().references(() => khatmahDays.id),
  slot: integer("slot").notNull(), partNumber: integer("part_number").notNull(),
  primaryUserId: uuid("primary_user_id").references(() => users.id), status: text("status").notNull().default("assigned"),
}, (t) => [uniqueIndex("pa_day_slot").on(t.khatmahDayId, t.slot), check("pa_part_1_30", sql`${t.partNumber} between 1 and 30`)]);
export const readingSessions = pgTable("reading_sessions", {
  id: uuid("id").defaultRandom().primaryKey(), partAssignmentId: uuid("part_assignment_id").notNull().references(() => partAssignments.id),
  userId: uuid("user_id").notNull().references(() => users.id), kind: text("kind").notNull().default("primary"),
  startedAt: timestamp("started_at", { withTimezone: true }), finishedAt: timestamp("finished_at", { withTimezone: true }),
  source: text("source").notNull().default("online"), confirmedBy: uuid("confirmed_by"), clientTime: timestamp("client_time", { withTimezone: true }),
  idempotencyKey: text("idempotency_key").unique(), undoneAt: timestamp("undone_at", { withTimezone: true }), undoneBy: uuid("undone_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("rs_one_completion").on(t.partAssignmentId).where(sql`${t.kind} in ('primary','backup') and ${t.finishedAt} is not null and ${t.undoneAt} is null`),
  uniqueIndex("rs_one_makeup").on(t.partAssignmentId).where(sql`${t.kind} = 'makeup' and ${t.finishedAt} is not null and ${t.undoneAt} is null`)]);

export const backupAssignments = pgTable("backup_assignments", {
  id: uuid("id").defaultRandom().primaryKey(), partAssignmentId: uuid("part_assignment_id").notNull().references(() => partAssignments.id),
  backupUserId: uuid("backup_user_id").notNull().references(() => users.id), assignedBy: uuid("assigned_by"),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(), cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
}, (t) => [uniqueIndex("ba_one_active").on(t.partAssignmentId).where(sql`${t.cancelledAt} is null`)]); // one active backup per part

// Cached result of replaying closed days (see domain/streak.ts); can always be rebuilt from part_assignments.
export const userStreaks = pgTable("user_streaks", {
  userId: uuid("user_id").primaryKey().references(() => users.id),
  current: integer("current").notNull().default(0), best: integer("best").notNull().default(0),
  protections: integer("protections").notNull().default(0), toward: integer("toward").notNull().default(0),
  lastEvaluatedDate: date("last_evaluated_date", { mode: "string" }), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [check("us_protections_0_2", sql`${t.protections} between 0 and 2`)]);

export const notificationTemplates = pgTable("notification_templates", {
  key: text("key").notNull(), locale: text("locale").notNull().default("ar"), title: text("title").notNull(), body: text("body").notNull(),
  editableByAdmin: integer("editable_by_admin").notNull().default(1), updatedBy: uuid("updated_by"), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("nt_key_locale").on(t.key, t.locale)]);
export const notificationSettings = pgTable("notification_settings", { key: text("key").primaryKey(), value: jsonb("value").notNull(), updatedBy: uuid("updated_by"), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow() });
// In-app inbox: the source of truth. Push is a best-effort nudge on top of it (BR-35: nothing critical is lost to offline).
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(), userId: uuid("user_id").notNull().references(() => users.id), type: text("type").notNull(),
  payload: jsonb("payload").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), readAt: timestamp("read_at", { withTimezone: true }),
});
export const notificationPreferences = pgTable("notification_preferences", {
  userId: uuid("user_id").notNull().references(() => users.id), type: text("type").notNull(), enabled: integer("enabled").notNull().default(1),
}, (t) => [uniqueIndex("np_user_type").on(t.userId, t.type)]);
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(), userId: uuid("user_id").notNull().references(() => users.id), endpoint: text("endpoint").notNull().unique(),
  keys: jsonb("keys").notNull(), device: text("device"), lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
});
// Guarantees a scheduled notification (reminder, streak event, missed-part alert) fires at most once, across cron runs.
export const notificationJobs = pgTable("notification_jobs", { id: uuid("id").defaultRandom().primaryKey(), dedupeKey: text("dedupe_key").notNull().unique(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() });
