import { it, expect } from "vitest";
import { rateLimit } from "../src/lib/rate-limit";
it("blocks after max hits and recovers after the window", () => {
  for (let i = 0; i < 3; i++) expect(rateLimit("t", 3, 1000, 0)).toBe(true);
  expect(rateLimit("t", 3, 1000, 500)).toBe(false);
  expect(rateLimit("t", 3, 1000, 1500)).toBe(true);
});
