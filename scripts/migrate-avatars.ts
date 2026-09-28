/**
 * Migration script to convert old DiceBear seeds to Avataaars configs
 * Run once: npm run ts-node scripts/migrate-avatars.ts
 */
import { db } from "../src/db";
import { users } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { getDefaultAvatarConfig, stringifyAvatarConfig, AVATAR_PRESETS } from "../src/lib/avataaars";

async function migrateAvatars() {
  console.log("Starting avatar migration...");

  const allUsers = await db.select().from(users);
  console.log(`Found ${allUsers.length} users`);

  let migrated = 0;
  let skipped = 0;

  for (const user of allUsers) {
    const key = user.avatarKey;

    // Check if already JSON format
    if (key.startsWith("{")) {
      skipped++;
      continue;
    }

    // Convert old format to new
    let config;
    
    // Check if it's a preset key (m01-m30 or f01-f30)
    const presetMatch = key.match(/^([mf])(\d{2})$/);
    if (presetMatch) {
      const [, gender, num] = presetMatch;
      const index = parseInt(num, 10) - 1;
      const presets = gender === "m" ? AVATAR_PRESETS.male : AVATAR_PRESETS.female;
      
      if (index >= 0 && index < presets.length) {
        config = { ...presets[index], avatarStyle: "Circle" as const };
      } else {
        config = getDefaultAvatarConfig();
      }
    } else {
      // Unknown format, use default
      config = getDefaultAvatarConfig();
    }

    const newKey = stringifyAvatarConfig(config);

    await db.update(users).set({ avatarKey: newKey }).where(eq(users.id, user.id));
    migrated++;

    if (migrated % 10 === 0) {
      console.log(`Migrated ${migrated} users...`);
    }
  }

  console.log(`\nMigration complete!`);
  console.log(`- Migrated: ${migrated}`);
  console.log(`- Skipped (already migrated): ${skipped}`);
}

migrateAvatars()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
