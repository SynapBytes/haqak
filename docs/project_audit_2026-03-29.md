# تقرير فحص مشروع «حقك» – 29 مارس 2026

## موجز تنفيذي
- ✅ **اختبارات الوحدة:** `npm test` تمر بالكامل.
- ⚠️ **فحص ESLint:** يفشل بـ 57 خطأ و21 تحذير، أبرزها كسر لقواعد React Hooks، استخدامات `any` واسعة، و`require` محظور في ملف الإعدادات.
- 🔍 **أعطال محتملة وقت التشغيل:** مذكورة بالتفصيل أدناه مع توصيات إصلاح سريعة.

## ما تم تشغيله
- `npm test`
- `npm run lint`

## أبرز الأعطال والمخاطر
1. **خرق قاعدة React Hooks (خطأ وقت تشغيل محتمل)**  
   - المسار: `src/pages/MPProfilePage.tsx`  
   - المشكلة: استدعاء `useTheme` يأتي بعد مسارات `return` للتحميل/عدم العثور، ما يغيّر ترتيب الـ Hooks وقد ينتج عنه خطأ React runtime عند تبدّل حالة المكوّن.  
   - التوصية: نقل `useTheme` (وأي Hooks أخرى) إلى أعلى المكوّن قبل أي `return` مبكر.

2. **استخدامات `any` واسعة تفشل الفحص وتضعف الأمان النوعي**  
   - ملفات بارزة: `AnalyticsDashboard.tsx`, `ChatDrawer.tsx`, `DigitalTwinIntegration.tsx`, `MPDashboard.tsx`, `CitizenDashboard.tsx`, `Auth.tsx`, `supabase/functions/shared/rate-limiter.ts` وغيرها.  
   - التأثير: فقدان فحص الأنواع للبيانات القادمة من Supabase ولوحات التحكم؛ قد تخفي تحوّلات بيانات خاطئة أو قيم `null/undefined`.  
   - التوصية: تعريف واجهات للبيانات (Issues, Projects, Notifications, RateLimitEvent) واستبدال `any` بأنواع دقيقة.

3. **`require` في بيئة ESM داخل إعدادات Tailwind**  
   - المسار: `tailwind.config.ts`  
   - المشكلة: ESLint يحظر `require` مع TypeScript/ESM، ما يبقي فحص lint فاشلاً.  
   - التوصية: استبدال السطر `plugins: [require("tailwindcss-animate")]` باستيراد علوي `import tailwindcssAnimate from "tailwindcss-animate";` ثم استخدامه داخل المصفوفة.

4. **تبعيات مفقودة في `useEffect`**  
   - أمثلة: `AdminAuditDashboard.tsx`, `NotificationBell.tsx`, `ProjectCrowdfunding.tsx`, `ProjectVotingSystem.tsx`, `CitizenDashboard.tsx`, `Auth.tsx` وغيرها.  
   - التأثير: قد تُستخدم دوال أو معايير قديمة عند الجلب أو التحديث مما يسبب بيانات متقادمة.  
   - التوصية: إضافة الدوال/المتغيرات إلى مصفوفات التبعيات أو تغليفها بـ`useCallback`.

5. **تحذيرات React Refresh**  
   - عدة ملفات UI (مثل `components/ui/button.tsx`, `.../badge.tsx`, `contexts/AuthContext.tsx`) تصدّر ثوابت/دوال مع المكوّنات، ما يعطل Fast Refresh أثناء التطوير.  
   - التوصية: فصل الثوابت أو تجاهل التحذير إن كان السلوك مقبولاً، لكن ترتيب التصدير يُحسِّن تجربة التطوير.

## توصيات قصيرة المدى (قابلة للتنفيذ بالترتيب)
- [ ] إصلاح ترتيب Hooks في `MPProfilePage.tsx` لمنع خطأ React محتمل.
- [ ] تحويل `require` في `tailwind.config.ts` إلى `import` لضمان مرور فحص lint.
- [ ] توحيد أنواع البيانات الأساسية (Issues/Projects/Notifications/RateLimiter) وإزالة `any`.
- [ ] ضبط تبعيات `useEffect` في المكوّنات المذكورة لتفادي بيانات قديمة.
- [ ] إعادة تشغيل `npm run lint` للتأكد من صفر أخطاء قبل الدمج.

## ملاحظات إضافية
- إعادة التسمية إلى «حقك» مطبّقة في ملفات الواجهة (`index.html`, `README.md`) ولم يُرصد أي بقايا للاسم القديم.
- لم تظهر ثغرات أمنية مباشرة أثناء الفحص السريع، لكن غياب الأنواع الدقيقة في الطبقة البيانية قد يخفي أعطال أو حالات حافة من Supabase.
