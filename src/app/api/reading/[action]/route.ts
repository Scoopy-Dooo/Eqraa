import { z } from "zod";
import { db } from "@/db";
import { currentUser } from "@/lib/session";
import { requirePermission } from "@/lib/rbac";
import { domainFail } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { startReading, finishReading, undoReading, finishMakeup, undoMakeup } from "@/lib/reading";
const Base = z.object({ assignmentId: z.string().uuid() });
const Finish = Base.extend({ idempotencyKey: z.string().min(8).max(64), clientTime: z.string().datetime().optional() });
export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const me = await currentUser();
  if (!me) return Response.json({ error: "unauthorized" }, { status: 401 });
  // Generous but bounded: a legitimate user rarely needs more than a handful of these per minute; this only
  // guards against a runaway client or retry loop, since idempotency keys already make repeats harmless.
  if (!rateLimit(`reading:${me.id}`, 60, 300_000)) return Response.json({ error: "rateLimited" }, { status: 429 });
  const { action } = await params, body = await req.json().catch(() => null);
  const admin = () => requirePermission("readings:manage").then(Boolean);
  try {
    if (action === "finish" || action === "makeup") {
      const b = Finish.safeParse(body);
      if (b.success) { const i = { ...b.data, clientTime: b.data.clientTime ? new Date(b.data.clientTime) : undefined }; return Response.json(await (action === "finish" ? finishReading : finishMakeup)(db, me.id, i)); }
    } else if (["start", "undo", "undo-makeup"].includes(action)) {
      const b = Base.safeParse(body);
      if (b.success) return Response.json(action === "start" ? await startReading(db, me.id, b.data.assignmentId) : action === "undo" ? await undoReading(db, me.id, b.data.assignmentId, { admin: await admin() }) : await undoMakeup(db, me.id, b.data.assignmentId, { admin: await admin() }));
    }
    return Response.json({ error: "invalid" }, { status: 400 });
  } catch (e) { return domainFail(e); }
}
