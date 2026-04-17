# Deployment Guide

> **Quick start.** For full setup details see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## TLS / Node.js Version Requirements

Haqak requires **Node.js ≥ 18.20.0** (ships with OpenSSL 3.x — not affected by Heartbleed CVE-2014-0160).

```bash
# Install and use the correct Node.js version
nvm install   # reads .nvmrc → 18.20.0
nvm use

# Verify OpenSSL version (should be 3.x)
node -e "console.log(process.versions.openssl)"
```

TLS requirements:
- **Minimum TLS version:** TLS 1.2 (TLS 1.3 preferred)
- TLS 1.0 and TLS 1.1 must not be enabled
- Do not pass `--tls-min-v1.0` to the Node.js process

For the full security hardening guide including HSTS, CORS, and the deployment checklist, see [`SECURITY_HARDENING.md`](./SECURITY_HARDENING.md).

---

## Automated Deployment (GitHub Actions)

### Frontend — Vercel

The workflow `.github/workflows/deploy-to-vercel.yml` builds the frontend and
deploys it to Vercel Production on every push to `main`.

Required GitHub secrets:

| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | Personal access token from https://vercel.com/account/tokens |
| `VERCEL_ORG_ID` | Vercel team/org ID (Vercel team **Settings → General → Team ID**) |
| `VERCEL_PROJECT_ID` | Vercel project ID (Vercel project **Settings → General → Project ID**) |

Optional build-time secrets (pass real values for a production build; the CI
workflow falls back to placeholders when these are absent):

| Secret | Description |
|--------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key |
| `VITE_VAPID_PUBLIC_KEY` | Web Push VAPID public key |

**One-time setup:**

1. Visit <https://vercel.com/account/tokens> → **Create Token**
   - Name: e.g. `haqak-deploy` · Scope: Full Account
2. Copy the token value (shown only once)
3. Retrieve your IDs:
   - `VERCEL_ORG_ID`: Vercel team **Settings → General → Team ID**
   - `VERCEL_PROJECT_ID`: Vercel project **Settings → General → Project ID**
4. In GitHub: **Settings → Secrets and variables → Actions → New repository secret** — add all three secrets
5. Push to `main` (or run the workflow manually via **Actions → Deploy to Vercel → Run workflow**)

### Edge Functions — Supabase

The workflow `.github/workflows/deploy-edge-functions.yml` deploys these functions:
- `request-email-verification`
- `verify-email-code`

Required GitHub secrets:
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID`

For this repository, `SUPABASE_PROJECT_ID` must be:
- `wfuofurgkswotwuzosdd`

---

## Manual Deployment

```bash
supabase link --project-ref wfuofurgkswotwuzosdd
supabase functions deploy request-email-verification
supabase functions deploy verify-email-code
```

---

## Required Edge Function Secrets

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<value>
supabase secrets set OTP_HMAC_SECRET=$(openssl rand -hex 32)
supabase secrets set TURNSTILE_SECRET_KEY=<value>
supabase secrets set RESEND_API_KEY=<value>
supabase secrets set RESEND_FROM_EMAIL="Haqak <no-reply@haqak.org>"
```

---

## Verify

```bash
PROJECT_URL="https://wfuofurgkswotwuzosdd.supabase.co"

curl -s -o /dev/null -w "%{http_code}" \
  -X OPTIONS \
  -H "Origin: <YOUR_ORIGIN>" \
  -H "Access-Control-Request-Method: POST" \
  "${PROJECT_URL}/functions/v1/request-email-verification"

curl -s -o /dev/null -w "%{http_code}" \
  -X OPTIONS \
  -H "Origin: <YOUR_ORIGIN>" \
  -H "Access-Control-Request-Method: POST" \
  "${PROJECT_URL}/functions/v1/verify-email-code"
```

Expected: `200` for OPTIONS.

## Post-redeploy cache checks

After env changes and redeploy, verify runtime freshness:

```bash
APP_URL="https://haqak.app"
curl -I "${APP_URL}/index.html"
curl -I "${APP_URL}/sw.js"
curl -I "${APP_URL}/registerSW.js"
```

Expected `Cache-Control: no-cache, no-store, must-revalidate` for all three.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Vercel workflow fails — missing secrets | Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` secrets (see Automated Deployment → Frontend above) |
| Website shows old content after push | Check that the `deploy-to-vercel` workflow passed in Actions; clear browser cache or open in incognito |
| Vercel build error | Review the Build step logs; ensure all `VITE_*` secrets are set |
| `404 request-email-verification not found` | Deploy functions again manually or rerun workflow |
| CORS preflight fails | Add origin to `ALLOWED_ORIGINS` secret |
| `500 Server configuration error` | Ensure required secrets are set |
| Workflow fails — missing Supabase secrets | Add `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_ID` |

## Rollback (if post-deploy checks fail)

1. Revert Vercel env variables to last known-good values.
2. Force redeploy in Vercel with build cache disabled.
3. Re-deploy edge functions for project `wfuofurgkswotwuzosdd`.
4. Re-run smoke tests and sign-in/sign-up verification before reopening traffic.
