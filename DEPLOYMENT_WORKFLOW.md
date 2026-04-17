# Deployment Workflow — Haqak

This document explains how the automated Vercel deployment workflow works, how to configure it, and how to troubleshoot common issues.

---

## How the Workflow Works

File: `.github/workflows/deploy-to-vercel.yml`

### Trigger

The workflow runs automatically on every `push` to the `main` branch, and can also be triggered manually via **Actions → Deploy to Vercel → Run workflow**.

### Steps

| # | Step | Description |
|---|------|-------------|
| 1 | **Validate secrets** | Checks that `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` are present. Fails fast with clear instructions if any are missing. |
| 2 | **Checkout** | Fetches the latest commit from `main`. |
| 3 | **Set up Node.js** | Installs Node.js 18.20.0 (read from `.nvmrc`) with npm dependency caching enabled. |
| 4 | **Install dependencies** | Runs `npm ci` for a clean, reproducible install. |
| 5 | **Build** | Runs `npm run build` (Vite). Optional `VITE_*` secrets are injected as environment variables if set. |
| 6 | **Deploy to Vercel** | Installs the Vercel CLI and runs `vercel deploy --prod` with `--org-id` and `--project-id` for reliable project targeting. |
| 7 | **Post PR comment** | On pull request events, posts a comment with the deployment URL and step results. |
| 8 | **Report status** | Always writes a summary to the GitHub Actions job summary (visible in the run details). |

### Safety Features

- **Fail fast:** Any step failure stops the run immediately — a broken build can never be deployed.
- **Timeout:** The entire job is limited to **15 minutes** to prevent runaway runs.
- **Secret validation:** All three required secrets are checked before any code is run.
- **No hardcoded values:** All credentials and IDs come from GitHub Secrets.

---

## Required GitHub Secrets

Add these in **Settings → Secrets and variables → Actions → New repository secret**:

| Secret Name | Where to find the value |
|-------------|-------------------------|
| `VERCEL_TOKEN` | <https://vercel.com/account/tokens> → Create Token (Scope: Full Account) |
| `VERCEL_ORG_ID` | Vercel team **Settings → General → Team ID** |
| `VERCEL_PROJECT_ID` | Vercel project **Settings → General → Project ID** |

### Optional build-time secrets

These are injected into the Vite build. The workflow will still succeed without them (Vite uses empty strings), but the app may lack some functionality in production:

| Secret Name | Description |
|-------------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key |
| `VITE_VAPID_PUBLIC_KEY` | Web Push VAPID public key |

---

## One-Time Setup

1. **Create a Vercel token**
   - Go to <https://vercel.com/account/tokens> → **Create Token**
   - Name: `haqak-deploy`, Scope: **Full Account**, Expiration: as needed
   - Copy the token immediately — it is shown only once

2. **Find your IDs**
   - `VERCEL_ORG_ID`: Vercel dashboard → **Settings → General → Team ID**
   - `VERCEL_PROJECT_ID`: Vercel project → **Settings → General → Project ID**

3. **Add secrets to GitHub**
   - Repository → **Settings → Secrets and variables → Actions → New repository secret**
   - Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`

4. **Trigger the first deploy**
   - Push any commit to `main`, or go to **Actions → Deploy to Vercel → Run workflow**

---

## Manual Re-run

To manually trigger or re-run a deployment:

1. Go to the repository **Actions** tab
2. Select **Deploy to Vercel** from the left sidebar
3. Click **Run workflow** → select `main` → click **Run workflow**

Or re-run a failed run by opening the failed run and clicking **Re-run all jobs**.

---

## Monitoring Deployments

- **GitHub Actions:** <https://github.com/Axonexiis/haqak/actions/workflows/deploy-to-vercel.yml>
- **Vercel dashboard:** <https://vercel.com/dashboard> — shows all deployments, logs, and domain status
- **README badge:** The `[![Deploy to Vercel](...)]` badge at the top of `README.md` reflects the latest workflow status

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Workflow fails — "Missing required GitHub secret(s)" | One or more secrets are not set | Add the missing secret(s) as described in **Required GitHub Secrets** above |
| `vercel deploy` exits with an auth error | `VERCEL_TOKEN` is invalid or expired | Create a new token at <https://vercel.com/account/tokens> and update the secret |
| `vercel deploy` exits with "Project not found" | `VERCEL_ORG_ID` or `VERCEL_PROJECT_ID` is wrong | Re-check the IDs in the Vercel dashboard and update the secrets |
| Build fails (Vite errors) | Missing `VITE_*` env vars or a code bug | Check the **Build** step logs; set the optional `VITE_*` secrets if needed |
| Website still shows old content after a successful deploy | CDN or browser cache | Hard-refresh (Ctrl+Shift+R) or open in a private window; Vercel CDN propagation takes ~30 seconds |
| Workflow timed out | Build or deploy took longer than 15 minutes | Check for large assets or slow npm installs; the timeout is set in the workflow's `timeout-minutes` field |

---

## Security Notes

- All credentials are stored as **encrypted GitHub Secrets** — they are never logged or exposed in plain text.
- Secrets are accessed only via `${{ secrets.* }}` — never hardcoded.
- The `VERCEL_TOKEN` is used only to issue a production deployment; it does not grant write access to the repository.
- The workflow has minimal permissions: `contents: read` + `pull-requests: write` (for PR comments only).
