import { and, eq } from "drizzle-orm";
import webpush from "web-push";
import * as s from "../db/schema";
import { DEFAULT_TEMPLATES, OPTIONAL_TYPES } from "../i18n/templates";
import type { Db } from "./groups";
const CRITICAL = new Set(["strong_reminder", "missing_part_user", "missing_part_admin", "streak_broken", "admin_alert", "admin_message"]);
const interpolate = (t: string, vars: Record<string, string | number>) => t.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ""));
async function renderTemplate(db: Db, type: string, vars: Record<string, string | number>) {
  const [row] = await db.select().from(s.notificationTemplates).where(and(eq(s.notificationTemplates.key, type), eq(s.notificationTemplates.locale, "ar")));
  const base = row ?? DEFAULT_TEMPLATES[type];
  if (!base) throw new Error(`unknown notification type: ${type}`);
  return { title: interpolate(base.title, vars), body: interpolate(base.body, vars) };
}
let vapidReady = false;
function ensureVapid() {
  if (vapidReady) return true;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(VAPID_SUBJECT ?? "mailto:admin@eqraa.app", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  return (vapidReady = true);
}
/** Best-effort: the inbox row above is what's guaranteed. A dead subscription is dropped quietly. */
async function pushBestEffort(db: Db, userId: string, msg: { title: string; body: string }) {
  if (!ensureVapid()) return;
  const subs = await db.select().from(s.pushSubscriptions).where(eq(s.pushSubscriptions.userId, userId));
  await Promise.all(subs.map(async (sub) => {
    try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys as { p256dh: string; auth: string } }, JSON.stringify(msg)); }
    catch (e: unknown) { if ((e as { statusCode?: number }).statusCode === 404 || (e as { statusCode?: number }).statusCode === 410) await db.delete(s.pushSubscriptions).where(eq(s.pushSubscriptions.id, sub.id)); }
  }));
}
/**
 * Records a notification in the user's inbox (always) and attempts push (best-effort). `dedupeKey`, when given,
 * guarantees a scheduled/derived notification fires at most once even if the cron or a replay runs twice.
 * Optional types (OPTIONAL_TYPES) are skipped if the user disabled them; everything else always goes through.
 */
export async function notify(db: Db, i: { userId: string; type: string; vars?: Record<string, string | number>; dedupeKey?: string }) {
  if (i.dedupeKey) {
    const [job] = await db.insert(s.notificationJobs).values({ dedupeKey: i.dedupeKey }).onConflictDoNothing().returning();
    if (!job) return;
  }
  if ((OPTIONAL_TYPES as readonly string[]).includes(i.type)) {
    const [pref] = await db.select().from(s.notificationPreferences).where(and(eq(s.notificationPreferences.userId, i.userId), eq(s.notificationPreferences.type, i.type)));
    if (pref && !pref.enabled) return;
  }
  const vars = i.vars ?? {}, tpl = await renderTemplate(db, i.type, vars);
  await db.insert(s.notifications).values({ userId: i.userId, type: i.type, payload: tpl });
  await pushBestEffort(db, i.userId, tpl);
}
export const notifyAdmins = async (db: Db, i: { type: string; vars?: Record<string, string | number>; dedupeKey?: string }) => {
  const admins = await db.select({ userId: s.adminRoles.userId }).from(s.adminRoles);
  for (const a of admins) await notify(db, { userId: a.userId, type: i.type, vars: i.vars, dedupeKey: i.dedupeKey ? `${i.dedupeKey}:${a.userId}` : undefined });
};
