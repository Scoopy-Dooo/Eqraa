import { eq } from "drizzle-orm";
import { db } from "@/db";
import { adminRoles } from "@/db/schema";
import { currentUser } from "./session";
export const PERMISSIONS = {
  admin: ["groups:manage", "readings:manage", "users:manage"],
  super_admin: ["groups:manage", "readings:manage", "users:manage", "admins:manage", "settings:manage", "audit:read"],
} as const;
/** Server-side gate: returns the user only if their role grants the permission. */
export async function requirePermission(p: string) {
  const u = await currentUser();
  if (!u) return null;
  const [r] = await db.select({ role: adminRoles.role }).from(adminRoles).where(eq(adminRoles.userId, u.id));
  return r && (PERMISSIONS[r.role] as readonly string[]).includes(p) ? u : null;
}
/** Current admin with a permission checker, or null (also null for non-admins). */
export async function getAdmin() {
  const u = await currentUser();
  if (!u) return null;
  const [r] = await db.select({ role: adminRoles.role }).from(adminRoles).where(eq(adminRoles.userId, u.id));
  if (!r) return null;
  const perms = PERMISSIONS[r.role] as readonly string[];
  return { user: u, role: r.role, can: (p: string) => perms.includes(p) };
}
