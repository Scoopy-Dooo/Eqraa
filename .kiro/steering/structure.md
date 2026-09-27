---
inclusion: always
---
# خريطة المشروع

```
src/
  app/                    صفحات وAPI routes (Next.js App Router)
    (app)/                صفحات بعد تسجيل الدخول: الرئيسية، الترتيب، الإشعارات
    admin/                لوحة الإدارة (Dashboard, Users, Groups, Daily, History, Audit, Admins, Notifications)
    api/                  كل الـendpoints، منظمة بنفس بنية الصفحات
    page.tsx              الصفحة الرئيسية العامة (Landing، 10 أقسام)
    login/ register/      صفحات الدخول والتسجيل
  components/             React components؛ components/landing/ خاص بالصفحة الرئيسية فقط
  domain/                 دوال منطقية نقية بلا قاعدة بيانات (rotation.ts, streak.ts, periods.ts) — ابدأ هنا لفهم أي قاعدة رياضية
  lib/                    كل منطق متصل بقاعدة البيانات (groups, reading, backup, streak, leaderboard, admin, notify, reminders, prayer, rollover, rbac, session, auth-core...)
  db/schema.ts             تعريف كل الجداول العشرين في ملف واحد — مصدر الحقيقة الوحيد لشكل البيانات
  i18n/                   كل النصوص العربية (والإنجليزية جزئيًا)
tests/                    82 اختبارًا، كل ملف يقابل جزءًا من lib/ أو domain/
scripts/                  make-super-admin.ts, generate-vapid.ts
public/                   manifest.webmanifest, sw.js, icons/
.kiro/                    steering + hooks (هذا الملف)
HANDOFF.md                ملف تسليم شامل: القرارات، القيود المعروفة، تشخيص الأعطال الشائعة
DEPLOYMENT.md              خطوات النشر التفصيلية خطوة بخطوة
LAUNCH_CHECKLIST.md        قائمة تجربة ما قبل الإطلاق مع مجموعة صغيرة
```

## اصطلاحات التسمية
- ملفات lib/ تصدّر دوالًا غير متزامنة تأخذ `db` كأول معامل (نمط `fn(db, actor, input)`) لتبقى قابلة للاختبار بـPGlite دون خادم حقيقي.
- كل خطأ منطقي (وليس خطأ نظام) يُرمى كـ`DomainError(code)` من `src/lib/groups.ts`، ويُترجَم لرسالة عربية في `src/i18n/admin.ts` (`ad.err`).
- كل route في `src/app/api/` يتحقق من الهوية (`currentUser`) والصلاحية (`requirePermission`) في أول سطرين قبل أي منطق.
