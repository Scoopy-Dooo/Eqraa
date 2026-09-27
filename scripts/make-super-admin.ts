import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { users, adminRoles } from "../src/db/schema";
import { normalizePhone } from "../src/lib/auth-core";

async function main() {
  const phone = normalizePhone(process.argv[2] ?? "");
  if (!phone) { console.error("Usage: npm run make-admin -- +249XXXXXXXXX"); process.exit(1); }
  const [u] = await db.select().from(users).where(eq(users.phoneE164, phone));
  if (!u) { console.error("Register this number in the app first."); process.exit(1); }
  await db.insert(adminRoles).values({ userId: u.id, role: "super_admin" }).onConflictDoUpdate({ target: adminRoles.userId, set: { role: "super_admin" } });
  console.log(`Done: ${u.firstName} is now super_admin`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
