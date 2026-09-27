# إعداد قاعدة البيانات — خطوة واحدة مفقودة

## المشكلة
```
GET /api/cron/rollover → 500
error: relation "prayer_times" does not exist
```

## السبب
قاعدة البيانات على Vercel/Render/أي مزوّد فارغة — لم تُنشأ الجداول بعد.

## ✅ الحل 1: drizzle-kit (موصى به)

```bash
npm run db:push
```

سيسأل عن كل جدول (20 جدولًا) — اختر **"create table"** (الخيار الأول) في كل مرة.

---

## ✅ الحل 2: SQL مباشر (أسرع)

### أ) من لوحة مزوّد القاعدة (Neon/Supabase/Railway)
1. افتح SQL Editor في لوحة القاعدة
2. الصق محتوى ملف `init-db.sql` (الموجود في جذر المشروع)
3. شغّله مرة واحدة

### ب) من السطر (إن كان psql متاحًا)
```bash
psql "$DATABASE_URL" -f init-db.sql
```

---

## ✅ الحل 3: من Node.js مباشرة

شغّل هذا السكربت مرة واحدة:

\`\`\`bash
node -e "
const { readFileSync } = require('fs');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const sql = readFileSync('init-db.sql', 'utf8');
pool.query(sql).then(() => {
  console.log('✅ تم إنشاء كل الجداول بنجاح!');
  process.exit(0);
}).catch(err => {
  console.error('❌ خطأ:', err.message);
  process.exit(1);
});
"
\`\`\`

---

## التحقق من النجاح

بعد أي حل من الثلاثة، تحقق:

```bash
# من السطر
psql "$DATABASE_URL" -c "\dt"
```

يجب أن ترى 20 جدولًا:
- users, sessions, admin_roles
- groups, group_members
- prayer_times, khatmah_days, part_assignments, reading_sessions
- backup_assignments, user_streaks
- notification_templates, notification_settings, notifications
- notification_preferences, push_subscriptions, notification_jobs
- audit_logs

---

## بعد إنشاء الجداول

1. **أول Super Admin:**
   ```bash
   npm run make-admin -- +249XXXXXXXXX
   ```
   (استبدل الرقم برقم الحساب المسجَّل)

2. **جدولة Cron:**
   أضف في cron-job.org أو Vercel Cron:
   ```
   GET https://your-domain.com/api/cron/rollover
   Header: Authorization: Bearer YOUR_CRON_SECRET
   كل 5 دقائق: */5 * * * *
   ```

3. **Web Push (اختياري):**
   ```bash
   npm run gen-vapid
   ```
   والصق الثلاث سطور في Environment Variables

---

## ⚠️ مهم جدًا

**أي تعديل مستقبلي على `src/db/schema.ts` يتطلب تشغيل يدوي لـ:**
```bash
npm run db:push
```

**ليس تلقائيًا** عند النشر — هذا تصميم متعمد لتفادي تغييرات غير مقصودة على الإنتاج.

---

## استكشاف الأخطاء

### ❌ "relation does not exist"
→ الجداول لم تُنشأ — شغّل أحد الحلول أعلاه

### ❌ "duplicate key value violates unique constraint"
→ حاولت تشغيل init-db.sql مرتين — تجاهله، الجداول موجودة

### ❌ drizzle-kit push يسأل أسئلة كثيرة
→ هذا طبيعي في المرة الأولى — اختر "create table" (20 مرة)
→ أو استخدم init-db.sql مباشرة (أسرع)
