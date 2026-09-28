# إقرأ | Eqraa

<div dir="rtl">

تطبيق ويب تقدمي (PWA) لختمة قرآن جماعية يومية بنظام Rotation منظم. كل عضو مسؤول عن جزء واحد يوميًا، والأجزاء تتحرك بين الأعضاء وفق معادلة ثابتة.

</div>

---

## ✨ Features | الميزات

### 📖 للمستخدم
- **Rotation تلقائي**: كل عضو يُخصص له جزء يوميًا حسب خانته في المجموعة
- **ختمة يومية**: اليوم يبدأ عند الفجر وينتهي عند الفجر التالي (توقيت الخرطوم)
- **Streak وحماية**: سلسلة الأيام المتتالية مع نظام حماية (shield) كل 15 يومًا
- **تعويض الأيام الفائتة**: نظام Make-up لقضاء الأجزاء الفائتة
- **نظام البديل**: الأدمن يعيّن بديلًا لأي عضو مشغول
- **إشعارات ذكية**: مرتبطة بمواقيت الصلاة الحقيقية (Aladhan API)
- **Offline-first**: يعمل بدون إنترنت مع مزامنة تلقائية

### 🛡️ للأدمن
- **لوحة تحكم كاملة**: إدارة المستخدمين والمجموعات والبدلاء
- **تدقيق شامل**: Audit log لكل العمليات الحساسة
- **إدارة الإشعارات**: تحكم في التذكيرات حسب الصلاة
- **تأكيد نيابي**: الأدمن يقدر يأكد قراءة نيابة عن عضو
- **نسخ احتياطي**: تصدير قاعدة البيانات كـSQL

### 🎨 تقني
- **PWA كامل**: قابل للتثبيت، يعمل offline، إشعارات فورية
- **مصادقة آمنة**: رقم هاتف + PIN مع Argon2id hashing
- **Accessibility**: دعم كامل للـRTL، screen readers، وcontrast معايير WCAG
- **94 اختبارًا**: تغطية شاملة بـVitest على PGlite (Postgres حقيقي في الذاكرة)

---

## 🚀 Quick Start

