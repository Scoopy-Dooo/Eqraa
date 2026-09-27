import { z } from "zod";
import { db } from "@/db";
import { requirePermission } from "@/lib/rbac";
import { domainFail } from "@/lib/http";
import { setSetting, upsertTemplate, sendBroadcast } from "@/lib/admin";
import { rateLimit } from "@/lib/rate-limit";
const Bool = z.enum(["true", "false"]).transform((v) => v === "true");
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("setReminders"), dhuhr: Bool, asr: Bool, maghrib: Bool, isha: Bool, strongBeforeEndMin: z.number().int().min(5).max(240) }),
  z.object({ action: z.literal("upsertTemplate"), key: z.string().min(1).max(60), title: z.string().min(1).max(120), body: z.string().min(1).max(500) }),
  z.object({ action: z.literal("broadcast"), groupId: z.string().uuid().optional(), title: z.string().min(1).max(120), body: z.string().min(1).max(500) }),
]);
export async function POST(req: Request) {
  const me = await requirePermission("readings:manage"); // notification settings: same level as daily-khatmah admin
  if (!me) return Response.json({ error: "forbidden" }, { status: 403 });
  const raw = await req.json().catch(() => null);
  if (raw && "groupId" in raw && raw.groupId === "") delete raw.groupId; // the "all" option in the select posts an empty string
  const b = Body.safeParse(raw);
  if (!b.success) return Response.json({ error: "invalid" }, { status: 400 });
  try {
    if (b.data.action === "setReminders") {
      const { dhuhr, asr, maghrib, isha, strongBeforeEndMin } = b.data;
      return Response.json(await setSetting(db, me.id, "reminders", { prayers: { dhuhr, asr, maghrib, isha }, strongBeforeEndMin }));
    }
    if (b.data.action === "upsertTemplate") return Response.json(await upsertTemplate(db, me.id, b.data));
    // A broadcast reaches every member of a group (or everyone) at once, so it gets a tighter cap than other admin actions.
    if (!rateLimit(`broadcast:${me.id}`, 5, 3_600_000)) return Response.json({ error: "rateLimited" }, { status: 429 });
    return Response.json(await sendBroadcast(db, me.id, b.data));
  } catch (e) { return domainFail(e); }
}
