import { rateLimit, clientIp } from "@/lib/rate-limit";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { normalizePhone, isStrongPin, hashPin } from "@/lib/auth-core";
import { startSession } from "@/lib/session";
const Body = z.object({ firstName: z.string().trim().min(1).max(30), lastName: z.string().trim().max(30).optional(), phone: z.string(), pin: z.string(), gender: z.enum(["male", "female"]), avatarKey: z.string().regex(/^[a-z0-9-]{1,30}$/) });
export async function POST(req: Request) {
  if (!rateLimit("register:" + clientIp(req), 10, 3600000)) return Response.json({ error: "rateLimited" }, { status: 429 });
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return Response.json({ error: "invalid" }, { status: 400 });
  const phone = normalizePhone(b.data.phone);
  if (!phone) return Response.json({ error: "invalidPhone" }, { status: 400 });
  if (!isStrongPin(b.data.pin)) return Response.json({ error: "weakPin" }, { status: 400 });
  const [u] = await db.insert(users).values({ firstName: b.data.firstName, lastName: b.data.lastName, phoneE164: phone, pinHash: await hashPin(b.data.pin), gender: b.data.gender, avatarKey: b.data.avatarKey }).onConflictDoNothing().returning({ id: users.id });
  if (!u) return Response.json({ error: "phoneTaken" }, { status: 409 });
  await startSession(u.id);
  return Response.json({ ok: true }, { status: 201 });
}
