#!/usr/bin/env tsx
/**
 * تشغيل init-db.sql على قاعدة البيانات — بديل سريع لـ drizzle-kit push
 * الاستخدام: tsx --env-file=.env scripts/init-db.ts
 */
import { readFileSync } from "fs";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  console.log("📊 جارٍ إنشاء جداول Eqraa...");
  
  const initSql = readFileSync("init-db.sql", "utf-8");
  
  try {
    await sql.unsafe(initSql);
    console.log("✅ تم إنشاء كل الجداول بنجاح!");
    console.log("\n📋 الخطوة التالية:");
    console.log("   npm run make-admin -- +249XXXXXXXXX");
  } catch (error: any) {
    if (error.message?.includes("already exists")) {
      console.log("ℹ️  الجداول موجودة بالفعل — لا داعي لإعادة الإنشاء");
    } else {
      console.error("❌ خطأ:", error.message);
      process.exit(1);
    }
  } finally {
    await sql.end();
  }
}

main();
