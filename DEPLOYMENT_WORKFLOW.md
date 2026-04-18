# Deployment Workflow — Haqak

This document explains how the automated GitHub Pages deployment workflow works, how to configure it, and how to troubleshoot common issues.

---

## How the Workflow Works

File: `.github/workflows/deploy.yml`

### Trigger

The workflow runs automatically on every `push` to the `main` branch, and can also be triggered manually via **Actions → Build and Deploy to GitHub Pages → Run workflow**.

### Steps

| # | Step | Description |
|---|------|-------------|
| 1 | **Checkout** | Fetches the latest commit from `main`. |
| 2 | **Set up Node.js** | Installs Node.js (read from `.nvmrc`) with npm dependency caching enabled. |
| 3 | **Install dependencies** | Runs `npm ci` for a clean, reproducible install. |
| 4 | **Lint** | Runs `npm run lint` (non-blocking). |
| 5 | **Build** | Runs `npm run build` (Vite). `VITE_*` secrets are injected as environment variables. |
| 6 | **Setup Pages** | Configures the GitHub Pages environment. |
| 7 | **Upload artifact** | Uploads the `dist/` directory as a GitHub Pages artifact. |
| 8 | **Deploy** | Deploys the artifact to GitHub Pages (main branch pushes only). |
| 9 | **Verify** | Runs a lightweight health check against `https://haqak.org/`. |

---

## Required GitHub Secrets

Add these in: **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Required | Description |
|--------|----------|-------------|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anon/publishable key |
| `VITE_TURNSTILE_SITE_KEY` | Optional | Cloudflare Turnstile site key |
| `VITE_VAPID_PUBLIC_KEY` | Optional | Web Push VAPID public key |

---

## One-Time Setup

1. **Enable GitHub Pages**
   - Go to **Settings → Pages**
   - Source: **GitHub Actions**
   - Save

2. **Set Custom Domain**
   - Go to **Settings → Pages → Custom domain**
   - Enter: `haqak.org`
   - Click **Save** and wait for DNS verification

3. **Configure DNS (Namecheap)**
   - Add 4 A records pointing `@` to GitHub Pages IPs:
     ```
     185.199.108.153
     185.199.109.153
     185.199.110.153
     185.199.111.153
     ```
   - Add CNAME record: `www → synapbytes.github.io`

4. **Add GitHub Secrets**
   - Repository → **Settings → Secrets and variables → Actions → New repository secret**
   - Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and optionally `VITE_TURNSTILE_SITE_KEY`, `VITE_VAPID_PUBLIC_KEY`

5. **Trigger the first deploy**
   - Push any commit to `main`, or go to **Actions → Build and Deploy to GitHub Pages → Run workflow**

---

## Manual Re-run

To manually trigger or re-run a deployment:

1. Go to the repository **Actions** tab
2. Select **Build and Deploy to GitHub Pages** from the left sidebar
3. Click **Run workflow** → select `main` → click **Run workflow**

Or re-run a failed run by opening the failed run and clicking **Re-run all jobs**.

---

## Monitoring Deployments

- **GitHub Actions:** https://github.com/SynapBytes/haqak/actions/workflows/deploy.yml
- **GitHub Pages status:** **Settings → Pages** — shows deployment history and domain status
- **README badge:** The `[![Deploy to GitHub Pages](...)]` badge at the top of `README.md` reflects the latest workflow status

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Workflow fails — build error | Missing `VITE_*` secrets or code error | Check the **Build** step logs; set the required `VITE_*` secrets |
| Site shows 404 | DNS not propagated or custom domain not set | Verify DNS records; check **Settings → Pages** |
| Stale content after deploy | Service worker caching old version | Open DevTools → Application → Service Workers → Unregister → Hard refresh |
| HTTPS not active | DNS propagation still pending | Wait up to 24 hours; re-check **Settings → Pages** |
| Workflow skips deploy step | Push was to a non-main branch | Deploy step only runs on `push` to `main` |

---

## Security Notes

- `VITE_*` secrets are **build-time only** — they are baked into the static JS bundle; never put server-side secrets here.
- Server-side secrets (`SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`, etc.) are set only in **Supabase Edge Function secrets**, never in the frontend build.
- The `GITHUB_TOKEN` used by the workflow has the minimum required permissions (`contents: read`, `pages: write`, `id-token: write`).
