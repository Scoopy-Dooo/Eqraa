/**
 * PATCH /api/profile/phone — Change user phone number
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { currentUser } from "@/lib/session";
import { normalizePhone } from "@/lib/auth-core";
import { rateLimit } from "@/lib/rate-limit";

const ChangePhoneSchema = z.object({
  newPhone: z.string().min(1),
});

export async function PATCH(req: Request) {
  const actor = await currentUser();
  if (!actor) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Rate limit: 10 attempts per hour
  const allowed = rateLimit(`change-phone:${actor.id}`, 10, 3600_000);
  if (!allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await req.json();
  const parsed = ChangePhoneSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const normalized = normalizePhone(parsed.data.newPhone);
  if (!normalized) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }

  // Check if phone is already taken
  const existing = await db.query.users.findFirst({
    where: eq(users.phoneE164, normalized),
  });

  if (existing) {
    return NextResponse.json({ error: "phone_taken" }, { status: 409 });
  }

  // Get old phone for audit log
  const currentUserData = await db.query.users.findFirst({
    where: eq(users.id, actor.id),
    columns: { phoneE164: true },
  });
  const oldPhone = currentUserData?.phoneE164;

  // Update phone
  await db.update(users).set({ phoneE164: normalized }).where(eq(users.id, actor.id));

  // Log in audit
  await db.insert(auditLogs).values({
    actorId: actor.id,
    action: "user.phone_changed",
    targetType: "user",
    targetId: actor.id,
    before: oldPhone ? { phone: oldPhone } : null,
    after: { phone: normalized },
  });

  return NextResponse.json({ ok: true });
}
