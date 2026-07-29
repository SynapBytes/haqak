# Haqak support feedback delivery — production runbook

## Architecture and isolation

The feedback box shown after the contribution flow at `https://haqak.org/support` uses a dedicated delivery service. It does not share the main Haqak Supabase database and it does not use any Capsorix infrastructure.

- Supabase organization: `Haqak`
- Supabase project: `haqak-production`
- Project ref: `fpkffdfattidugsrjzey`
- Project URL: `https://fpkffdfattidugsrjzey.supabase.co`
- Region: `eu-central-1`
- Sender domain: `mail.haqak.org`
- Sender address: `Haqak Support <support@mail.haqak.org>`
- Recipient mailbox: `support@haqak.org`

Never use the Capsorix Supabase organization, `mail.capsorix.tech`, a Capsorix Resend key, or the legacy Haqak Supabase project for this delivery path.

The existing Haqak application continues using its current Supabase project for authentication, contributions and all other features. Only feedback-message acceptance and notification use the isolated project.

## Current operating mode

The recipient mailbox subscription is currently inactive. Production runtime is therefore deliberately configured as:

```text
delivery_enabled = false
```

In this mode:

1. the browser request is validated and rate-limited;
2. a canonical `HQK-SUP-YYYYMMDD-XXXXXXXXXXXX` reference is generated;
3. the message is stored with `delivery_status = pending` and `delivery_error_code = MAILBOX_INACTIVE`;
4. the API returns an accepted delayed receipt;
5. no Resend request is attempted, preventing bounces and sender-reputation damage.

The success copy used by the contribution page states that the words reached Haqak; it does not claim that an email has already been delivered.

## Database model

`public.support_feedback_messages` stores one row per client-generated UUID and records:

- canonical public reference;
- external contribution UUID without a cross-project foreign key;
- visitor name, email and message;
- HMAC-hashed request fingerprint, never a raw IP address;
- delivery status, provider ID, timestamps and safe error code;
- retry attempt count and next-attempt timestamp.

`public.support_feedback_rate_limits` provides atomic dual-window throttling.

`public.support_feedback_runtime_config` is a service-only singleton containing:

- delivery feature flag;
- sender and recipient addresses;
- database-generated 64-character rate-limit salt;
- database-generated worker token.

All three tables use RLS and FORCE RLS, expose no anon/authenticated policies, and revoke browser table privileges.

## Edge Functions

### `support-feedback`

Public gateway verification is disabled intentionally because the form is available without authentication. The function implements:

- exact-origin CORS for `https://haqak.org` and `https://www.haqak.org`;
- 16 KiB request cap;
- strict UUID, email and length validation;
- honeypot handling;
- HMAC-hashed IP rate limiting;
- limits of 5 requests per 10 minutes and 20 per 24 hours;
- UUID idempotency;
- canonical receipts;
- queue-only behavior while delivery is disabled;
- fixed recipient and validated Reply-To after activation;
- Resend idempotency keys and safe provider error codes.

### `support-feedback-worker`

The worker is protected by a private database-generated token and is invoked every 10 minutes by `pg_cron` through `pg_net`.

While delivery is disabled it returns a no-op response and claims no queue rows. After activation it claims pending/failed rows with `FOR UPDATE SKIP LOCKED`, sends batches through Resend, and retries failures with bounded backoff.

## Resend configuration

Haqak uses a separate Resend account/workspace.

- Domain: `mail.haqak.org`
- Status: verified
- Region: `eu-west-1`
- Sending: enabled
- Receiving: disabled
- Open tracking: disabled
- Click tracking: disabled
- TLS: enforced
- API key: `haqak-support-production`
- Permission: sending only
- Domain restriction: `mail.haqak.org`

The only private Edge Function secret required is:

```text
RESEND_API_KEY=<Haqak domain-restricted sending token>
```

Do not place this token in GitHub, source code, a `VITE_` variable or the database migration history.

## Frontend migration bridge

The main Haqak Supabase client installs `createSupportAwareFetch`.

The adapter intercepts only `POST /rest/v1/feedbacks` from the existing contribution feedback box and translates it into a call to the isolated `support-feedback` function. Every other request continues unchanged to the legacy Haqak project.

The bridge:

- generates a client submission UUID;
- persists it in session storage across ambiguous retries;
- hashes the legacy payload to avoid storing message text in the storage key;
- accepts only a canonical receipt before returning legacy insert success;
- preserves the message on validation, network, timeout or service failure;
- exposes the canonical reference and delivery mode as response headers.

The isolated project URL and publishable key are public frontend configuration pinned in `support-feedback-api.ts`. Database access remains denied by RLS; the key grants no direct table access.

## Verified queue-mode tests

A controlled queue-only request succeeded with reference:

```text
HQK-SUP-20260729-ACCAFE5987CC
```

The stored row had:

```text
delivery_status = pending
delivery_error_code = MAILBOX_INACTIVE
attempt_count = 0
email_sent_at = null
```

The worker smoke test returned HTTP 200:

```json
{
  "ok": true,
  "delivery_enabled": false,
  "processed": 0,
  "sent": 0,
  "failed": 0
}
```

The cron job `haqak_support_feedback_dispatch` is active on `*/10 * * * *`.

## Mailbox-restoration procedure

Do not activate delivery merely because the sender domain is verified. First restore the actual `support@haqak.org` mailbox subscription and confirm that it can receive normal external mail.

Then:

1. confirm `RESEND_API_KEY` exists in the `haqak-production` Edge Function secrets;
2. delete the controlled test row `HQK-SUP-20260729-ACCAFE5987CC` so it is never delivered as a real message;
3. send one controlled Resend test to `support@haqak.org` and confirm receipt;
4. set `delivery_enabled = true` in `support_feedback_runtime_config`;
5. invoke `support-feedback-worker` once and confirm each queued row receives a provider ID and sent timestamp;
6. verify idempotency by replaying one submission UUID;
7. monitor Resend delivery status and Supabase logs.

Activation SQL, after steps 1–3 pass:

```sql
update public.support_feedback_runtime_config
set delivery_enabled = true,
    updated_at = now()
where singleton = true;
```

Rollback is immediate and does not discard queued messages:

```sql
update public.support_feedback_runtime_config
set delivery_enabled = false,
    updated_at = now()
where singleton = true;
```

## Rollout restrictions

Keep PR #49 as Draft until:

- the Resend secret is stored in Supabase;
- source-level tests and a production build complete outside the currently blocked GitHub Actions runners;
- the public deployment route is confirmed;
- the live feedback box is tested in a private browser session;
- the canonical reference appears in the isolated database;
- after mailbox renewal, one end-to-end email is confirmed in Supabase, Resend and the mailbox.

Do not merge merely because the backend functions are active. The public website remains unchanged until the reviewed branch is built and deployed.
