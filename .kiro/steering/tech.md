---
inclusion: always
---
# التقنيات والأوامر

## Stack
Next.js 15 (App Router) + React 19 + TypeScript، Tailwind CSS v4، PostgreSQL عبر Drizzle ORM، مصادقة مخصصة (هاتف + PIN بـArgon2id + جلسات Cookie)، PWA بـService Worker يدوي + IndexedDB، Web Push (VAPID)، مواقيت الصلاة من Aladhan API، Vitest + PGlite (Postgres حقيقي في الذاكرة) للاختبارات.

## الأوامر التي يجب تشغيلها دائمًا بعد أي تعديل
```
npm run check     # tsc --noEmit ثم vitest run — الحد الأدنى قبل اعتبار أي مهمة منتهية
npm run build      # بناء إنتاجي كامل — شغّله قبل أي نشر، يكتشف مشاكل لا يكتشفها tsc وحده
```

## أوامر أخرى
```
npm run dev                 # تشغيل محلي
npm run db:push              # يزامن src/db/schema.ts مع قاعدة البيانات الفعلية — يدوي دائمًا، غير تلقائي عند النشر
npm run make-admin -- +249XXXXXXXXX
npm run gen-vapid
```

## متغيرات البيئة (`.env` محليًا)
`DATABASE_URL` (إجباري) • `CRON_SECRET` (لجدولة `/api/cron/rollover`) • `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` (اختياري، لإشعارات الهاتف الفورية).

## قواعد كتابة الكود في هذا المشروع
- كل قاعدة عمل حساسة تُختبر بـVitest على PGlite (قاعدة بيانات حقيقية)، وليس Mocks. أي دالة جديدة في `src/lib/` أو `src/domain/` تحتاج اختبارًا مطابقًا في `tests/`.
- الصلاحيات (RBAC) تُفحص في السيرفر دائمًا (`src/lib/rbac.ts`)، أبدًا في الواجهة فقط.
- أي تعديل على `src/db/schema.ts` يتطلب تذكير المستخدم بتشغيل `npm run db:push` يدويًا — لا يوجد Migration تلقائي عند النشر (هذا هو سبب أعطال 500 "relation does not exist" الشائعة في هذا المشروع تحديدًا).
- الأوقات تُخزَّن دائمًا UTC، وتُحوَّل للعرض بتوقيت `Africa/Khartoum` (UTC+2 ثابت، بلا توقيت صيفي) عبر `src/lib/prayer.ts`.
- النصوص كلها عربية داخل `src/i18n/`، لا تكتب نصوصًا مباشرة داخل Components.
