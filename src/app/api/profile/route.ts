/**
 * GET /api/profile — Get user profile data
 * PATCH /api/profile — Update user profile (name, gender, avatar)
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users, groupMembers, groups } from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { currentUser } from "@/lib/session";
import { parseAvatarKey } from "@/lib/avataaars";
import { getStreak } from "@/lib/streak";
import { leaderboard } from "@/lib/leaderboard";
import { todayFor } from "@/lib/reading";

const UpdateProfileSchema = z.object({
  firstName: z.string().min(1).max(30).optional(),
  lastName: z.string().min(1).max(30).optional(),
  gender: z.enum(["male", "female"]).optional(),
  avatar: z.string().optional(), // JSON string of AvatarConfig
});

export async function GET() {
  const actor = await currentUser();
  if (!actor) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Get full user data
  const [user] = await db.select().from(users).where(eq(users.id, actor.id));
  if (!user) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Get current group and slot
  const [membership] = await db
    .select({
      groupName: groups.name,
      slot: groupMembers.slot,
    })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(and(eq(groupMembers.userId, actor.id), isNull(groupMembers.leftAt)));

  // Get today's assignment
  let currentPart: number | null = null;
  if (membership) {
    const today = await todayFor(db, actor.id);
    currentPart = today.state === "open" && today.mine ? today.mine.part : null;
  }

  // Get streak
  const streak = await getStreak(db, actor.id);

  // Get stats from leaderboard
  const weeklyStats = await leaderboard(db, {
    period: "weekly",
    scope: "all",
    userId: actor.id,
  });
  const myWeekly = weeklyStats.find((s) => s.userId === actor.id);

  const monthlyStats = await leaderboard(db, {
    period: "monthly",
    scope: "all",
    userId: actor.id,
  });
  const myMonthly = monthlyStats.find((s) => s.userId === actor.id);

  const allTimeStats = await leaderboard(db, {
    period: "all",
    scope: "all",
    userId: actor.id,
  });
  const myAllTime = allTimeStats.find((s) => s.userId === actor.id);

  return NextResponse.json({
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneE164: user.phoneE164,
      gender: user.gender,
      avatarKey: user.avatarKey,
    },
    membership: membership
      ? {
          groupName: membership.groupName,
          slot: membership.slot,
          currentPart,
        }
      : null,
    streak: {
      current: streak.current,
      protections: streak.protections,
    },
    stats: {
      weeklyParts: myWeekly?.partsRead || 0,
      monthlyParts: myMonthly?.partsRead || 0,
      allTimeParts: myAllTime?.partsRead || 0,
      commitment: myAllTime?.commitment || 0,
    },
  });
}

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
  if (data.avatar !== undefined) {
    // Validate avatar JSON
    try {
      parseAvatarKey(data.avatar);
      updates.avatarKey = data.avatar;
    } catch {
      return NextResponse.json({ error: "invalid_avatar" }, { status: 400 });
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true });
  }

  await db.update(users).set(updates).where(eq(users.id, actor.id));

  return NextResponse.json({ ok: true });
}
