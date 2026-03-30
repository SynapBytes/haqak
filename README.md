# Haqak (حقك) — منصة Civic‑Tech مصرية مستقلة (MVP)

**Haqak (حقك)** منصة Civic‑Tech مصرية بتنظم تواصل ومتابعة القضايا المحلية بين **المواطنين** و**نواب مجلس الشعب** و**الإدارة** — بشكل واضح وسهل وشفاف:  
تقديم قضية/شكوى → متابعة → مخرجات → رؤية أحسن للأولويات.

> **الحالة الحالية:** MVP / Prototype (Pre‑Production) — مناسبة للتجربة والتطوير.  
> 🇪🇬 **Scope:** مصر فقط حاليًا.

---

## Disclaimer

Haqak مشروع Civic‑Tech **مستقل** ومش تابع/مش ممثّل لأي جهة حكومية.  
المنصة بتتعامل مع "نواب مجلس الشعب" كـ **فئة مستخدمين (User Role)** داخل النظام، **من غير** أي تكامل رسمي أو شراكة حكومية في المرحلة الحالية.

---

## بيعمل إيه؟ (بالمختصر)

- **أدوار واضحة:** Citizen / MP / Admin
- **المسار الأساسي:** تقديم قضايا + متابعة الحالة + تنظيم الأولويات
- **شفافية/مساءلة:** فكرة Ledger (Hash Chain) لتوثيق الوعود/التحديثات
- **AI (اختياري):** مساعدة في صياغة مسودات وتحليلات أولية
- **خرائط وتحليلات:** GIS + Charts
- **i18n & PWA:** موجودة كبنية قابلة للتوسع

---

## Routes (Quick Map)

`/` `/auth` `/reset-password` `/citizen` `/mp` `/admin` `/mps` `/profile` `/genius` `/privacy` `/terms`

---

## Tech Stack

React + TypeScript + Vite + Tailwind + shadcn/ui  
Supabase + React Query + i18next + Leaflet + Recharts  
Vitest (ومهيأ للتوسع بـ Playwright)

---

## Quick Start

**Requirements:** Node.js >= 20

```bash
git clone https://github.com/SynapBytes/haqak.git
cd haqak
npm install
npm run dev
```

```bash
cp .env.example .env
# fill env values
```

---

## Maps & location (Leaflet)

- Provider: **Leaflet** with **OpenStreetMap** tiles (no API key required). Override the tile source with `VITE_MAP_TILE_URL` if needed while preserving attribution.
- Issue maps and location pickers use browser geolocation; if permission is denied, users can still select a point manually.
- Markers/heat overlays are rendered via Leaflet to keep the mapping layer lightweight for the MVP.

---

## Production deployment (Vercel + Namecheap)

**Build settings (Vercel)**
- Framework preset: **Vite**
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: repository root
- SPA routing: handled by `vercel.json` rewrite to `/index.html` (keeps client-side routing working on refresh/deep links)

**Environment variables**
- Frontend (Vercel project):
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - `VITE_TURNSTILE_SITE_KEY`
  - `VITE_VAPID_PUBLIC_KEY`
  - Optional: `VITE_ENV=production`
- Server / Supabase Edge Functions (Supabase project or Vercel server env):
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - `TURNSTILE_SECRET_KEY` (required in production; set `ENVIRONMENT=development` only if you intentionally allow local dev bypass)
  - Push: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, optional `VAPID_SUBJECT`
  - Optional AI: `GEMINI_API_KEY`
  - Twilio (if SMS is enabled): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
  - Optional SMS locale: `TWILIO_DEFAULT_COUNTRY_CODE` (defaults to `+20`)
  - Email (Resend): `RESEND_API_KEY`, `RESEND_FROM_EMAIL`

### Notification triggers (server-side `dispatch-notification`)
- **Issue submitted:** notifies the citizen (confirmation) and the assigned MP (if provided).
- **Issue assigned / status changed:** notifies the citizen with the latest status.
- **Admin approval/rejection:** notifies the MP applicant about the decision.
- **Moderation/chat updates:** reusable for targeted updates where `message` is provided.

**DNS (Namecheap → Vercel)**
- Apex (`haqak.org`): A record → `76.76.21.21` (Vercel)
- `www.haqak.org`: CNAME → `cname.vercel-dns.com`
- Add both domains in the Vercel project and request HTTPS; Vercel will issue certificates automatically.

**Cache / PWA**
- Service worker is configured to `skipWaiting`/`clientsClaim` and `cleanupOutdatedCaches` to avoid stale deploys.
- `vercel.json` sets `Cache-Control: no-cache` for `index.html`, `sw.js`, `registerSW.js`, and the manifest so new releases reach users immediately.

---

## التوثيق (Docs)

- العربي (الأساسي): [`docs/README.md`](./docs/README.md)
- English (short): [`docs/README_EN.md`](./docs/README_EN.md)
- Architecture: [`docs/architecture.md`](./docs/architecture.md)
- Roadmap: [`docs/roadmap.md`](./docs/roadmap.md)
- Glossary (مصري): [`docs/glossary_eg.md`](./docs/glossary_eg.md)
- Technical (موجود): [`TECHNICAL_IMPLEMENTATION.md`](./TECHNICAL_IMPLEMENTATION.md)
- Security (موجود): [`SECURITY.md`](./SECURITY.md) + [`SECURITY_AUDIT_REPORT.md`](./SECURITY_AUDIT_REPORT.md)

---

## License

Not specified yet.

---

## Contact

- Official contact (partnerships & general): **team@haqak.org**
- Support (issues, help, complaints): **support@haqak.org**
- Administrative/legal: **admin@haqak.org**
