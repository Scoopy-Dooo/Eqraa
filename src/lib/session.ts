import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export async function startSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 30 * 864e5);
  await db.insert(sessions).values({ userId, tokenHash: sha256(token), expiresAt });
  (await cookies()).set("eqraa_session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
}
/** Server-side identity check: valid, unexpired, unrevoked session of an active user. */
export async function currentUser() {
  const tok = (await cookies()).get("eqraa_session")?.value;
  if (!tok) return null;
  const [r] = await db.select({ id: users.id, firstName: users.firstName, avatarKey: users.avatarKey }).from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, sha256(tok)), gt(sessions.expiresAt, new Date()), isNull(sessions.revokedAt), eq(users.status, "active")));
  return r ?? null;
}
