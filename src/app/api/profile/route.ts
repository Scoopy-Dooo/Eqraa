/**
 * PATCH /api/profile — Update user profile (name, gender, avatar)
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { currentUser } from "@/lib/session";
import { AVATARS } from "@/components/Avatar";

const UpdateProfileSchema = z.object({
  firstName: z.string().min(1).max(30).optional(),
  lastName: z.string().min(1).max(30).optional(),
  gender: z.enum(["male", "female"]).optional(),
  avatar: z.enum([...AVATARS.male, ...AVATARS.female] as readonly [string, ...string[]]).optional(),
});

export async function PATCH(req: Request) {
  const actor = await currentUser();
  if (!actor) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = UpdateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const data = parsed.data;
  const updates: Partial<typeof users.$inferInsert> = {};

  if (data.firstName !== undefined) updates.firstName = data.firstName;
  if (data.lastName !== undefined) updates.lastName = data.lastName;
  if (data.gender !== undefined) updates.gender = data.gender;
  if (data.avatar !== undefined) updates.avatarKey = data.avatar;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true });
  }

  await db.update(users).set(updates).where(eq(users.id, actor.id));

  return NextResponse.json({ ok: true });
}
