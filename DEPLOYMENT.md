# Deployment Guide

> **Quick start.** For full setup details see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

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
