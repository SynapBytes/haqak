# Haqak support feedback delivery — operations runbook

## Scope

This runbook covers the message box shown after a successful support contribution on `https://haqak.org/support`.

The legacy implementation inserts directly from the browser into `public.feedbacks` and shows a success toast. It does **not** send an email and it cannot prove delivery. The replacement path is:

1. Browser sends a typed request to the public `support-feedback` Edge Function.
2. The function validates and sanitizes the payload.
3. A honeypot and a durable database-backed throttle protect the endpoint.
4. The function stores one idempotent feedback row with a canonical public reference.
5. Resend sends one internal notification to `support@haqak.org`.
6. The visitor email is used only as `Reply-To` when supplied.
7. The response distinguishes delivered (`200`) from stored-but-delayed (`202`).

No visitor acknowledgement email is sent. This prevents the public endpoint from becoming an email relay.

## Isolation boundaries

- **Haqak Supabase project:** `wfuofurgkswotwuzosdd`
- **Capsorix Supabase project:** must never be used for this workflow.
- **Haqak sender domain:** `mail.haqak.org`
- **Capsorix sender domain:** `mail.capsorix.tech` must not be reused for Haqak.
- Use a **sending-only Resend API key restricted to the Haqak domain**.
- Use a separate random rate-limit salt for Haqak.

## Current infrastructure blockers recorded on 2026-07-29

1. The connected Supabase account exposes only `capsorix-production`; it does not expose the existing Haqak project `wfuofurgkswotwuzosdd`.
2. The connected Resend plan permits one sender domain and currently uses that slot for `mail.capsorix.tech`. Adding `mail.haqak.org` returned a plan-limit `403`.

Do not merge or deploy until both blockers are resolved.

## Resend preparation

Choose one:

- Upgrade the connected Resend workspace so it can host both isolated domains; or
- Connect a separate Resend workspace dedicated to Haqak.

Then:

1. Add `mail.haqak.org` in region `eu-west-1`.
2. Enable **Sending** only.
3. Keep **Receiving**, open tracking and click tracking disabled.
4. Prefer enforced TLS.
5. Publish the exact DKIM, SPF and Return-Path records supplied by Resend.
6. Wait until the domain status is `verified`.
7. Create a sending-only API key named `haqak-support-production`, restricted to `mail.haqak.org`.

Never reuse the Capsorix key.

## Supabase migration

Connect to the account that owns project `wfuofurgkswotwuzosdd`, then apply:

```bash
export PROJECT_REF='wfuofurgkswotwuzosdd'
supabase link --project-ref "$PROJECT_REF"
supabase db push --linked
```

The migration is forward-only. It preserves existing feedback rows, marks them as `legacy`, and adds traceability and delivery-state columns. It intentionally keeps the legacy anonymous INSERT policy during the staged rollout so the currently deployed UI does not break before the Edge Function and new frontend are live.

Verify:

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'feedbacks'
order by ordinal_position;
```

## Required Edge Function secrets

Set these only on the Haqak Supabase project:

```bash
openssl rand -hex 32

supabase secrets set --project-ref "$PROJECT_REF" \
  RESEND_API_KEY='re_replace_with_haqak_restricted_key' \
  SUPPORT_FROM_EMAIL='Haqak Support <support@mail.haqak.org>' \
  SUPPORT_TO_EMAIL='support@haqak.org' \
  SUPPORT_RATE_LIMIT_SALT='<64-character-random-hex>' \
  ALLOWED_ORIGINS='https://haqak.org,https://www.haqak.org'
```

Supabase supplies the project URL and administrative key to the runtime. Never place an administrative key or Resend key in a `VITE_` variable.

## Deploy function

The repository workflow `.github/workflows/deploy-support-feedback.yml` deploys only `support-feedback` and deliberately uses `--no-verify-jwt` because this is a public form with its own exact-origin, validation, honeypot, throttling and idempotency controls.

Manual equivalent:

```bash
supabase functions deploy support-feedback \
  --project-ref "$PROJECT_REF" \
  --no-verify-jwt
supabase functions list --project-ref "$PROJECT_REF"
```

## Controlled direct smoke test

Use a controlled sender address and a new UUID once:

```bash
export FUNCTION_URL="https://${PROJECT_REF}.supabase.co/functions/v1/support-feedback"
export ANON_KEY='<haqak-public-anon-key>'
export SUBMISSION_ID="$(python3 -c 'import uuid; print(uuid.uuid4())')"

curl --fail-with-body -i "$FUNCTION_URL" \
  -H 'Origin: https://haqak.org' \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H 'Content-Type: application/json' \
  --data "{\"submission_id\":\"$SUBMISSION_ID\",\"contribution_id\":null,\"name\":\"Haqak production smoke test\",\"email\":\"support@haqak.org\",\"message\":\"Controlled production verification for Haqak support feedback delivery. No response is required.\",\"honeypot\":\"\"}"
```

Expected delivered response:

```json
{
  "accepted": true,
  "reference": "HQK-SUP-YYYYMMDD-XXXXXXXXXXXX",
  "delivery": "sent",
  "duplicate": false
}
```

Repeat the exact request with the same `SUBMISSION_ID`. It must return the same reference with `"duplicate": true` and must not send a second email.

Verify the row:

```sql
select
  public_reference,
  submission_id,
  delivery_status,
  provider_message_id,
  email_sent_at,
  delivery_error_code
from public.feedbacks
where submission_id = '<submission-id>';
```

Confirm:

- exactly one row;
- matching public reference;
- `delivery_status = 'sent'`;
- non-empty provider message ID;
- non-empty email timestamp;
- no delivery error code;
- exactly one Resend message to `support@haqak.org`;
- Reply-To matches the controlled visitor email;
- the message reaches the support mailbox.

## Public response contract

| HTTP | Meaning |
| --- | --- |
| `200` | Stored and delivered, or an idempotent replay of a delivered message. |
| `202` | Stored, but provider notification is delayed or failed. |
| `403` | Origin rejected. |
| `422` | Strict payload validation failed. |
| `429` | Durable throttle rejected the request. |
| `503` | Configuration, persistence or throttle storage is unavailable. |

The UI must not display success for a malformed `2xx` response. Failed or ambiguous attempts must retain the same client-generated UUID for a safe retry.

## Final website verification and lockdown

After the frontend integration is deployed:

1. Open a private browser window at `https://haqak.org/support`.
2. Complete the controlled support flow.
3. Submit one feedback message.
4. Confirm the UI displays the canonical `HQK-SUP-...` reference.
5. Confirm the same reference and provider ID in Supabase and Resend.
6. Confirm delivery in `support@haqak.org`.
7. Only after the live UI succeeds, apply and commit a separate hardening migration:

```sql
DROP POLICY IF EXISTS "Anyone can insert a feedback" ON public.feedbacks;
```

8. Re-test the live UI after the policy removal and confirm direct anonymous table inserts are rejected while the Edge Function continues to work.

Do not claim production readiness until the direct function test, deployed UI test and post-lockdown UI test all pass.
