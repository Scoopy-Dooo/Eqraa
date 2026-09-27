// In-memory sliding window (per server instance). Move to the DB/Redis if we ever run several instances.
const hits = new Map<string, number[]>();
export function rateLimit(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { hits.set(key, arr); return false; }
  arr.push(now); hits.set(key, arr); return true;
}
export const clientIp = (r: Request) => r.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
