# Haqak (حقك) — التوثيق الأساسي (مصري / Arabic‑first)

## Disclaimer

Haqak مشروع Civic‑Tech **مستقل** ومش تابع/مش ممثّل لأي جهة حكومية.  
المنصة بتتعامل مع "نواب مجلس الشعب" كـ **فئة مستخدمين (User Role)** داخل النظام، **من غير** أي تكامل رسمي أو شراكة حكومية في المرحلة الحالية.

---

## 1) المشروع ده إيه؟

Haqak منصة Civic‑Tech لمصر (حاليًا بس)، هدفها تخلي القضايا المحلية:
- تتسجل بشكل منظم
- تتتابع بوضوح
- يبقى ليها تاريخ تغييرات
- وتطلع بمخرجات مفهومة بدل ما تفضل "مراسلات" ضايعة

> **الحالة:** MVP / Prototype (Pre‑Production) — شغال كتجربة قوية وقابل للتطوير.

---

## 2) المشكلة اللي بنحاول نحلها

القضايا بتتوه غالبًا بسبب:
- قنوات كتير ومتفرقة
- مفيش نظام متابعة ثابت
- "مين مسؤول؟ ومتى اتعمل إيه؟" مش واضح
- بيانات كتير… بس من غير تلخيص وتحليلات تساعد

Haqak بيحاول يجمع ده في مسار واحد.

---

## 3) الأدوار (Roles) — ببساطة

### Citizen | مواطن
- يقدم شكوى/طلب
- يتابع الحالة
- يشارك في استطلاعات الأولويات (لو متفعّلة)

### MP | نائب
- يستقبل القضايا
- ينظمها ويرتبها
- يطلع مخرجات (رد/طلب/تعهد) حسب سياسات المنصة
- ممكن يحتاج **اعتماد** للحساب قبل ما يفتح له كل الصلاحيات

### Admin | إدارة
- إشراف وحوكمة
- إدارة مستخدمين وسياسات

---

## 4) الصفحات (Routes)

راجع [`README.md`](../README.md) للـ Quick Map.

---

## 5) الميزات (Features) — تنظيم واقعي

> في حاجات ممكن تكون "واجهة/نموذج" وتحتاج ربط إنتاجي حسب خطة التطوير.

- Core workflow للقضايا والمتابعة
- خرائط + رسوم (Leaflet/Recharts)
- i18n جاهزة للتوسع
- PWA readiness
- AI drafting (اختياري حسب الإعدادات)
- Ledger concept للشفافية (Hash Chain)

---

## 6) تشغيل المشروع

### المتطلبات
- Node.js >= 20

### تشغيل
```bash
npm install
npm run dev
```

### إعداد البيئة
```bash
cp .env.example .env
# fill env values
```

---

## 7) اقرأ كمان

- [`docs/architecture.md`](./architecture.md)
- [`docs/roadmap.md`](./roadmap.md)
- [`docs/glossary_eg.md`](./glossary_eg.md)
- [`TECHNICAL_IMPLEMENTATION.md`](../TECHNICAL_IMPLEMENTATION.md)
- [`SECURITY.md`](../SECURITY.md)

---

## التواصل

- التواصل الرسمي (الشراكات والأسئلة العامة): **team@haqak.org**
- الدعم الفني والشكاوى: **support@haqak.org**
- الإدارة والأمور التقنية والقانونية: **admin@haqak.org**


## Sprint 3–5: MP Engagement (Center-scoped, Verified-only)

### Polls (Yes/No)
- New tables: `polls`, `poll_votes` with `UNIQUE(poll_id, voter_user_id)` to prevent double-voting.
- Verified-only rules: only verified MPs can create/manage polls; only verified citizens can vote.
- Privacy rules: citizens can only read their own vote rows; MPs do not get row-level vote access.
- Secure aggregates: `poll_results` view exposes counts/percentages only (no voter identities).

### Announcements / Events
- New table: `announcements` for event/conference/opening/general content scoped by `center_id`.
- Verified-only rules: only verified MPs can create/update/publish for their own center.
- Citizens can read published center announcements only.

### MP → Admin re-nomination
- New table: `mp_admin_requests` with pending/approved/rejected decisions and actor metadata.
- Verified MP can submit own requests only; admin can review and decide all requests.
- Approval broadcast uses unified notification pipeline to verified citizens in target center.
- Submission email fallback queue: `outbound_email_tasks` (admin@haqak.org).

### Security & audit
- Strict RLS policies added on all new tables.
- Audit hooks record creation/updates/publication/decision actions in `audit_logs`.
- Notification edge function now supports center+role targeting for verified-only MP center broadcasts (`verified_only`).

## Sprint 8: Community Projects / Donations / Refunds (strict privacy + verified-only)

- New workflow tables: `community_projects`, `project_founders`, `project_donations`, `project_refund_requests`, `project_refund_batches`, `project_mp_nominations`, `project_mp_nomination_approvals`.
- VERIFIED-only enforcement:
  - Only verified citizens can create projects, join founders, approve founder actions, donate/pledge, and request refunds.
  - Only verified MPs can accept/reject receiving funds.
  - MP transfer acceptance/admin approval path requires an admin-verified bank account snapshot.
- Center scoping enforcement:
  - `community_projects.center_id` must equal creator `profiles.center_id`.
  - Founders and nominated MPs must belong to the same center as the project.
- Privacy hard line:
  - Founder/donor identities are not publicly exposed.
  - MPs have no direct read policy on `project_donations` and `project_founders`.
  - Anonymous aggregates only through `community_project_public_stats` / `get_project_public_aggregate`.
- Refund rule:
  - Cancellation triggers when refund requests reach `>=51%` of distinct donors.
  - On trigger: project status is cancelled, notifications sent to donors + founders, and manual admin refund batch is created.
  - Refund fee is configurable via `project_system_settings` (`refund_fee_percent`).
- Instapay SOON mode:
  - Donation pledges are created with `reference_code` and `payment_status = 'payment_soon'`.
  - No bank/payment instructions are exposed in UI.
- Transfer workflow:
  - Founder nomination requires 3/5 approvals.
  - MP acceptance requires legal acknowledgment + timestamp.
  - Admin approval captures `bank_snapshot`; transfer completion requires receipt upload in private bucket `project-transfer-receipts`.
