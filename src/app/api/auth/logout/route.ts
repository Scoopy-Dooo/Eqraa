import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { sha256 } from "@/lib/session";
export async function POST() {
  const c = await cookies();
  const tok = c.get("eqraa_session")?.value;
  if (tok) await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.tokenHash, sha256(tok)));
  c.delete("eqraa_session");
  return Response.json({ ok: true });
}
