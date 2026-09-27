import { eq } from "drizzle-orm";
import * as s from "../db/schema";
import type { Db } from "./groups";
export type Timings = { fajr: Date; dhuhr: Date; asr: Date; maghrib: Date; isha: Date };
export interface PrayerProvider { timings(localDate: string): Promise<Timings | null>; }
const KHARTOUM_UTC_OFFSET_H = 2; // Africa/Khartoum: UTC+2, no DST
export const khartoumDate = (d: Date) => new Date(d.getTime() + KHARTOUM_UTC_OFFSET_H * 36e5).toISOString().slice(0, 10);
export const addDays = (date: string, n: number) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const toUtc = (date: string, hhmm: string) => new Date(Date.parse(`${date}T${hhmm}:00Z`) - KHARTOUM_UTC_OFFSET_H * 36e5);
/** Used only if the provider is unreachable (BR-T4). Rough Khartoum averages — not exact for any single day. */
export function fallbackTimings(date: string): Timings {
  return { fajr: toUtc(date, "05:00"), dhuhr: toUtc(date, "12:15"), asr: toUtc(date, "15:45"), maghrib: toUtc(date, "18:05"), isha: toUtc(date, "19:35") };
}
export const fallbackFajr = (date: string) => fallbackTimings(date).fajr;
/** Aladhan API, Khartoum coordinates. ASSUMPTION: calculation method 5 (Egyptian General Authority); confirm against local mosque timetables. Returns all 5 daily prayers in one call. */
export const aladhan: PrayerProvider = {
  async timings(date) {
    const [y, m, d] = date.split("-");
    const r = await fetch(`https://api.aladhan.com/v1/timings/${d}-${m}-${y}?latitude=15.5007&longitude=32.5599&method=5&timezonestring=Africa/Khartoum`, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    const t = (await r.json())?.data?.timings as Record<string, string> | undefined;
    if (!t) return null;
    const parse = (v?: string) => { const m2 = v && /^(\d{2}):(\d{2})/.exec(v); return m2 ? toUtc(date, `${m2[1]}:${m2[2]}`) : null; };
    const [fajr, dhuhr, asr, maghrib, isha] = [parse(t.Fajr), parse(t.Dhuhr), parse(t.Asr), parse(t.Maghrib), parse(t.Isha)];
    return fajr && dhuhr && asr && maghrib && isha ? { fajr, dhuhr, asr, maghrib, isha } : null;
  },
};
/** Stored (override/provider) times first; an outage fallback is returned but never cached, so it can't stick. */
export async function prayerTimesFor(db: Db, provider: PrayerProvider, date: string): Promise<Timings> {
  const [row] = await db.select().from(s.prayerTimes).where(eq(s.prayerTimes.date, date));
  if (row?.dhuhrAt && row.asrAt && row.maghribAt && row.ishaAt) return { fajr: row.fajrAt, dhuhr: row.dhuhrAt, asr: row.asrAt, maghrib: row.maghribAt, isha: row.ishaAt };
  let t: Timings | null = null;
  try { t = await provider.timings(date); } catch { /* use fallback */ }
  if (!t) return fallbackTimings(date);
  await db.insert(s.prayerTimes).values({ date, fajrAt: t.fajr, dhuhrAt: t.dhuhr, asrAt: t.asr, maghribAt: t.maghrib, ishaAt: t.isha, source: "provider" }).onConflictDoNothing();
  return t;
}
/** Day boundaries only need Fajr; kept as a thin wrapper for callers that don't need the other four. */
export const fajrAt = async (db: Db, provider: PrayerProvider, date: string) => (await prayerTimesFor(db, provider, date)).fajr;
