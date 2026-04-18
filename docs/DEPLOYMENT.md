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

For this repository, set:
- `SUPABASE_PROJECT_ID=wfuofurgkswotwuzosdd`

---

## 1. Local Development

```bash
supabase link --project-ref wfuofurgkswotwuzosdd
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
supabase secrets set EMAIL_CODE_HMAC_SECRET=$(openssl rand -hex 32)
supabase secrets set TURNSTILE_SECRET_KEY=<value>
supabase secrets set RESEND_API_KEY=<value>
supabase secrets set RESEND_FROM_EMAIL="Haqak <no-reply@haqak.org>"
```

---

## 3. Supabase Vault Setup (Recommended for Production)

Edge functions use `supabase/functions/_shared/secrets.ts` which supports
fetching secrets from Supabase Vault instead of plain environment variables.
Vault provides encrypted storage and enables zero-downtime secret rotation.

```bash
# Store EMAIL_CODE_HMAC_SECRET in Vault (replaces plain env var)
supabase vault add --name EMAIL_CODE_HMAC_SECRET \
  --value "$(openssl rand -hex 32)" \
  --project-ref wfuofurgkswotwuzosdd

# Enable Vault reads in edge functions
supabase secrets set SUPABASE_VAULT_ENABLED=true

# Verify Vault entry
supabase vault list --project-ref wfuofurgkswotwuzosdd
```

See **[docs/SECURITY_SECRET_ROTATION.md](SECURITY_SECRET_ROTATION.md)** for
the complete Vault setup guide, zero-downtime rotation workflow, and emergency
rotation procedures.

---

## 4. Environment Variables

See: `supabase/functions/.env.example`

Key categories:
- Supabase keys (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- Security (`EMAIL_CODE_HMAC_SECRET`, `TURNSTILE_SECRET_KEY`, `ALLOWED_ORIGINS`)
- Secret manager (`SUPABASE_VAULT_ENABLED`)
- Email (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`)

---

## 5. Troubleshooting

### 5.1 404 on verification functions

Redeploy:

```bash
supabase link --project-ref wfuofurgkswotwuzosdd
supabase functions deploy request-email-verification
supabase functions deploy verify-email-code
```

### 5.2 CORS preflight fails

Set `ALLOWED_ORIGINS` to include your frontend domain.

### 5.3 Missing GitHub workflow secrets

Add `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_ID` in repo settings.

### 5.4 Email not received

- Verify `RESEND_API_KEY` and `RESEND_FROM_EMAIL`
- Check provider logs (Resend)
- Verify spam/junk folders

### 5.5 `500 Server configuration error` after secret rotation

Vault-cached values have a 5-minute TTL.  Wait up to 5 minutes, or redeploy
the function to clear the cache immediately.

### 5.6 `weak_secret_detected` in production logs

A deployed secret does not meet entropy requirements.  Follow the rotation
guide in `docs/SECURITY_SECRET_ROTATION.md`.

---

## 6. Smoke Test

```bash
PROJECT_URL="https://wfuofurgkswotwuzosdd.supabase.co"

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

## 6.1 Cache freshness checks (required after env changes)

```bash
APP_URL="https://haqak.app"
curl -I "${APP_URL}/index.html"
curl -I "${APP_URL}/sw.js"
curl -I "${APP_URL}/registerSW.js"
```

Expected: `Cache-Control: no-cache, no-store, must-revalidate`
for `index.html`, `sw.js`, and `registerSW.js`.

---

## 7. End-to-End Verification

Before production sign-off, confirm:

1. Sign up and sign in both work with email verification flow.
2. Edge functions return expected non-404 responses and logs are healthy.
3. File/image upload and retrieval succeed from the expected bucket.
4. No stale frontend behavior appears after hard refresh.

---

## 8. Rollback (Fast)

If checks fail after deploy:

1. Revert GitHub Actions secrets to last known-good values.
2. Trigger a new deploy via **Actions → Build and Deploy to GitHub Pages → Run workflow**.
3. Redeploy edge functions for `wfuofurgkswotwuzosdd`.
4. Repeat smoke + end-to-end checks before reopening traffic.

---

## 9. Secret Rotation

See **[docs/SECURITY_SECRET_ROTATION.md](SECURITY_SECRET_ROTATION.md)** for:
- JWT secret hardening and rotation
- Zero-downtime email-code HMAC rotation via Vault
- Emergency rotation procedures
- Health check commands
- Monitoring and alerting setup
