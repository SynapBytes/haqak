# 🔐 Supabase Account Migration Guide

This guide documents the complete migration from the old Supabase account
(`ujbiyzabdonykzfofsiz`) to the new account (`wfuofurgkswotwuzosdd`).

---

## 📋 Overview

| Item | Old | New |
|------|-----|-----|
| Project Ref | `ujbiyzabdonykzfofsiz` | `wfuofurgkswotwuzosdd` |
| Project URL | `https://ujbiyzabdonykzfofsiz.supabase.co` | `https://wfuofurgkswotwuzosdd.supabase.co` |

---

## ✅ Checklist

- [ ] Update GitHub Secrets (see [Step 1](#step-1-update-github-secrets))
- [ ] Update Vercel Environment Variables (see [Step 2](#step-2-update-vercel-environment-variables))
- [ ] Set Supabase Edge Function Secrets (see [Step 3](#step-3-set-supabase-edge-function-secrets))
- [ ] Run database migrations on the new project (see [Step 4](#step-4-run-database-migrations))
- [ ] Deploy Edge Functions to the new project (see [Step 5](#step-5-deploy-edge-functions))
- [ ] Verify the application is working end-to-end

---

## Step 1: Update GitHub Secrets

Go to **GitHub → Settings → Secrets and variables → Actions** and update/create
the following secrets:

| Secret Name | Value |
|-------------|-------|
| `SUPABASE_PROJECT_ID` | `wfuofurgkswotwuzosdd` |
| `SUPABASE_ACCESS_TOKEN` | *(your Supabase personal access token — unchanged)* |

> **Where to find `SUPABASE_ACCESS_TOKEN`:**
> Go to [app.supabase.com](https://app.supabase.com) → Account → Access Tokens → Generate new token.

---

## Step 2: Update Vercel Environment Variables

Go to **Vercel → Project Settings → Environment Variables** and update each of
the following (apply to all environments: Production, Preview, Development):

### Frontend variables

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://wfuofurgkswotwuzosdd.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | *(new anon/public key from Supabase Dashboard → Settings → API)* |

### Server-side variables

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | `https://wfuofurgkswotwuzosdd.supabase.co` |
| `SUPABASE_ANON_KEY` | *(new anon/public key from Supabase Dashboard → Settings → API)* |
| `SUPABASE_SERVICE_ROLE_KEY` | *(new service role key — keep this secret, never share it publicly)* |
| `OTP_HMAC_SECRET` | *(generate with: `openssl rand -hex 32`)* |
| `GEMINI_API_KEY` | *(Gemini API key for image moderation — optional)* |

### Unchanged variables (verify these are still set)

| Variable | Notes |
|----------|-------|
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile — no change needed |
| `RESEND_API_KEY` | Resend email provider — no change needed |
| `VAPID_PUBLIC_KEY` | Push notification key — no change needed |
| `VAPID_PRIVATE_KEY` | Push notification key — no change needed |

---

## Step 3: Set Supabase Edge Function Secrets

Go to **Supabase Dashboard → Project Settings → Edge Functions → Secrets**
and set the following:

```bash
# Or use the CLI:
supabase secrets set --project-ref wfuofurgkswotwuzosdd \
  SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key> \
  OTP_HMAC_SECRET=<your_otp_hmac_secret> \
  GEMINI_API_KEY=<your_gemini_api_key> \
  TURNSTILE_SECRET_KEY=<your_turnstile_secret_key> \
  RESEND_API_KEY=<your_resend_api_key> \
  VAPID_PUBLIC_KEY=<your_vapid_public_key> \
  VAPID_PRIVATE_KEY=<your_vapid_private_key> \
  ALLOWED_ORIGINS=https://haqak.app,https://www.haqak.app
```

> **Note about `OTP_HMAC_SECRET`:** This secret is used to HMAC-sign OTP tokens
> *before* storing them in the database. It is completely separate from the OTP
> email/SMS codes that users receive — Supabase Auth handles OTP delivery
> independently via the Auth settings in the Dashboard.

---

## Step 4: Run Database Migrations

Apply all existing migrations to the new Supabase project:

```bash
# Link the CLI to the new project
supabase link --project-ref wfuofurgkswotwuzosdd

# Push all migrations
supabase db push
```

> If you prefer the Supabase Dashboard, you can run each `.sql` file in
> `supabase/migrations/` using the SQL Editor.

---

## Step 5: Deploy Edge Functions

Deploy all Edge Functions to the new project:

```bash
# Make sure you are linked to the new project
supabase link --project-ref wfuofurgkswotwuzosdd

# Deploy all functions
supabase functions deploy
```

Or use the GitHub Actions workflow which reads `SUPABASE_PROJECT_ID` from
GitHub Secrets (updated in Step 1).

---

## 🔍 Verification

After completing all steps, verify the application is working:

1. **Frontend loads** — open the app and confirm no Supabase config errors.
2. **Authentication** — sign up / sign in works and OTP emails are delivered.
3. **Edge Functions** — submit a form or trigger a function and check the logs:
   ```
   supabase functions logs --project-ref wfuofurgkswotwuzosdd
   ```
4. **Database** — confirm that tables and rows are accessible from the app.

---

## 📝 Files Changed in This Migration

| File | Change |
|------|--------|
| `supabase/config.toml` | Updated `project_id` to `wfuofurgkswotwuzosdd` |
| `.env.example` | Updated Supabase URL, anon key reference, project ID, and clarified OTP/Gemini comments |
| `supabase/functions/.env.example` | Updated Supabase URL, anon key reference, and clarified OTP comment |

> **Note:** `vercel.json` and `package.json` required no changes — they already
> use wildcard patterns (`*.supabase.co`) and contain no hardcoded project IDs.
