export const PARTS = 30;
/** BR-R1: deterministic part for a slot on a given day of the group's cycle (day starts at 1). */
export function partFor(slot: number, day: number, startOffset = 0): number {
  if (!Number.isInteger(slot) || slot < 1 || slot > PARTS) throw new RangeError("slot must be 1..30");
  if (!Number.isInteger(day) || day < 1) throw new RangeError("day must be >= 1");
  return ((slot - 1 + (day - 1) + startOffset) % PARTS) + 1;
}
/** Day number of a local (Khartoum) date within a group that started on startDate. Both "YYYY-MM-DD". */
export function dayNumber(startDate: string, localDate: string): number {
  const ms = (s: string) => Date.parse(`${s}T00:00:00Z`);
  const n = Math.round((ms(localDate) - ms(startDate)) / 864e5) + 1;
  if (n < 1) throw new RangeError("date is before group start");
  return n;
}
