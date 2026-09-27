import { describe, it, expect } from "vitest";
import { partFor, dayNumber } from "../src/domain/rotation";
describe("BR-R1 rotation", () => {
  it.each([[1, 1, 1], [30, 1, 30], [1, 2, 2], [30, 2, 1], [10, 2, 11], [10, 3, 12], [1, 20, 20], [12, 20, 1], [1, 31, 1]])("slot %i day %i -> part %i", (slot, day, part) => expect(partFor(slot, day)).toBe(part));
  it("honours startOffset", () => expect(partFor(1, 1, 4)).toBe(5));
  it("full group covers all 30 parts each day", () => { for (const d of [1, 7, 30, 45]) expect(new Set(Array.from({ length: 30 }, (_, i) => partFor(i + 1, d))).size).toBe(30); });
  it("every slot reads all 30 parts over 30 days", () => expect(new Set(Array.from({ length: 30 }, (_, d) => partFor(7, d + 1))).size).toBe(30));
  it("rejects invalid input", () => { expect(() => partFor(0, 1)).toThrow(); expect(() => partFor(31, 1)).toThrow(); expect(() => partFor(1, 0)).toThrow(); });
});
describe("dayNumber", () => {
  it("counts from 1", () => { expect(dayNumber("2026-09-01", "2026-09-01")).toBe(1); expect(dayNumber("2026-09-01", "2026-10-01")).toBe(31); });
  it("rejects dates before start", () => expect(() => dayNumber("2026-09-02", "2026-09-01")).toThrow());
});
