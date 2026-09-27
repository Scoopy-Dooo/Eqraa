import { parsePhoneNumberFromString } from "libphonenumber-js";
import { hash, verify } from "@node-rs/argon2";
/** Requires "+" country code (e.g. +249…). Returns E.164 or null. */
export function normalizePhone(raw: string): string | null {
  const s = raw.trim();
  if (!s.startsWith("+")) return null;
  const p = parsePhoneNumberFromString(s);
  return p?.isValid() ? p.number : null;
}
/** 6 digits, not all-same, not an ascending/descending run. */
export function isStrongPin(pin: string): boolean {
  if (!/^\d{6}$/.test(pin)) return false;
  const d = [...pin].map(Number);
  if (d.every((x) => x === d[0])) return false;
  const step = d[1] - d[0];
  return !((step === 1 || step === -1) && d.every((x, i) => i === 0 || x - d[i - 1] === step));
}
export const hashPin = (pin: string) => hash(pin, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
export const verifyPin = (h: string, pin: string) => verify(h, pin);
/** After 5 failures: 1,2,4,… minutes, capped at 60. Returns ms (0 = no lock). */
export function lockMs(failures: number): number {
  return failures < 5 ? 0 : Math.min(2 ** (failures - 5), 60) * 60_000;
}
