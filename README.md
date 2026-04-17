# Haqak (حقك) — منصة Civic‑Tech مصرية مستقلة (MVP)

[![Deploy to GitHub Pages](https://github.com/SynapBytes/haqak/actions/workflows/deploy.yml/badge.svg)](https://github.com/SynapBytes/haqak/actions/workflows/deploy.yml)
[![Live on haqak.org](https://img.shields.io/badge/live-haqak.org-success)](https://haqak.org)

**Haqak (حقك)** منصة Civic‑Tech مصرية بتنظم تواصل ومتابعة القضايا المحلية بين **المواطنين** و**نواب مجلس الشعب** و**الإدارة**.

> **الحالة الحالية:** MVP / Prototype (Pre‑Production) — مناسبة للتجربة والتطوير.  
> 🇪🇬 **Scope:** مصر فقط حاليًا.

---

## Production Deployment (GitHub Pages + haqak.org)

**الموقع:** https://haqak.org  
**الحالة:** ✅ Live on GitHub Pages  
**الدومين:** haqak.org (DNS موجّه لـ GitHub Pages)

### Build & Deployment Configuration

**GitHub Pages Configuration:**
- Branch: `gh-pages` (auto-generated)
- Source: GitHub Pages
- HTTPS: ✅ Enabled (Free)
- Domain: haqak.org

**Build Environment:**
- Platform: GitHub Actions
- Build command: `npm run build`
- Output directory: `dist`
- Node.js: 18+

**Auto-deployment:**
- Trigger: كل push على main branch
- Workflow: `.github/workflows/deploy.yml`
- Build time: ~2 دقايق
- Deployment time: ~1 دقيقة

### DNS Configuration (Namecheap → GitHub Pages)

**A Records (الـ root domain):**
```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

**CNAME Record (for www):**
```
www → synapbytes.github.io
```

**Verification:**
```
✅ DNS check: Successful
✅ HTTPS: Active
✅ Custom domain: haqak.org
```

### Environment Variables

**Frontend (GitHub Secrets):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_TURNSTILE_SITE_KEY`
- `VITE_VAPID_PUBLIC_KEY`
- `VITE_ENV=production`

**Backend (Supabase):**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TURNSTILE_SECRET_KEY`

**AI & Services:**
- `OPENAI_API_KEY`
- `GEMINI_API_KEY` (optional)
- `RESEND_API_KEY`
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`

### Cache & Service Worker

**Service Worker Strategy:**
- Cache-first for static assets
- Network-first for API calls
- Offline fallback to cached content
- Auto-update on new deployment

**Cache Headers (GitHub Pages):**
```
- index.html: Cache-Control: no-cache
- sw.js: Cache-Control: no-cache
- registerSW.js: Cache-Control: no-cache
- manifest.json: Cache-Control: no-cache
- Static assets: Cache-Control: max-age=31536000
```

### Automatic Sync from Upstream

**Upstream:** Axonexiis/haqak  
**Sync Schedule:** كل 6 ساعات تلقائي  
**Workflow:** `.github/workflows/sync-upstream.yml`  
**Behavior:** Fast-forward merge أو create pull request on conflict

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

- Provider: **Leaflet** with **OpenStreetMap** tiles (no API key required).
- Issue maps and location pickers use browser geolocation.
- Markers/heat overlays are rendered via Leaflet.

---

## التوثيق (Docs)

- العربي (الأساسي): [`docs/README.md`](./docs/README.md)
- English (short): [`docs/README_EN.md`](./docs/README_EN.md)
- Architecture: [`docs/architecture.md`](./docs/architecture.md)
- Roadmap: [`docs/roadmap.md`](./docs/roadmap.md)
- Deployment: [`DEPLOYMENT.md`](./DEPLOYMENT.md)
- Technical: [`TECHNICAL_IMPLEMENTATION.md`](./TECHNICAL_IMPLEMENTATION.md)
- Security: [`SECURITY.md`](./SECURITY.md)

---

## License

Not specified yet.

---

## Contact

- Official contact (partnerships & general): **team@haqak.org**
- Support (issues, help, complaints): **support@haqak.org**
- Administrative/legal: **admin@haqak.org**

---

## 💖 Support Haqak

Haqak is an independent platform. You can now contribute to its development through our [Contribution Page](/support).
