# Architecture — البنية التقنية (High‑level)

## الفكرة المعمارية ببساطة

المشروع frontend‑first مبني على:
- **React + TypeScript + Vite** كـ framework وbuild tool
- **Routes منفصلة** حسب الدور (Citizen / MP / Admin)
- **React Query** لإدارة البيانات (fetch/cache/sync)
- **UI system** مبني على shadcn/ui + Tailwind
- **Supabase** كـ backend-as-a-service (Auth + Database)

---

## Flow (Conceptual)

```
Citizen
  │
  ├─► يقدم قضية/شكوى
  │       │
  │       ▼
  │   Issue Created (Supabase DB)
  │       │
  │       ▼
  │   MP/Admin يستقبل ويراجع
  │       │
  │       ├─► يصنّف + يحدد أولوية
  │       ├─► يطلع رد/تحديث
  │       └─► Accountability Event يتسجل (Hash Chain concept)
  │
  └─► Citizen يتابع الحالة + يشوف التحديثات
```

---

## طبقات النظام

### 1) Presentation Layer
- React components (src/components/)
- Pages حسب الدور (src/pages/)
- i18n: عربي (أساسي) + إنجليزي

### 2) State & Data Layer
- React Query لـ server state
- Supabase client لـ realtime + auth
- Local state حسب الحاجة (useState/Context)

### 3) Backend Layer (Supabase)
- Auth: email/password
- Database: PostgreSQL via Supabase
- RLS (Row Level Security) لحماية البيانات
- Edge Functions للعمليات الحساسة

### 4) Transparency / Accountability Concept
- Hash Chain: كل حدث مهم بيتسجل بـ SHA-256 hash مرتبط بالحدث اللي قبله
- الهدف: صعّب التلاعب + اعمل audit trail واضح
- Audit Trail: جدول `audit_logs` ملزم بـ append-only، يلتقط تغييرات الأدوار، حالات الموافقة، تغييرات حالة الشكوى، وإجراءات الإشراف على التعليقات. الكتابة تتم عبر service role أو triggers `SECURITY DEFINER` فقط، والقراءة محصورة في المدراء والمشرفين.
- Issue status history remains in `issue_status_history` for fine-grained tracking tied إلى كل شكوى.

### 5) Optional / Feature-gated
- AI Drafting (يتفعل حسب env/config)
- Maps (Leaflet)
- Charts (Recharts)
- PWA readiness

---

## ملاحظات مهمة

- المشروع في مرحلة **MVP / Prototype** — جزء من الميزات ممكن يكون واجهة/نموذج وينتظر ربط إنتاجي.
- Supabase schema + RLS policies هيتضبطوا حسب مرحلة التطوير.
- راجع [`TECHNICAL_IMPLEMENTATION.md`](../TECHNICAL_IMPLEMENTATION.md) للتفاصيل التقنية الكاملة.

## Supabase auth & roles (production defaults)

- **Roles:** `citizen` (default), `mp` (approved only), `moderator` (read-only oversight), `admin` (full control). كل مستخدم بيُنشأ بـ `citizen` فقط، وأي دور إضافي لازم يتعيّن بواسطة admin.
- **Linking:** `auth.users.id` مرتبط بـ `profiles.user_id` (unique) ويمتلك صفوف في `user_roles`.
- **RLS:** مفعل على كل الجداول الحساسة (`profiles`, `user_roles`, `issues`, `issue_actions`, `issue_attachments`, `notifications`, `chat_*`, `submission_attempts`, `audit_logs`, `rate_limit_logs`, `captcha_verifications`, `storage.objects` for `issue-attachments`). السياسات مكتوبة بمبدأ أقل صلاحية.
- **Helpers:** دوال `has_role`, `has_any_role`, `is_active_mp`, `is_admin` بتُستخدم داخل السياسات لتحديد السماح.
- **Storage:** مرفقات المشاكل private، والقراءة مقصورة على صاحب الملف، النائب المعيّن، المشرف، أو admin.
- **Identity storage:** bucket `id_verifications` خاص ومغلق بالكامل (not public) لصور البطاقة الأمامي/الخلفي، والقراءة لصاحب الطلب أو admin فقط عبر signed URLs. bucket `receipts` خاص برضه ومقفول للاستخدامات المالية اللاحقة.
- **Service role only:** الكتابة لـ `audit_logs`, `submission_attempts`, `rate_limit_logs`, `captcha_verifications` لازم تكون من backend مفعل بمفتاح الخدمة (edge functions أو server). 

## Verification policy (Sprint 2)

- المواطن/النائب يرفع صورة البطاقة الأمامي والخلفي من صفحة الإعدادات.
- الطلب يُحفظ في `identity_verifications` بحالة `pending`.
- Edge Function `verify-identity-ocr` تشغل OCR provider لو متاح، ولو مش متاح النظام يدخل Manual Review آمن بدون نشر بيانات OCR الحساسة في logs.
- الإدارة تراجع الطلب من لوحة admin، وتعرض الصور عبر signed URLs قصيرة العمر، ثم تعتمد أو ترفض مع سبب رفض اختياري.
- قرار الإدارة يحدّث حالة التحقق على الطلب وعلى ملف المستخدم (`verification_status`).

## Unified notification channels (Sprint 2)

- الإرسال الموحّد يتم عبر Edge Function `dispatch-notification`.
- **In-app** دائمًا يتسجل في `notifications` + `notification_deliveries` (channel=inapp).
- **Email** يُرسل فقط إذا `email_verified=true` + `email_opt_in=true`.
- المستهدفات تشمل: user_ids مباشرة، role، center_id، أو all users (للـ admin فقط).
- كل عملية dispatch تُسجل في `audit_logs` مع actor + target scope + counts.
