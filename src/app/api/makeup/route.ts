import { db } from "@/db";
import { currentUser } from "@/lib/session";
import { missedFor } from "@/lib/reading";
export async function GET() {
  const me = await currentUser();
  return me ? Response.json(await missedFor(db, me.id)) : Response.json({ error: "unauthorized" }, { status: 401 });
}
