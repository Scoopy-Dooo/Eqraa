import { db } from "@/db";
import { currentUser } from "@/lib/session";
import { leaderboard } from "@/lib/leaderboard";
export async function GET(req: Request) {
  const me = await currentUser();
  if (!me) return Response.json({ error: "unauthorized" }, { status: 401 });
  const q = new URL(req.url).searchParams, p = q.get("period"), sc = q.get("scope");
  return Response.json(await leaderboard(db, { period: p === "monthly" || p === "all" ? p : "weekly", scope: sc === "all" ? "all" : "group", userId: me.id }));
}
