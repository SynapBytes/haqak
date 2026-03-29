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
- Auth: email/password + (OTP مُعدّ)
- Database: PostgreSQL via Supabase
- RLS (Row Level Security) لحماية البيانات
- Edge Functions للعمليات الحساسة

### 4) Transparency / Accountability Concept
- Hash Chain: كل حدث مهم بيتسجل بـ SHA-256 hash مرتبط بالحدث اللي قبله
- الهدف: صعّب التلاعب + اعمل audit trail واضح

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
