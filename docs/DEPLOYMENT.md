# Deployment Guide — Haqak Edge Functions

This document covers environment setup, secret management, and the optional
Supabase Vault integration for zero-downtime secret rotation.

---

## 0. First-Time CI/CD Setup (GitHub Actions)

The repository deploys Edge Functions automatically via
`.github/workflows/deploy-edge-functions.yml`.  The workflow runs on every
push to `main` and on manual dispatch.

**Required GitHub repository secrets** (one-time setup):

| Secret name | Where to get it |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | https://app.supabase.com/account/tokens - select "Generate new token" |
| `SUPABASE_PROJECT_ID` | The reference ID in your project URL, e.g. `https://app.supabase.com/project/<ref>` |

**Steps:**
1. Open **https://app.supabase.com/account/tokens** and click **Generate new
   token**.  Copy the token value immediately (it is shown only once).
2. In GitHub, open **Settings → Secrets and variables → Actions →
   New repository secret**.
   - Name: `SUPABASE_ACCESS_TOKEN`  |  Value: `<token from step 1>`
3. Add a second secret:
   - Name: `SUPABASE_PROJECT_ID`  |  Value: `<your-project-ref>`
4. Once both secrets are saved, trigger the workflow manually:
   **Actions → Deploy Supabase Edge Functions → Run workflow → Run workflow**

After that, every push to `main` deploys all functions automatically.  The
workflow also verifies both `send-otp` and `verify-otp` are reachable with
HTTP smoke tests.

---

## 1. Quick Start

