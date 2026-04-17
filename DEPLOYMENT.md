# Deployment Guide - GitHub Pages

## Overview

Haqak is deployed to **GitHub Pages** using **GitHub Actions** for automatic builds and deployments.

- **URL:** https://haqak.org
- **Custom Domain:** Yes (haqak.org via Namecheap)
- **HTTPS:** Automatic (Let's Encrypt)
- **Auto-deploy:** On every push to `main` branch

---

## Automatic Deployment Workflow

### GitHub Actions Workflow: `deploy.yml`

File: `.github/workflows/deploy.yml`

Triggers:
- Push to `main` branch
- Manual workflow dispatch

Steps:
1. Checkout code
2. Setup Node.js 18
3. Install dependencies (`npm ci`)
4. Lint code
5. Build project (`npm run build`)
6. Upload artifact to GitHub Pages
7. Deploy to GitHub Pages
8. Verify deployment

### Upstream Sync Workflow: `sync-upstream.yml`

File: `.github/workflows/sync-upstream.yml`

Schedule: Every 6 hours (cron: `0 */6 * * *`)

Behavior:
- Fetch latest from Axonexiis/haqak
- Merge changes to main branch
- Create pull request if conflicts

---

## Local Development

### Prerequisites

- Node.js >= 20
- npm or yarn

### Setup

```bash
git clone https://github.com/SynapBytes/haqak.git
cd haqak

# Copy environment file
cp .env.example .env

# Install dependencies
npm install

# Start dev server
npm run dev
```

### Build

```bash
npm run build
```

Output: `dist/` directory

---

## DNS Configuration

### Domain: haqak.org

Registered at: **Namecheap**

#### A Records (for root domain @)

Point to GitHub Pages servers:
```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

#### CNAME Record (for www subdomain)

```
www → synapbytes.github.io
```

#### Verification

```bash
# Check A records
nslookup haqak.org

# Check CNAME
nslookup www.haqak.org
```

Expected:
```
haqak.org: 185.199.xxx.xxx
www.haqak.org: synapbytes.github.io
```

---

## GitHub Repository Settings

### Pages Configuration

1. Go to: **Settings → Pages**
2. **Source:** Deploy from a branch
3. **Branch:** `main`
4. **Folder:** `/ (root)`
5. Click **Save**

### Custom Domain

1. Go to: **Settings → Pages → Custom domain**
2. Enter: `haqak.org`
3. Click **Save**
4. GitHub will check DNS and enable HTTPS automatically

### Branch Protection

1. Go to: **Settings → Branches → Add rule**
2. **Branch name pattern:** `main`
3. **Require a pull request before merging:** ✓
4. **Require status checks to pass:** ✓
5. **Require branches to be up to date:** ✓
6. Click **Create**

---

## Environment Variables

### GitHub Secrets (for Actions)

Add these in: **Settings → Secrets and variables → Actions**

```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_TURNSTILE_SITE_KEY
VITE_VAPID_PUBLIC_KEY
```

### .env.example Template

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...

# Cloudflare Turnstile
VITE_TURNSTILE_SITE_KEY=1x...

# Web Push
VITE_VAPID_PUBLIC_KEY=BC...
```

---

## Edge Functions — Supabase

The workflow `.github/workflows/deploy-edge-functions.yml` deploys these functions:
- `request-email-verification`
- `verify-email-code`

Required GitHub secrets:
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID`

### Manual Deployment

```bash
supabase link --project-ref wfuofurgkswotwuzosdd
supabase functions deploy request-email-verification
supabase functions deploy verify-email-code
```

### Required Edge Function Secrets

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<value>
supabase secrets set OTP_HMAC_SECRET=$(openssl rand -hex 32)
supabase secrets set TURNSTILE_SECRET_KEY=<value>
supabase secrets set RESEND_API_KEY=<value>
supabase secrets set RESEND_FROM_EMAIL="Haqak <no-reply@haqak.org>"
```

---

## Monitoring & Logs

### GitHub Actions

1. Go to: **Actions tab**
2. View workflow runs
3. Click on failed run to see logs

### GitHub Pages Deployment Logs

1. Go to: **Settings → Pages**
2. Check **Deployments** section
3. Click on deployment to see details

### Live Status

Check: https://haqak.org

### Post-deploy cache checks

After env changes and redeploy, verify runtime freshness:

```bash
APP_URL="https://haqak.org"
curl -I "${APP_URL}/index.html"
curl -I "${APP_URL}/sw.js"
curl -I "${APP_URL}/registerSW.js"
```

Expected `Cache-Control: no-cache` for all three.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Build fails in GitHub Actions | Check **Actions** tab logs; ensure all `VITE_*` secrets are set |
| Website shows old content after push | Check that the `deploy` workflow passed in Actions; clear browser cache or open in incognito |
| `404 request-email-verification not found` | Deploy functions again manually or rerun workflow |
| CORS preflight fails | Add origin to `ALLOWED_ORIGINS` secret |
| `500 Server configuration error` | Ensure required secrets are set |
| Workflow fails — missing Supabase secrets | Add `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_ID` |

### Build Fails

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### DNS Not Resolving

```bash
# Flush DNS cache (macOS)
sudo dscacheutil -flushcache

# Wait 15-30 minutes for DNS propagation
```

### Site Shows 404

- Check custom domain is set in GitHub Pages
- Verify DNS records are correct
- Clear browser cache
- Wait for HTTPS certificate generation (can take 24 hours)

### Stale Content

Service worker cache might be old:
- Open DevTools → Application → Service Workers
- Click "Unregister"
- Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)

---

## Auto-Sync from Upstream

### Configuration

Upstream: `https://github.com/Axonexiis/haqak.git`  
Schedule: Every 6 hours  
Method: Auto-merge or create pull request

### Manual Sync

```bash
git remote add upstream https://github.com/Axonexiis/haqak.git
git fetch upstream main
git merge upstream/main
git push origin main
```

---

## Rollback

If a deployment breaks:

```bash
# View deployment history
git log --oneline

# Revert to previous commit
git revert <commit-hash>
git push origin main

# GitHub Pages will auto-redeploy
```

---

## Performance

### Build Times

Typical: 1-2 minutes

### Deployment Time

Typical: 30-60 seconds

### Site Performance

- Lighthouse Score: 90+
- First Contentful Paint: < 1s
- Time to Interactive: < 2s

Monitor at: https://haqak.org/

---

## Support

For deployment issues, see:
- [SECURITY.md](./SECURITY.md)
- [TECHNICAL_IMPLEMENTATION.md](./TECHNICAL_IMPLEMENTATION.md)
- GitHub Actions Logs
