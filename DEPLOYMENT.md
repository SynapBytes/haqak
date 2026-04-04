# Deployment Guide

> **Quick start.** For the full setup guide (Vault, CORS, phone formatting,
> troubleshooting) see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## Automated Deployment (GitHub Actions)

Every push to `main` that touches `supabase/functions/**` or the workflow
file triggers an automatic deployment of all Edge Functions.

**One-time setup — add two GitHub repository secrets:**

| Secret | Where to get it |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | https://app.supabase.com/account/tokens → Generate new token |
| `SUPABASE_PROJECT_ID` | Project reference in your Supabase dashboard URL |

1. Go to **GitHub → Settings → Secrets and variables → Actions → New
   repository secret** and add both secrets above.
2. Trigger the first deployment manually:
   **Actions → Deploy Supabase Edge Functions → Run workflow → Run workflow**

After that, every qualifying push deploys the functions automatically and
smoke-tests both `send-otp` and `verify-otp`.

---

## Manual Deployment

```bash
supabase link --project-ref <your-project-ref>
supabase functions deploy send-otp
supabase functions deploy verify-otp
```

---

## Required Edge Function Secrets

Set these once via the Supabase CLI (or Dashboard → Project Settings →
Edge Functions → Secrets):

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<value>
supabase secrets set OTP_HMAC_SECRET=$(openssl rand -hex 32)
supabase secrets set TWILIO_ACCOUNT_SID=<value>
supabase secrets set TWILIO_AUTH_TOKEN=<value>
supabase secrets set TWILIO_PHONE_NUMBER=<value>
supabase secrets set TURNSTILE_SECRET_KEY=<value>
```

See [`supabase/functions/.env.example`](supabase/functions/.env.example) for
the complete variable reference.

---

## Verify

```bash
# Replace <PROJECT_REF> with your Supabase project reference
# Replace <YOUR_ORIGIN> with your frontend domain (e.g. https://haqak.app)
curl -s -o /dev/null -w "%{http_code}" \
  -X OPTIONS \
  -H "Origin: <YOUR_ORIGIN>" \
  -H "Access-Control-Request-Method: POST" \
  "https://<PROJECT_REF>.supabase.co/functions/v1/send-otp"
# Expected: 200 (not 404)
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `404 send-otp not found` | Functions not deployed — run the workflow manually (see above) |
| CORS preflight fails | Add your origin to `ALLOWED_ORIGINS` secret; see [`docs/DEPLOYMENT.md §7.2`](docs/DEPLOYMENT.md#72-cors-preflight-fails-status-400--403) |
| Rate limit errors | Each phone is limited to 5 OTPs per 10 minutes |
| `500 Server configuration error` | Check that all required secrets are set (see table above) |
| Workflow fails — "Missing required GitHub secret(s)" | Add `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_ID` to GitHub repository secrets |
