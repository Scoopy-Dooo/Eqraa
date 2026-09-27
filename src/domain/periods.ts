const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
export type Period = "weekly" | "monthly" | "all";
/** [from, to) in Khartoum local dates. Week starts on Saturday. `all` has no range. */
export function periodRange(period: Period, today: string): { from: string; to: string } | null {
  if (period === "all") return null;
  if (period === "monthly") {
    const [y, m] = today.split("-").map(Number);
    return { from: `${y}-${String(m).padStart(2, "0")}-01`, to: m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01` };
  }
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // Sun=0 .. Sat=6
  const from = addDays(today, -((dow + 1) % 7));
  return { from, to: addDays(from, 7) };
}
/** Instant of Khartoum midnight (UTC+2) for a local date. */
export const startInstant = (date: string) => new Date(Date.parse(`${date}T00:00:00Z`) - 2 * 36e5);
