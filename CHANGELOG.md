# Changelog | سجل التغييرات

كل التغييرات المهمة في هذا المشروع سيتم توثيقها في هذا الملف.

التنسيق مبني على [Keep a Changelog](https://keepachangelog.com/ar/1.0.0/)،
وهذا المشروع يتبع [Semantic Versioning](https://semver.org/lang/ar/).

---

## [1.0.0] - 2026-09-28

### 🎉 الإصدار الأول (MVP Complete)

هذا هو الإصدار الأول الكامل من Eqraa، يحتوي على كل الميزات الأساسية للـMVP.

### ✨ Added | الميزات الجديدة

#### للمستخدم
- **مصادقة آمنة**: تسجيل دخول برقم هاتف + PIN (6 أرقام)
- **المجموعات**: انضمام لمجموعة واحدة (حتى 30 عضو)
- **Rotation يومي**: نظام توزيع الأجزاء تلقائيًا
- **قراءة**: بدء/إنهاء/تراجع عن القراءة
- **Streak**: سلسلة الأيام المتتالية مع نظام حماية (15 يوم = shield)
- **تعويض**: قضاء الأجزاء الفائتة (Make-up)
- **نظام البديل**: إمكانية تعيين بديل لأي عضو
- **الترتيب**: Leaderboard أسبوعي/شهري/كلي
- **صفحة الختمة** (`/khatmah`): عرض حالة اليوم الحالي وكل الأجزاء
- **صفحة السجل** (`/history`): عرض الأيام السابقة والأجزاء الفائتة
- **صفحة الملف الشخصي** (`/profile`): 
  - عرض المعلومات الشخصية والإحصائيات
  - تعديل الاسم والجنس والأفاتار
  - تغيير رقم الهاتف
  - تغيير رمز PIN
- **إشعارات**: 
  - إشعارات in-app
  - Web Push notifications
  - مرتبطة بمواقيت الصلاة الحقيقية (Aladhan API)
  - قابلة للتخصيص حسب الصلاة

#### للأدمن
- **لوحة تحكم كاملة** (`/admin`):
  - إدارة المستخدمين
  - إدارة المجموعات والأعضاء
  - إدارة البدلاء
  - عرض سجل الأيام
  - سجل التدقيق (Audit Log)
  - إدارة المشرفين (Super Admin فقط)
  - إعدادات الإشعارات
- **تأكيد نيابي**: تأكيد قراءة نيابة عن عضو
- **إرسال إشعارات**: broadcast لكل أعضاء المجموعة
- **نسخ احتياطي**: تصدير قاعدة البيانات كـSQL

#### PWA & Offline
- **PWA كامل**: 
  - قابل للتثبيت على الجوال والكمبيوتر
  - Manifest + Icons
  - Service Worker للـcaching
- **Offline-first**:
  - يعمل بدون إنترنت
  - قراءة offline تُحفظ في IndexedDB
  - مزامنة تلقائية عند العودة online
  - عرض حالة المزامنة في UI

#### تقني
- **Next.js 15** App Router + React 19
- **TypeScript** strict mode
- **Tailwind CSS v4**
- **Drizzle ORM** + PostgreSQL
- **Argon2id** لـhashing الـPINs
- **94 اختبارًا** (Vitest + PGlite)
- **Accessibility**: WCAG 2.1 AA compliant
- **Security**: 
  - Rate limiting
  - CSRF protection
  - Security headers (CSP, HSTS, etc.)
  - Audit logs
- **صفحة رئيسية** (Landing Page) احترافية

### 📊 Statistics | الإحصائيات
- **20 جدول** في قاعدة البيانات
- **40+ صفحة** و API endpoint
- **94 اختبار** تغطي كل المنطق الحساس
- **100% TypeScript** coverage
- **RTL support** كامل

### 🔧 Technical Details

#### Database Schema
- `users` - المستخدمون
- `sessions` - الجلسات
- `admin_roles` - أدوار المشرفين
- `groups` - المجموعات
- `group_members` - أعضاء المجموعات
- `khatmah_days` - أيام الختمة
- `part_assignments` - تخصيص الأجزاء
- `reading_sessions` - سجل القراءات
- `backup_assignments` - تعيين البدلاء
- `streaks` - السلاسل والحمايات
- `notifications` - الإشعارات
- `notification_preferences` - تفضيلات الإشعارات
- `push_subscriptions` - اشتراكات Web Push
- `prayer_times` - مواقيت الصلاة (cache)
- `audit_logs` - سجل التدقيق
- `rate_limits` - حدود الطلبات (in-memory حاليًا)

#### API Endpoints
- `/api/auth/*` - المصادقة
- `/api/reading/*` - القراءة
- `/api/makeup` - التعويض
- `/api/leaderboard` - الترتيب
- `/api/notifications/*` - الإشعارات
- `/api/push/*` - Web Push
- `/api/admin/*` - عمليات الأدمن
- `/api/cron/rollover` - الـrollover اليومي
- `/api/profile` - تعديل الملف الشخصي
- `/api/profile/phone` - تغيير رقم الهاتف
- `/api/profile/pin` - تغيير رمز PIN

### 📚 Documentation
- `README.md` - دليل الاستخدام الكامل
- `HANDOFF.md` - دليل التسليم الشامل
- `DEPLOYMENT.md` - دليل النشر
- `LAUNCH_CHECKLIST.md` - قائمة ما قبل الإطلاق
- `FUTURE_ENHANCEMENTS.md` - الميزات المستقبلية
- `.kiro/steering/business-rules.md` - قواعد العمل الجوهرية
- `.kiro/steering/tech.md` - القواعد التقنية
- `.kiro/steering/structure.md` - بنية المشروع
- `.kiro/steering/product.md` - نطاق المنتج

### 🐛 Known Issues | المشاكل المعروفة
- الـoffline mode يعرض آخر صفحة محمّلة، وليس snapshot كامل للبيانات
- إذا كان الجوال offline عبر حدّ الفجر، الصفحة لن تعكس اليوم الجديد حتى تعود online

### 🔐 Security Notes
- Session duration: 30 يومًا
- Rate limiting على كل الـendpoints الحساسة
- PIN يجب أن يكون 6 أرقام غير متكررة أو متسلسلة
- أرقام الهواتف لا تظهر إلا لأصحابها والأدمن

---

## [Unreleased] - المستقبل

### 🚀 Planned | مخطط لها
راجع [FUTURE_ENHANCEMENTS.md](./FUTURE_ENHANCEMENTS.md) للقائمة الكاملة:

- Biometric Authentication (البصمة / Face ID)
- Session duration options
- مجموعات متعددة لنفس المستخدم
- تعليقات بسيطة على القراءات
- إحصائيات المجموعة
- تصدير البيانات الشخصية
- اللغة الإنجليزية الكاملة
- تحسينات UI/UX
- Redis caching (للتوسع)
- Monitoring & logging (Sentry, Analytics)

---

## Versioning Guide | دليل الإصدارات

نتبع [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): تغييرات غير متوافقة في الـAPI
- **MINOR** (1.X.0): ميزات جديدة متوافقة
- **PATCH** (1.0.X): إصلاحات bugs فقط

### مثال:
- `1.0.0` → `1.1.0`: إضافة Biometric Auth
- `1.1.0` → `1.1.1`: إصلاح bug في الـoffline sync
- `1.0.0` → `2.0.0`: تغيير schema يتطلب migration كبير

---

**ملاحظة**: هذا المشروع لا يزال في مرحلة التطوير النشط. التواريخ والإصدارات قد تتغير.