### المتطلبات
- **Node.js** 18+ و npm
- **PostgreSQL** database (نوصي بـ[Neon](https://neon.tech) للـdevelopment والإنتاج)

### التثبيت

```bash
# 1. Clone المشروع
git clone https://github.com/Scoopy-Dooo/Eqraa.git
cd Eqraa

# 2. تثبيت الـdependencies
npm install

# 3. إعداد البيئة
cp .env.example .env
# عدّل .env وضع DATABASE_URL الخاص بـNeon أو Postgres المحلي

# 4. إنشاء الجداول في قاعدة البيانات
npm run db:push

# 5. تشغيل الاختبارات للتأكد من كل شيء
npm test

# 6. تشغيل السيرفر المحلي
npm run dev
```

افتح [http://localhost:3000](http://localhost:3000) في المتصفح.

### إنشاء أول Super Admin

```bash
# 1. سجّل حسابًا عبر /register في التطبيق
# 2. شغّل الأمر التالي (استبدل الرقم برقمك)
npm run make-admin -- +249903449009
```

---

## 📁 البنية | Project Structure

```
src/
├── app/                    # Next.js App Router (الصفحات + API)
│   ├── (app)/              # صفحات المستخدم (home, khatmah, history, profile, etc.)
│   ├── admin/              # لوحة الأدمن
│   ├── api/                # جميع الـendpoints
│   └── page.tsx            # الصفحة الرئيسية (Landing)
├── components/             # React components
├── lib/                    # منطق العمل (متصل بقاعدة البيانات)
│   ├── auth-core.ts        # مصادقة (PIN hashing, phone normalization)
│   ├── reading.ts          # إدارة القراءات
│   ├── rotation.ts         # حساب الـrotation
│   ├── streak.ts           # حساب الـstreak والحمايات
│   ├── leaderboard.ts      # الترتيب والإحصائيات
│   └── ...
├── domain/                 # دوال رياضية نقية (بدون DB)
│   ├── rotation.ts         # معادلة الـrotation
│   ├── streak.ts           # منطق الـstreak
│   └── periods.ts          # حساب الفترات الزمنية
├── db/
│   ├── schema.ts           # تعريف الجداول (20 جدول)
│   └── index.ts            # Drizzle client
├── i18n/                   # كل النصوص العربية والإنجليزية
└── ...

tests/                      # 94 اختبار (Vitest + PGlite)
public/                     # Manifest + Service Worker + Icons
scripts/                    # أدوات مساعدة (make-admin, init-db, etc.)
```

---

## 🔧 الأوامر الرئيسية | Key Commands

```bash
# Development
npm run dev              # تشغيل السيرفر المحلي
npm run build            # بناء إنتاجي كامل
npm run start            # تشغيل production build

# Database
npm run db:push          # مزامنة schema مع قاعدة البيانات (يدوي دائمًا!)
npm run init-db          # تشغيل init-db.sql (لأول مرة فقط)

# Testing & Quality
npm test                 # تشغيل كل الاختبارات
npm run check            # tsc --noEmit + vitest (يجب أن ينجح قبل أي PR)

# Admin Tools
npm run make-admin -- +249XXXXXXXXX    # إعطاء صلاحية super admin
npm run gen-vapid                      # توليد مفاتيح Web Push
```

---

## 🌍 Environment Variables

أنشئ ملف `.env` في الجذر:

```bash
# إلزامي
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# للـCron Job (Rollover اليومي)
CRON_SECRET=random-long-secret-string

# للإشعارات الفورية (اختياري)
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:your-email@example.com
```

---

## 📚 التوثيق | Documentation

- **[HANDOFF.md](./HANDOFF.md)**: دليل تسليم شامل (القرارات، القيود، تشخيص الأعطال)
- **[DEPLOYMENT.md](./DEPLOYMENT.md)**: خطوات النشر التفصيلية (Vercel + Neon)
- **[LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md)**: قائمة تجربة ما قبل الإطلاق
- **[FUTURE_ENHANCEMENTS.md](./FUTURE_ENHANCEMENTS.md)**: ميزات مقترحة للمستقبل
- **[.kiro/steering/business-rules.md](./.kiro/steering/business-rules.md)**: قواعد العمل الجوهرية (لا تغيّرها!)

---

## 🏗️ Tech Stack

### Frontend
- **Next.js 15** (App Router) + **React 19**
- **TypeScript** للـtype safety
- **Tailwind CSS v4** للتصميم
- **PWA**: Service Worker يدوي + IndexedDB للـoffline

### Backend
- **Next.js API Routes** (Server Actions)
- **Drizzle ORM** للتعامل مع قاعدة البيانات
- **PostgreSQL** (Neon في الإنتاج)
- **Argon2id** لـhashing الـPINs

### Testing
- **Vitest** مع **PGlite** (Postgres حقيقي في الذاكرة)
- 94 اختبارًا تغطي كل المنطق الحساس

### Deployment
- **Vercel** للـhosting
- **Neon** للـPostgreSQL
- **Cron-job.org** للـrollover اليومي

---

## 🔐 Security

- **مصادقة آمنة**: Phone + PIN (Argon2id hashing)
- **Session Management**: 30 يوم، httpOnly cookies
- **Rate Limiting**: على Login, Register, و API endpoints الحساسة
- **CSRF Protection**: SameSite=Lax cookies + no CORS
- **Security Headers**: CSP, X-Frame-Options, HSTS (في `next.config.ts`)
- **Audit Logs**: كل عملية حساسة تُسجّل مع actor + before/after
- **Privacy**: أرقام الهواتف لا تظهر إلا لأصحابها والأدمن

---

## ♿ Accessibility

- ✅ **WCAG 2.1 AA** compliant
- ✅ **RTL** support كامل (العربية)
- ✅ **Color contrast** معايير محترمة (4.5:1+ للنصوص)
- ✅ **Touch targets** لا تقل عن 44px
- ✅ **Keyboard navigation** و focus rings
- ✅ **Skip to content** link
- ✅ **Screen reader** friendly (semantic HTML + ARIA)

---

## 🧪 Testing

```bash
# تشغيل كل الاختبارات
npm test

# تشغيل اختبار معين
npm test tests/rotation.test.ts

# تشغيل مع coverage
npm run test:coverage
```

### Test Coverage
- ✅ Rotation logic (15 tests)
- ✅ Streak calculation (9 tests)
- ✅ Reading flow (5 tests)
- ✅ Backup & Makeup (5 tests)
- ✅ Leaderboard (6 tests)
- ✅ Groups & Members (6 tests)
- ✅ Authentication (12 tests)
- ✅ Admin operations (4 tests)
- ✅ Notifications (11 tests)
- ✅ Offline queue (4 tests)
- ✅ Khatmah view (7 tests)
- ✅ History (11 tests)

**Total: 94 tests passing** ✅

---

## 🚢 Deployment

### 1. إعداد Neon Database

```bash
# 1. أنشئ حسابًا في neon.tech
# 2. أنشئ project جديد
# 3. انسخ الـCONNECTION_STRING
```

### 2. Push إلى GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 3. النشر على Vercel

1. اذهب لـ [vercel.com](https://vercel.com)
2. Import من GitHub
3. أضف Environment Variables:
   ```
   DATABASE_URL=postgresql://...
   CRON_SECRET=random-secret
   VAPID_PUBLIC_KEY=...  (اختياري)
   VAPID_PRIVATE_KEY=... (اختياري)
   VAPID_SUBJECT=mailto:... (اختياري)
   ```
4. Deploy!

### 4. إعداد Cron Job

استخدم [cron-job.org](https://cron-job.org):
- URL: `https://your-app.vercel.app/api/cron/rollover`
- Schedule: كل 5 دقائق
- Header: `Authorization: Bearer YOUR_CRON_SECRET`

راجع **[DEPLOYMENT.md](./DEPLOYMENT.md)** للتفاصيل الكاملة.

---

## 🤝 Contributing

هذا المشروع تحت التطوير النشط. نرحب بالـPull Requests!

### قبل أي PR:
1. شغّل `npm run check` (يجب أن ينجح بدون أخطاء)
2. شغّل `npm run build` (يجب أن ينجح)
3. لا تغيّر قواعد العمل في `.kiro/steering/business-rules.md` إلا بتأكيد صريح
4. اكتب اختبارات لأي دالة جديدة في `src/lib/`

### Code Style
- **العربية** في كل النصوص المعروضة للمستخدم (استخدم `src/i18n/`)
- **TypeScript** strict mode
- **Functional** style للـdomain logic (دوال نقية)
- **Server-first** للصلاحيات (لا تعتمد على إخفاء UI فقط)

---

## 📄 License

هذا المشروع مفتوح المصدر تحت رخصة MIT. راجع [LICENSE](./LICENSE) للتفاصيل.

---

## 📞 Contact & Support

- **GitHub Issues**: لأي مشاكل أو أسئلة
- **Email**: [your-email@example.com](mailto:your-email@example.com)

---

## 🙏 Acknowledgments

- **Aladhan API** لمواقيت الصلاة
- **Neon** لـpostgreSQL serverless ممتاز
- **Vercel** لـhosting سهل وسريع

---

<div dir="rtl">

## 📖 قواعد العمل الأساسية

هذا ليس تطبيق دردشة أو شبكة اجتماعية. الهدف الوحيد: **ختمة قرآن جماعية يومية منظمة وبسيطة**.

### ✅ في النطاق (MVP):
- حساب، مجموعة واحدة، rotation يومي
- قراءة، تعويض، بديل
- Streak، ترتيب، إشعارات
- لوحة أدمن كاملة
- PWA + Offline

### ❌ خارج النطاق عمدًا:
- نص القرآن داخل التطبيق (استخدم مصحفًا خارجيًا)
- دردشة أو تعليقات اجتماعية
- صور شخصية مرفوعة
- OTP عبر SMS
- تبديل لغة فعلي (English موجود جزئيًا فقط)
- مجموعات متعددة لنفس المستخدم
- دور Moderator

راجع **[FUTURE_ENHANCEMENTS.md](./FUTURE_ENHANCEMENTS.md)** لميزات مقترحة للمستقبل.

</div>

---

**بُني بـ ❤️ للمسلمين الذين يريدون ختم القرآن بشكل جماعي منظم**

