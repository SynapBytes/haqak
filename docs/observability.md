# Observability — PostHog & Sentry

This document describes the analytics and error-monitoring setup for Haqak.

---

## 1. PostHog — Product Analytics

[PostHog](https://posthog.com) is used for product-usage insights.
The client is initialised in `src/lib/analytics.ts` and booted in `src/main.tsx`.

### Required environment variables

| Variable | Description |
|---|---|
| `VITE_POSTHOG_KEY` | PostHog project API key (starts with `phc_`) |
| `VITE_POSTHOG_HOST` | PostHog ingest host. Defaults to `https://app.posthog.com`. Set to your self-hosted URL if applicable. |

Both variables are **optional** — when `VITE_POSTHOG_KEY` is absent (e.g., local dev), all `analytics.*` calls are no-ops.

### Privacy choices

- Session recording is **disabled**.
- IP geolocation collection is **disabled**.
- The `respect_dnt` option is set so users with "Do Not Track" enabled are not tracked.
- User identity is limited to the Supabase `user_id` UUID and a `role` string — no names, emails, or phone numbers are sent.

### Tracked events

| Event name | When | Properties |
|---|---|---|
| `login_success` | User signs in successfully | — |
| `login_failure` | Login attempt throws an error | — |
| `signup_success` | New account is created | `role` (`citizen` \| `mp`) |
| `signup_failure` | Signup attempt throws an error | `role` |
| `issue_submitted` | Citizen issue is persisted in the DB | `category`, `has_attachments`, `has_assigned_mp`, `issue_type`, `priority` |
| `issue_submission_failed` | Issue submission throws an unexpected error | — |
| `admin_approved_mp` | Admin sets `is_approved = true` for an MP | — |
| `admin_rejected_mp` | Admin sets `is_approved = false` for an MP | — |

Identify / reset calls happen automatically inside `AuthContext`:
- `analytics.identify(userId, role)` — called whenever the profile is loaded after sign-in.
- `analytics.reset()` — called on sign-out.

---

## 2. Sentry — Error Monitoring

[Sentry](https://sentry.io) is used for frontend runtime error capture and basic performance visibility.
Initialisation lives in `src/lib/sentry.ts` and is called in `src/main.tsx`.

### Required environment variables

| Variable | Description |
|---|---|
| `VITE_SENTRY_DSN` | Sentry project DSN (from Sentry project settings) |
| `VITE_ENV` | Environment label sent to Sentry. Use `development` locally to suppress noise. Defaults to `production`. |

`VITE_SENTRY_DSN` is **optional** — when absent, Sentry is not initialised.

### Configuration choices

- **Traces sample rate**: `0.1` (10 % of transactions) — keeps performance-monitoring quota low.
- **Session replay**: disabled — avoids capturing PII in recordings.
- **`beforeSend` hook**: scrubs `request.cookies` before events are sent.

---

## 3. Local development

Set `VITE_ENV=development` in your `.env` file.
Leave `VITE_POSTHOG_KEY` and `VITE_SENTRY_DSN` **unset** (or empty) to suppress all telemetry during local development.
