import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users, sessions, auditLogs } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { currentUser } from "@/lib/session";
import { verifyPin, hashPin, isStrongPin } from "@/lib/auth-core";
import { rateLimit } from "@/lib/rate-limit";

const ChangePinSchema = z.object({
  currentPin: z.string().min(1),
  newPin: z.string().min(1),
});

export async function PATCH(req: Request) {
  const actor = await currentUser();
  if (!actor) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Rate limit: 10 attempts per hour
  const allowed = rateLimit(`change-pin:${actor.id}`, 10, 3600_000);
  if (!allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await req.json();
  const parsed = ChangePinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const { currentPin, newPin } = parsed.data;

  // Verify current PIN
  const user = await db.query.users.findFirst({
    where: eq(users.id, actor.id),
  });

  if (!user || !user.pinHash) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const validCurrent = await verifyPin(currentPin, user.pinHash);
  if (!validCurrent) {
    return NextResponse.json({ error: "wrong_current_pin" }, { status: 403 });
  }

  // Check new PIN strength
  const strongEnough = isStrongPin(newPin);
  if (!strongEnough) {
    return NextResponse.json({ error: "weak_pin" }, { status: 400 });
  }

  // Hash new PIN
  const newHash = await hashPin(newPin);

  // Update PIN and clear lockout
  await db
    .update(users)
    .set({
      pinHash: newHash,
      failedPinCount: 0,
      lockedUntil: null,
    })
    .where(eq(users.id, actor.id));

  // Revoke all other sessions for security (user will need to login again on other devices)
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, actor.id), isNull(sessions.revokedAt)));

  // Log in audit (never log PINs!)
  await db.insert(auditLogs).values({
    actorId: actor.id,
    action: "user.pin_changed",
    targetType: "user",
    targetId: actor.id,
  });

  return NextResponse.json({ ok: true });
}
