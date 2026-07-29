# Haqak support feedback delivery — production runbook

## Current operating state

The support-message delivery service is deployed in **queue mode** because the `support@haqak.org` mailbox subscription is currently inactive.

- New messages are validated, rate-limited, stored and assigned a canonical reference.
- Email delivery is intentionally disabled with `delivery_enabled = false`.
- No email is attempted while the mailbox is inactive, preventing bounces and sender-reputation damage.
- A protected worker runs every 10 minutes and performs a safe no-op while delivery is disabled.
- When the mailbox is renewed, enabling one database flag will allow the worker to dispatch queued messages automatically.

Do not claim that queued messages were delivered by email. The current receipt state is `delivery: delayed`.

## Isolation boundary

- Supabase organization: `Haqak`
- Supabase project: `haqak-production`
- Project ref: `fpkffdfattidugsrjzey`
- Project URL: `https://fpkffdfattidugsrjzey.supabase.co`
- Region: `eu-central-1`
- Resend account/workspace: Haqak-only
- Sender domain: `mail.haqak.org`
- Sender address: `Haqak Support <support@mail.haqak.org>`
- Intended recipient after mailbox renewal: `support@haqak.org`

Never use the Capsorix Supabase organization/project, `mail.capsorix.tech`, a Capsorix Resend key, or the legacy Haqak Supabase project for this delivery path.

The existing Haqak application continues using its current Supabase project for authentication, contributions and all other features. Only the support-message path uses the isolated project.

## Resend state

`mail.haqak.org` is verified with:

- region `eu-west-1`;
- sending enabled;
- receiving disabled;
- open tracking disabled;
- click tracking disabled;
- TLS enforced;
- sending-only API key restricted to `mail.haqak.org`.

`RESEND_API_KEY` must exist only in the Edge Function secrets for `haqak-production`. Never place it in GitHub, repository files or a `VITE_` variable.

## Database model

`public.support_feedback_messages` stores:

- canonical `HQK-SUP-YYYYMMDD-XXXXXXXXXXXX` reference;
- client-generated UUID idempotency key;
- optional legacy contribution UUID without a cross-project foreign key;
- visitor name, email and message;
- HMAC-hashed request fingerprint, never a raw IP address;
- queue and delivery state;
- attempt count, retry time, provider ID and safe error code.

`public.support_feedback_rate_limits` provides atomic dual-window throttling.

`public.support_feedback_runtime_config` contains the operational flag, fixed sender/recipient and internally generated worker/rate-limit values.

All service tables use RLS and FORCE RLS. Browser roles have no direct policies or table privileges.

## Edge Functions

### `support-feedback`

Public gateway endpoint with `verify_jwt=false` because unauthenticated visitors may use the form. It implements:

- exact-origin CORS for `haqak.org` and `www.haqak.org`;
- 16 KiB body cap;
- UUID, email and length validation;
- honeypot handling;
- HMAC-hashed IP fingerprinting;
- limits of 5 requests per 10 minutes and 20 per 24 hours;
- durable idempotency;
- canonical receipts;
- queue persistence before any email attempt.

When delivery is disabled it returns HTTP 202 with `delivery: delayed` and `code: MAILBOX_INACTIVE`.

### `support-feedback-worker`

Internal worker protected by a generated token stored in the service database. `pg_cron` calls it every 10 minutes.

While `delivery_enabled=false`, the expected response is:

```json
{
  "ok": true,
  "delivery_enabled": false,
  "processed": 0,
  "sent": 0,
  "failed": 0
}
```

## Frontend bridge

The existing `Support.tsx` remains unchanged to minimise regression risk. The legacy insert to `/rest/v1/feedbacks` is intercepted by `createSupportAwareFetch` and redirected to the isolated Edge Function.

Every other request made by the primary Supabase client continues unchanged to the legacy Haqak backend.

The bridge:

- intercepts only POST requests to `/rest/v1/feedbacks`;
- derives a deterministic payload fingerprint;
- stores a UUID in session storage for safe retry;
- clears the UUID only after a canonical receipt;
- returns a PostgREST-compatible 201 response to the existing UI;
- preserves the retry identifier on timeout, network or service failure.

The public project URL and publishable key are intentionally embedded as browser configuration. RLS denies browser access to service tables.

## Tested state

Completed:

- verified Resend DNS records;
- direct queue-mode POST returned HTTP 202;
- exactly one database row was created;
- row state is `pending` with `MAILBOX_INACTIVE`;
- worker direct test returned HTTP 200 with zero processed/sent/failed;
- scheduled worker has continued returning HTTP 200 every 10 minutes;
- security advisor reports no warnings, only intentional INFO notices for service-only RLS tables.

Not yet possible:

- real email delivery test, because the recipient mailbox is inactive;
- public website rollout, because GitHub-hosted runners currently terminate before starting any steps;
- end-to-end mailbox verification.

## Mailbox renewal procedure

After `support@haqak.org` is renewed:

1. Confirm the mailbox can receive a normal external email.
2. Keep the website queue enabled; do not delete pending rows.
3. Set `delivery_enabled = true` in the singleton runtime-config row.
4. Invoke the worker once manually.
5. Confirm the queued smoke-test message becomes `sent` with a provider ID and timestamp.
6. Confirm Resend delivery and actual mailbox receipt.
7. Leave the 10-minute worker schedule active for future retries.

If delivery fails, immediately set `delivery_enabled=false` and inspect the safe error code before retrying.

## Deployment restriction

Both Edge Functions and all migrations are pinned to project ref `fpkffdfattidugsrjzey`. The deployment workflow must refuse every other project ref.

Keep PR #49 as Draft until the frontend can be built, reviewed and deployed, and until the renewed mailbox passes a real delivery test.