### Prerequisites
- [Supabase CLI](https://supabase.com/docs/guides/cli) ≥ 1.x
- A Supabase project (get the `project-ref` from the dashboard URL)

### Local development

```bash
# 1. Link the CLI to your project
supabase link --project-ref <project-ref>

# 2. Copy and fill in the edge-function env file
cp supabase/functions/.env.example supabase/functions/.env
# ← edit .env with real values

# 3. Serve all functions locally
supabase functions serve
```

### Production deployment

```bash
# Deploy a single function
supabase functions deploy send-otp
supabase functions deploy verify-otp

# Set secrets (one-time, or after rotation)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<value>
supabase secrets set OTP_HMAC_SECRET=$(openssl rand -hex 32)
supabase secrets set TWILIO_AUTH_TOKEN=<value>
# ... other secrets from supabase/functions/.env.example
```

---

## 2. Environment Variables

See [`supabase/functions/.env.example`](../supabase/functions/.env.example) for
the full list of required and optional variables.

> **Rule of thumb:** frontend variables use the `VITE_` prefix and live in
> `.env` / Vercel.  Server-side variables are set as Supabase Edge Function
> secrets and accessed via `Deno.env.get()`.

---

## 3. SERVICE_ROLE_KEY Security Model

The `SUPABASE_SERVICE_ROLE_KEY` is a **bootstrap secret** — it is required
before any Supabase client can be created.

| Deployment | How the key is injected |
|---|---|
| Supabase Edge Functions (production) | Automatically by the Supabase runtime from your project's managed secrets store — no manual action needed |
| Local dev (`supabase functions serve`) | From `supabase/functions/.env` |
| Custom host | Set `SUPABASE_SERVICE_ROLE_KEY` as an environment variable in your runtime |

The key is **never logged**.  Only a boolean error flag is emitted when the
key is missing.

---

## 4. Optional: Supabase Vault for Secret Rotation

Supabase [Vault](https://supabase.com/docs/guides/database/vault) is a
PostgreSQL-level encrypted store.  It lets you rotate secrets without
redeploying edge functions.

> **When to use Vault:** When you need to rotate `SERVICE_ROLE_KEY` (or any
> other secret) at runtime without a full redeploy.  For most projects the
> default env-var injection is sufficient.

### 4.1 Store the secret in Vault

```bash
# Via the Supabase CLI (recommended)
supabase vault add --name SERVICE_ROLE_KEY --secret <value>

# Or via the Dashboard → Settings → Vault → Add Secret
```

### 4.2 Grant Vault access to the service role

Run the following in the Supabase SQL editor:

```sql
-- Allow the service_role to read decrypted secrets from Vault
GRANT SELECT ON vault.decrypted_secrets TO service_role;
```

### 4.3 Enable the Vault path in the edge functions

In **both** `supabase/functions/send-otp/index.ts` and
`supabase/functions/verify-otp/index.ts`, locate the `getServiceRoleKey()`
function and uncomment the Vault fallback block:

```typescript
// Uncomment to enable Vault fallback:
try {
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (anonKey && supabaseUrl) {
    const vaultClient = createClient(supabaseUrl, anonKey);
    const { data, error } = await vaultClient
      .from("vault.decrypted_secrets")
      .select("decrypted_secret")
      .eq("name", "SERVICE_ROLE_KEY")
      .maybeSingle();
    if (!error && data?.decrypted_secret) return data.decrypted_secret;
  }
} catch {
  console.error("Vault lookup failed — falling back gracefully");
}
```

### 4.4 Rotation procedure

1. Add the new key value to Vault (see §4.1).
2. Wait for the edge function cache to expire (≤ 60 s), or redeploy to force
   an immediate pick-up.
3. Revoke the old key from the Supabase dashboard.

---

## 5. Country Code / Phone Formatting

The `send-otp` and `verify-otp` functions accept an optional `countryCode`
field in the JSON request body.  This is the **E.164 dial prefix** (e.g.
`"+966"` for Saudi Arabia), not the ISO country code (`"SA"`).

The frontend resolves this automatically from the user's country-selector
choice using `src/data/countryCodes.json`.

If `countryCode` is omitted from the request, both functions fall back to the
`TWILIO_DEFAULT_COUNTRY_CODE` environment variable (default `"+20"` for Egypt).

**Critical:** both `send-otp` and `verify-otp` must receive the same
`countryCode` for a given OTP session, otherwise the phone number will be
formatted differently and the HMAC verification will fail.  The frontend
ensures this by storing `countryCode` in component state and sending it in
both requests.

---

## 6. CI / CD

The repository uses GitHub Actions for CI.  Secrets are stored in GitHub
repository secrets and are mapped to Supabase secrets on deployment.

See `.github/workflows/deploy-edge-functions.yml` for the full pipeline
definition, and **§0** above for the one-time secrets setup required to
enable automated deployments.

---

## 7. Troubleshooting

### 7.1 `send-otp` / `verify-otp` return 404

**Cause:** The Edge Functions have not been deployed yet, or the last
deployment failed.

**Fix:**

```bash
# Deploy manually from your workstation
supabase link --project-ref <your-project-ref>
supabase functions deploy send-otp
supabase functions deploy verify-otp
```

Or trigger the GitHub Actions workflow manually:
**Actions → Deploy Supabase Edge Functions → Run workflow**

---

### 7.2 CORS preflight fails (status 400 / 403)

**Cause:** The `Origin` header sent by the browser is not in the allowlist
defined in `supabase/functions/shared/cors.ts`.

**Fix:** Add your frontend origin to the `ALLOWED_ORIGINS` environment
variable:

```bash
supabase secrets set ALLOWED_ORIGINS=https://your-domain.com
```

Alternatively, update the allowlist directly in
`supabase/functions/shared/cors.ts` and redeploy.

---

### 7.3 Workflow fails with "Missing required GitHub secret(s)"

**Cause:** `SUPABASE_ACCESS_TOKEN` or `SUPABASE_PROJECT_ID` (or both) are
not set as GitHub repository secrets.

**Fix:** Follow the one-time setup steps in **§0** above.

---

### 7.4 OTP is never received by the user

Check the following in order:

1. **Twilio credentials** — ensure `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
   and `TWILIO_PHONE_NUMBER` are set as Supabase Edge Function secrets:
   ```bash
   supabase secrets set TWILIO_ACCOUNT_SID=<value>
   supabase secrets set TWILIO_AUTH_TOKEN=<value>
   supabase secrets set TWILIO_PHONE_NUMBER=<value>
   ```
2. **Phone format** — confirm the frontend is passing `countryCode` so the
   number is converted to E.164 correctly (see §5).
3. **Rate limits** — the same phone can only receive 5 OTPs per 10-minute
   window. Wait for the window to expire and try again.
4. **Twilio dashboard** — check the Twilio console for delivery errors.

---

### 7.5 `getServiceRoleKey()` returns `null` and requests fail with 500

**Cause:** `SUPABASE_SERVICE_ROLE_KEY` is not available in the Edge Function
runtime.

**Fix:**

```bash
# Set the secret via the Supabase CLI
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

The key is available in your project under
**Settings → API → Project API keys → service_role (secret)**.

---

### 7.6 How to verify a successful deployment

After the GitHub Actions workflow completes, confirm the functions are live:

```bash
# Replace PROJECT_REF with your Supabase project reference
PROJECT_URL="https://<PROJECT_REF>.supabase.co"

# send-otp smoke test (expect 200 or 405, never 404)
curl -s -o /dev/null -w "%{http_code}" \
  -X OPTIONS \
  -H "Origin: https://haqak.app" \
  -H "Access-Control-Request-Method: POST" \
  "${PROJECT_URL}/functions/v1/send-otp"

# verify-otp smoke test
curl -s -o /dev/null -w "%{http_code}" \
  -X OPTIONS \
  -H "Origin: https://haqak.app" \
  -H "Access-Control-Request-Method: POST" \
  "${PROJECT_URL}/functions/v1/verify-otp"
```

A `200` response confirms the function is deployed and responding to CORS
preflight requests.
