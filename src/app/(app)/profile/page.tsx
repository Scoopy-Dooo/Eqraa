import { currentUser } from "@/lib/session";
import { db } from "@/db";
import { users, groupMembers, groups } from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { getStreak } from "@/lib/streak";
import { leaderboard } from "@/lib/leaderboard";
import { Avatar, AVATARS } from "@/components/Avatar";
import { LogoutButton } from "@/components/LogoutButton";
import { prof } from "@/i18n/profile";
import { rk } from "@/i18n/rank";
import { todayFor } from "@/lib/reading";
import Link from "next/link";

const p = prof.ar;
const r = rk.ar;

export default async function ProfilePage() {
  const me = (await currentUser())!;

  // Get full user data
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, me.id));

  if (!user) return null;

  // Get current group and slot
  const [membership] = await db
    .select({
      groupId: groups.id,
      groupName: groups.name,
      slot: groupMembers.slot,
    })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(and(eq(groupMembers.userId, me.id), isNull(groupMembers.leftAt)));

  // Get today's assignment
  const today = await todayFor(db, me.id);
  const currentPart =
    today.state === "open" && today.mine ? today.mine.part : null;

  // Get streak
  const streak = await getStreak(db, me.id);

  // Get stats from leaderboard (reusing existing logic)
  const stats = await leaderboard(db, {
    period: "weekly",
    scope: "all",
    userId: me.id,
  });
  const myStats = stats.find((s) => s.userId === me.id);

  const weeklyParts = myStats?.partsRead || 0;

  const monthlyStats = await leaderboard(db, {
    period: "monthly",
    scope: "all",
    userId: me.id,
  });
  const myMonthly = monthlyStats.find((s) => s.userId === me.id);
  const monthlyParts = myMonthly?.partsRead || 0;

  const allTimeStats = await leaderboard(db, {
    period: "all",
    scope: "all",
    userId: me.id,
  });
  const myAllTime = allTimeStats.find((s) => s.userId === me.id);
  const allTimeParts = myAllTime?.partsRead || 0;
  const commitment = myAllTime?.commitment || 0;

  return (
    <main className="mt-6 space-y-6">
      <h1 className="text-2xl font-bold">{p.title}</h1>

      {/* Personal Info */}
      <section className="rounded-2xl border border-line bg-surface p-6 space-y-4">
        <div className="flex items-center gap-4">
          <Avatar k={user.avatarKey} size={64} />
          <div className="flex-1">
            <h2 className="text-xl font-bold">
              {user.firstName} {user.lastName || ""}
            </h2>
            <p className="text-sm text-muted">{user.phoneE164}</p>
          </div>
        </div>

        <div className="grid gap-3 border-t border-line pt-4">
          <div className="flex justify-between">
            <span className="text-muted">{p.gender}</span>
            <span className="font-semibold">
              {user.gender === "male" ? p.male : p.female}
            </span>
          </div>

          {membership && (
            <>
              <div className="flex justify-between">
                <span className="text-muted">{p.currentGroup}</span>
                <span className="font-semibold">{membership.groupName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">{p.slot}</span>
                <span className="font-semibold">{membership.slot}</span>
              </div>
              {currentPart && (
                <div className="flex justify-between">
                  <span className="text-muted">{p.currentPart}</span>
                  <span className="font-semibold">{currentPart}</span>
                </div>
              )}
            </>
          )}

          {!membership && (
            <div className="text-center text-muted">{p.noGroup}</div>
          )}
        </div>
      </section>

      {/* Stats */}
      <section className="rounded-2xl border border-line bg-surface p-6 space-y-4">
        <h2 className="text-lg font-bold">{p.stats}</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">{streak.current}</p>
            <p className="text-sm text-muted">{p.streak}</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-dawn-text">
              {streak.protections}
            </p>
            <p className="text-sm text-muted">{p.protections}</p>
          </div>
        </div>

        <div className="border-t border-line pt-4 space-y-3">
          <h3 className="font-semibold">{p.partsRead}</h3>
          <div className="flex justify-between">
            <span className="text-muted">{p.weekly}</span>
            <span className="font-semibold">{weeklyParts}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">{p.monthly}</span>
            <span className="font-semibold">{monthlyParts}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">{p.allTime}</span>
            <span className="font-semibold">{allTimeParts}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">{p.commitment}</span>
            <span className="font-semibold">{commitment}%</span>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="space-y-3">
        <Link
          href="/notifications"
          className="block min-h-11 rounded-xl border border-line bg-surface px-4 py-3 text-center font-semibold"
        >
          {p.notificationSettings}
        </Link>
        <Link
          href="/history"
          className="block min-h-11 rounded-xl border border-line bg-surface px-4 py-3 text-center font-semibold"
        >
          {p.history}
        </Link>
        <LogoutButton />
      </div>
    </main>
  );
}
