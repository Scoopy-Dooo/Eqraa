import { describe, it, expect } from "vitest";
import { computeStreak } from "../src/domain/streak";
import { periodRange } from "../src/domain/periods";
const ok = (n: number) => Array(n).fill(true), no = (n: number) => Array(n).fill(false);
describe("computeStreak (BR-S)", () => {
  it("starts with no protection and earns one at exactly 15 days", () => { expect(computeStreak(ok(14)).protections).toBe(0); expect(computeStreak(ok(15))).toMatchObject({ current: 15, protections: 1, toward: 0 }); });
  it("caps protections at 2", () => { expect(computeStreak(ok(30)).protections).toBe(2); expect(computeStreak(ok(45)).protections).toBe(2); });
  it("a miss with protection keeps the streak and uses one protection", () => { expect(computeStreak([...ok(15), ...no(1)])).toMatchObject({ current: 15, protections: 0 }); });
  it("a miss without protection resets the streak, keeps best", () => { expect(computeStreak([...ok(5), ...no(1)])).toMatchObject({ current: 0, best: 5, toward: 0 }); });
  it("protected days do not advance the 15-day counter", () => { const r = computeStreak([...ok(15), ...no(1), ...ok(14)]); expect(r).toMatchObject({ current: 29, protections: 0, toward: 14 }); });
  it("nothing to protect at streak 0, so protections are kept", () => { expect(computeStreak([...ok(15), ...no(2), ...no(3)]).protections).toBe(0); expect(computeStreak([...ok(30), ...no(3), ...no(2)])).toMatchObject({ current: 0, protections: 0 }); expect(computeStreak([...ok(15), ...no(1), ...no(1), ...no(1)])).toMatchObject({ current: 0 }); });
  it("after a break, protections earned earlier are kept and the counter restarts", () => {
    const r = computeStreak([...ok(30), ...no(3), ...no(1), ...ok(15)]); // 2 protections: both consumed by the first two misses, third breaks
    expect(r.current).toBe(15); expect(r.protections).toBe(1);
  });
});
describe("periodRange", () => {
  it("week starts on Saturday", () => { for (const d of ["2026-09-19", "2026-09-23", "2026-09-25"]) expect(periodRange("weekly", d)).toEqual({ from: "2026-09-19", to: "2026-09-26" }); expect(periodRange("weekly", "2026-09-26")?.from).toBe("2026-09-26"); });
  it("month and all", () => { expect(periodRange("monthly", "2026-12-15")).toEqual({ from: "2026-12-01", to: "2027-01-01" }); expect(periodRange("all", "2026-12-15")).toBeNull(); });
});
