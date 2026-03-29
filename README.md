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