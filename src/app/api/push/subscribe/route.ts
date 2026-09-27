import { z } from "zod";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { currentUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
const Body = z.object({ endpoint: z.string().url(), keys: z.object({ p256dh: z.string(), auth: z.string() }), device: z.string().max(100).optional() });
export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!rateLimit(`push-sub:${me.id}`, 20, 3_600_000)) return Response.json({ error: "rateLimited" }, { status: 429 });
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return Response.json({ error: "invalid" }, { status: 400 });
  await db.insert(pushSubscriptions).values({ userId: me.id, endpoint: b.data.endpoint, keys: b.data.keys, device: b.data.device }).onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId: me.id, keys: b.data.keys, lastSeenAt: new Date() } });
  return Response.json({ ok: true });
}
export async function GET() { return Response.json({ publicKey: process.env.VAPID_PUBLIC_KEY ?? null }); }
