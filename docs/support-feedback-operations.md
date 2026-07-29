# Haqak support feedback delivery — production runbook

## Architecture

The message box shown after the support flow at `https://haqak.org/support` uses a dedicated delivery service. It does **not** share the main Haqak Supabase database and it does not use any Capsorix infrastructure.

### Isolation boundary

- Supabase organization: `Haqak`
- Supabase project: `haqak-production`
- Project ref: `fpkffdfattidugsrjzey`
- Project URL: `https://fpkffdfattidugsrjzey.supabase.co`
- Region: `eu-central-1`
- Sender domain: `mail.haqak.org`
- Sender address: `Haqak Support <support@mail.haqak.org>`
- Recipient: `support@haqak.org`

Never use:

- the Capsorix Supabase organization or project;
- `mail.capsorix.tech`;
- the Capsorix Resend API key;
- the legacy Haqak Supabase project for this delivery path.

The existing Haqak application continues using its current Supabase project for authentication, contributions and all other features. Only the support-message notification uses the isolated project.

## Database model

`public.support_feedback_messages` stores one row per client-generated UUID and records:

- canonical `HQK-SUP-YYYYMMDD-XXXXXXXXXXXX` reference;
- optional contribution UUID from the legacy project, stored as an external identifier without a foreign key;
- visitor name, email and message;
- hashed request fingerprint, never a raw IP address;
- delivery status, provider message ID, sent timestamp and safe error code.

`public.support_feedback_rate_limits` provides atomic dual-window throttling through `consume_support_feedback_rate_limit`.

Both tables have RLS and FORCE RLS enabled. No anon or authenticated policies exist. Only the Edge Function service role can read or write them.

## Runtime secrets

Configure these only in `haqak-production`:

```text
RESEND_API_KEY=<Haqak-only sending key restricted to mail.haqak.org>
SUPPORT_FROM_EMAIL=Haqak Support <support@mail.haqak.org>
SUPPORT_TO_EMAIL=support@haqak.org
SUPPORT_RATE_LIMIT_SALT=<64-character random hex value>
SUPPORT_ALLOWED_ORIGINS=https://haqak.org,https://www.haqak.org
```

Never place these values in `VITE_` variables. Supabase supplies its own administrative runtime credential to the Edge Function.

## Resend requirements

Use a separate Resend account/workspace dedicated to Haqak.

- Domain: `mail.haqak.org`
- Region: `eu-west-1`
- Sending: enabled
- Receiving: disabled
- Open tracking: disabled
- Click tracking: disabled
- TLS: enforced when supported
- API key name: `haqak-support-production`
- API key permission: sending only
- API key domain restriction: `mail.haqak.org`

Do not activate the website integration until the domain is `verified` and a direct Resend test reaches `support@haqak.org`.

## Frontend public configuration

GitHub Actions repository variables:

```text
VITE_SUPPORT_SUPABASE_URL=https://fpkffdfattidugsrjzey.supabase.co
VITE_SUPPORT_SUPABASE_PUBLISHABLE_KEY=<enabled sb_publishable key from haqak-production>
```

These are public browser credentials scoped to the isolated project. The database remains inaccessible to browser roles; the browser calls only the `support-feedback` Edge Function.

## Edge Function deployment

The function is public at the gateway (`verify_jwt=false`) because the form can be used without signing in. The function implements its own controls:

- exact-origin CORS;
- 16 KiB request-body cap;
- strict UUID, email and length validation;
- honeypot rejection without persistence;
- HMAC-hashed IP fingerprint;
- atomic limits of 5 requests per 10 minutes and 20 per 24 hours;
- UUID idempotency;
- fixed recipient and validated Reply-To;
- Resend idempotency key;
- safe provider error codes with no secret leakage.

GitHub deployment secrets:

```text
HAQAK_SUPPORT_SUPABASE_ACCESS_TOKEN=<Supabase personal access token>
HAQAK_SUPPORT_SUPABASE_PROJECT_ID=fpkffdfattidugsrjzey
```

The workflow refuses to deploy to any other project ref.

## Controlled direct smoke test

Use a new UUID for the first request:

```json
{
  "submission_id": "<new UUID>",
  "contribution_id": null,
  "name": "Haqak Production Smoke Test",
  "email": "support@haqak.org",
  "message": "Controlled production verification for the isolated Haqak support delivery service. No response is required.",
  "language": "en",
  "honeypot": ""
}
```

Request settings:

```text
POST https://fpkffdfattidugsrjzey.supabase.co/functions/v1/support-feedback
Origin: https://haqak.org
Content-Type: application/json
apikey: <publishable key>
Authorization: Bearer <publishable key>
```

Expected response:

```json
{
  "accepted": true,
  "reference": "HQK-SUP-YYYYMMDD-XXXXXXXXXXXX",
  "delivery": "sent",
  "duplicate": false
}
```

Repeat the exact same request once. It must return the same reference with `duplicate: true`, create no second row and send no second email.

Verify in the database:

```sql
select
  public_reference,
  submission_id,
  delivery_status,
  provider_message_id,
  email_sent_at,
  delivery_error_code
from public.support_feedback_messages
where submission_id = '<submission UUID>';
```

Production acceptance requires:

- exactly one row;
- `delivery_status = 'sent'`;
- non-empty provider message ID;
- non-empty sent timestamp;
- null delivery error code;
- exactly one Resend delivery to `support@haqak.org`;
- Reply-To equal to the submitted visitor email.

## Website rollout

1. Complete the direct function smoke test.
2. Configure the two public GitHub variables.
3. Wire the existing feedback box to `submitSupportFeedback` while preserving its UUID across safe retries.
4. Require a canonical receipt before displaying success.
5. Deploy through a reviewed pull request.
6. Test `/support` in a private browser window.
7. Confirm the same reference in the UI, Supabase, Resend and the support mailbox.

Do not mark the system production-ready until both the direct function test and the deployed website test pass.
