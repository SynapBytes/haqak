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

## Production deployment (Vercel + Namecheap)

**Build settings (Vercel)**
- Framework preset: **Vite**
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: repository root
- SPA routing: handled by `vercel.json` rewrite to `/index.html`

**Required environment variables**
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `VITE_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`
- `VITE_VAPID_PUBLIC_KEY`
- Twilio (if SMS is enabled): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Optional: `VITE_ENV` (set to `production` on Vercel)

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
