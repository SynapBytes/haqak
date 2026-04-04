# Deployment Guide — Haqak Edge Functions

This document covers environment setup, secret management, and the optional
Supabase Vault integration for zero-downtime secret rotation.

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

See `.github/workflows/` for the full pipeline definition.
