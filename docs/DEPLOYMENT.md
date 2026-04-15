# Deployment Guide — Haqak Edge Functions

This project uses email-based verification for account security and profile email confirmation.

---

## 0. CI/CD Setup (GitHub Actions)

Workflow: `.github/workflows/deploy-edge-functions.yml`

Deployed functions:
- `request-email-verification`
- `verify-email-code`

Required GitHub repository secrets:
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID`

---

## 1. Local Development

```bash
supabase link --project-ref <project-ref>
cp supabase/functions/.env.example supabase/functions/.env
supabase functions serve
```

---

## 2. Production Deployment

```bash
supabase functions deploy request-email-verification
supabase functions deploy verify-email-code
```

Set secrets:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<value>
supabase secrets set OTP_HMAC_SECRET=$(openssl rand -hex 32)
supabase secrets set TURNSTILE_SECRET_KEY=<value>
supabase secrets set RESEND_API_KEY=<value>
supabase secrets set RESEND_FROM_EMAIL="Haqak <no-reply@haqak.org>"
```

---

## 3. Environment Variables

See: `supabase/functions/.env.example`

Key categories:
- Supabase keys (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- Security (`OTP_HMAC_SECRET`, `TURNSTILE_SECRET_KEY`, `ALLOWED_ORIGINS`)
- Email (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`)

---

## 4. Troubleshooting

### 4.1 404 on verification functions

Redeploy:

```bash
supabase link --project-ref <project-ref>
supabase functions deploy request-email-verification
supabase functions deploy verify-email-code
```

### 4.2 CORS preflight fails

Set `ALLOWED_ORIGINS` to include your frontend domain.

### 4.3 Missing GitHub workflow secrets

Add `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_ID` in repo settings.

### 4.4 Email not received

- Verify `RESEND_API_KEY` and `RESEND_FROM_EMAIL`
- Check provider logs (Resend)
- Verify spam/junk folders

---

## 5. Smoke Test

```bash
PROJECT_URL="https://<PROJECT_REF>.supabase.co"

curl -s -o /dev/null -w "%{http_code}" \
  -X OPTIONS \
  -H "Origin: https://haqak.app" \
  -H "Access-Control-Request-Method: POST" \
  "${PROJECT_URL}/functions/v1/request-email-verification"

curl -s -o /dev/null -w "%{http_code}" \
  -X OPTIONS \
  -H "Origin: https://haqak.app" \
  -H "Access-Control-Request-Method: POST" \
  "${PROJECT_URL}/functions/v1/verify-email-code"
```

Expected: `200` for OPTIONS.
