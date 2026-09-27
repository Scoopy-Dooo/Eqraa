import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { createRequire } from "node:module";
import { eq } from "drizzle-orm";
import * as s from "../src/db/schema";
import { prayerTimesFor, fallbackTimings, fajrAt, type Timings } from "../src/lib/prayer";
import type { Db } from "../src/lib/groups";
const { pushSchema } = createRequire(import.meta.url)("drizzle-kit/api");
const pg = drizzle(new PGlite(), { schema: s });
const db = pg as unknown as Db;
beforeAll(async () => { await (await pushSchema(s, pg as never)).apply(); }, 60_000);
describe("prayerTimesFor", () => {
  it("returns all 5 prayers from the provider and caches them", async () => {
    let calls = 0;
    const provider = { timings: async (d: string): Promise<Timings> => { calls++; return { ...fallbackTimings(d), dhuhr: new Date("2026-09-20T10:11:00Z") }; } };
    const t1 = await prayerTimesFor(db, provider, "2026-09-20");
    expect(t1.dhuhr.toISOString()).toBe("2026-09-20T10:11:00.000Z");
    const t2 = await prayerTimesFor(db, provider, "2026-09-20"); // second call hits the cache, not the provider
    expect(t2.dhuhr.toISOString()).toBe(t1.dhuhr.toISOString());
    expect(calls).toBe(1);
    const [row] = await pg.select().from(s.prayerTimes).where(eq(s.prayerTimes.date, "2026-09-20"));
    expect(row.dhuhrAt?.toISOString()).toBe("2026-09-20T10:11:00.000Z");
  });
  it("falls back to approximate Khartoum times (uncached) when the provider fails, and Fajr stays consistent", async () => {
    const down = { timings: async () => null };
    const t = await prayerTimesFor(db, down, "2026-09-21");
    expect(t).toEqual(fallbackTimings("2026-09-21"));
    expect((await fajrAt(db, down, "2026-09-21")).toISOString()).toBe(fallbackTimings("2026-09-21").fajr.toISOString());
    const [row] = await pg.select().from(s.prayerTimes).where(eq(s.prayerTimes.date, "2026-09-21"));
    expect(row).toBeUndefined(); // a fallback must never be cached, so a later outage recovery isn't blocked
  });
  it("orders the 5 prayers correctly through the day", () => {
    const t = fallbackTimings("2026-09-20");
    expect(t.fajr < t.dhuhr && t.dhuhr < t.asr && t.asr < t.maghrib && t.maghrib < t.isha).toBe(true);
  });
});
