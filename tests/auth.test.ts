import { describe, it, expect } from "vitest";
import { normalizePhone, isStrongPin, lockMs, hashPin, verifyPin } from "../src/lib/auth-core";
describe("phone", () => {
  it("accepts international Sudan number", () => expect(normalizePhone("+249 91 234 5678")).toBe("+249912345678"));
  it("rejects local format without +", () => expect(normalizePhone("0912345678")).toBeNull());
});
describe("pin", () => {
  it("accepts a normal 6-digit PIN", () => expect(isStrongPin("482619")).toBe(true));
  it.each(["12345", "1234567", "000000", "123456", "654321", "12ab56"])("rejects %s", (p) => expect(isStrongPin(p)).toBe(false));
  it("hashes and verifies", async () => { const h = await hashPin("482619"); expect(await verifyPin(h, "482619")).toBe(true); expect(await verifyPin(h, "482618")).toBe(false); });
});
describe("lockout", () => {
  it("no lock before 5 failures", () => expect(lockMs(4)).toBe(0));
  it("escalates and caps at 60 min", () => { expect(lockMs(5)).toBe(60_000); expect(lockMs(7)).toBe(240_000); expect(lockMs(30)).toBe(3_600_000); });
});
