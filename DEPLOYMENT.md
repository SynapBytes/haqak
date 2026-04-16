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

The workflow `.github/workflows/deploy-edge-functions.yml` deploys these functions:
- `request-email-verification`
- `verify-email-code`

Required GitHub secrets:
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID`

---

## Manual Deployment

```bash
supabase link --project-ref <your-project-ref>
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
PROJECT_URL="https://<PROJECT_REF>.supabase.co"

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

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `404 request-email-verification not found` | Deploy functions again manually or rerun workflow |
| CORS preflight fails | Add origin to `ALLOWED_ORIGINS` secret |
| `500 Server configuration error` | Ensure required secrets are set |
| Workflow fails — missing secrets | Add `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_ID` |
