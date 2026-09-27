import { rateLimit, clientIp } from "@/lib/rate-limit";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { normalizePhone, verifyPin, lockMs } from "@/lib/auth-core";
import { startSession } from "@/lib/session";
const Body = z.object({ phone: z.string(), pin: z.string().regex(/^\d{6}$/) });
const bad = () => Response.json({ error: "badLogin" }, { status: 401 }); // same answer for unknown phone / wrong PIN
export async function POST(req: Request) {
  if (!rateLimit("login:" + clientIp(req), 30, 900000)) return Response.json({ error: "rateLimited" }, { status: 429 });
  const b = Body.safeParse(await req.json().catch(() => null));
  const phone = b.success ? normalizePhone(b.data.phone) : null;
  if (!b.success || !phone) return bad();
  const [u] = await db.select().from(users).where(eq(users.phoneE164, phone));
  if (!u || u.status !== "active") return bad();
  if (u.lockedUntil && u.lockedUntil > new Date()) return Response.json({ error: "locked" }, { status: 429 });
  if (!(await verifyPin(u.pinHash, b.data.pin))) {
    const n = u.failedPinCount + 1, ms = lockMs(n);
    await db.update(users).set({ failedPinCount: n, lockedUntil: ms ? new Date(Date.now() + ms) : null }).where(eq(users.id, u.id));
    return bad();
  }
  await db.update(users).set({ failedPinCount: 0, lockedUntil: null }).where(eq(users.id, u.id));
  await startSession(u.id);
  return Response.json({ ok: true });
}
