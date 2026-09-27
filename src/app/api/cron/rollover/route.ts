import { db } from "@/db";
import { rollover } from "@/lib/rollover";
import { remindersTick } from "@/lib/reminders";
import { aladhan } from "@/lib/prayer";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  // Accepts either an Authorization header (preferred — use with an external scheduler like cron-job.org) or a
  // ?secret= query param (for schedulers, like Vercel Cron, that can't send custom headers).
  const secret = process.env.CRON_SECRET;
  const authed = !!secret && (req.headers.get("authorization") === `Bearer ${secret}` || new URL(req.url).searchParams.get("secret") === secret);
  if (!authed) return Response.json({ error: "forbidden" }, { status: 403 });
  await rollover(db, aladhan);
  await remindersTick(db, aladhan);
  return Response.json({ ok: true });
}
