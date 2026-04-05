# OTP Edge Functions (Supabase + Twilio Verify)

This document describes the hardened OTP delivery and verification flow implemented in:

- `/supabase/functions/send-otp/index.ts`
- `/supabase/functions/verify-otp/index.ts`

No database schema/migration changes are required for this flow.

## Runtime dependencies

Required environment variables (server-side only):

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_VERIFY_SERVICE_SID`

Optional resilience tuning:

- `OTP_TWILIO_TIMEOUT_MS` (default `8000`, min `1000`, max `20000`)
- `OTP_TWILIO_MAX_RETRIES` (default `1`, min `0`, max `3`)

## Authorization expectations

Both endpoints require at least one of:

- `Authorization: Bearer <token>`
- `apikey: <supabase_anon_key>`

Otherwise they return:

- HTTP `401`
- `error_code: "AUTH_REQUIRED"`

## Endpoint contracts

Base URL for this project:

- `https://ebawkhmmebecxirksvog.supabase.co/functions/v1`

### 1) Send OTP

`POST /send-otp`

Request body:

```json
{
  "phone": "01012345678",
  "countryCode": "+20"
}
```

Also accepted:

```json
{
  "phone": "+201012345678"
}
```

Successful response (`200`):

```json
{
  "success": true,
  "status": "sent",
  "twilio_status": "pending",
  "sid": "VE...",
  "channel": "sms",
  "phone_masked": "+20*******78",
  "request_id": "..."
}
```

Common errors:

- `400 INVALID_JSON`
- `400 INVALID_PHONE`
- `401 AUTH_REQUIRED`
- `429 OTP_RATE_LIMITED`
- `502 TWILIO_UNAVAILABLE`
- `504 TWILIO_TIMEOUT`
- `500 MISSING_SECRET`

### 2) Verify OTP

`POST /verify-otp`

Request body (both `otp` and `code` are accepted):

```json
{
  "phone": "01012345678",
  "countryCode": "+20",
  "otp": "123456"
}
```

or

```json
{
  "phone": "+201012345678",
  "code": "123456"
}
```

Approved response (`200`):

```json
{
  "approved": true,
  "success": true,
  "status": "approved",
  "sid": "VE...",
  "phone_masked": "+20*******78",
  "request_id": "..."
}
```

Rejected/invalid code response (`401`):

```json
{
  "success": false,
  "status": 401,
  "error_code": "OTP_REJECTED",
  "error": "OTP verification failed",
  "message": "OTP verification failed",
  "approved": false
}
```

Expired code response (`410`):

```json
{
  "success": false,
  "status": 410,
  "error_code": "OTP_EXPIRED",
  "error": "OTP expired. Request a new code.",
  "message": "OTP expired. Request a new code.",
  "approved": false,
  "verification_status": "expired"
}
```

Common errors:

- `400 INVALID_JSON`
- `400 INVALID_PHONE`
- `400 INVALID_OTP`
- `401 AUTH_REQUIRED`
- `429 OTP_RATE_LIMITED`
- `502 TWILIO_UNAVAILABLE`
- `504 TWILIO_TIMEOUT`
- `500 MISSING_SECRET`

## Reproducible manual tests (curl)

Set values:

```bash
export SUPABASE_URL="https://ebawkhmmebecxirksvog.supabase.co"
export SUPABASE_ANON_KEY="<anon-key>"
export PHONE_E164="+201012345678"
```

### A) Send OTP

```bash
curl -i -X POST "$SUPABASE_URL/functions/v1/send-otp" \
  -H "Content-Type: application/json" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -d "{\"phone\":\"$PHONE_E164\"}"
```

Expected: HTTP `200`, `success: true`, `status: "sent"`.

### B) Verify OTP (approved)

```bash
curl -i -X POST "$SUPABASE_URL/functions/v1/verify-otp" \
  -H "Content-Type: application/json" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -d "{\"phone\":\"$PHONE_E164\",\"otp\":\"<CODE_FROM_SMS>\"}"
```

Expected: HTTP `200`, `approved: true`.

### C) Verify OTP (rejected)

```bash
curl -i -X POST "$SUPABASE_URL/functions/v1/verify-otp" \
  -H "Content-Type: application/json" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -d "{\"phone\":\"$PHONE_E164\",\"otp\":\"000000\"}"
```

Expected: HTTP `401`, `error_code: "OTP_REJECTED"`.

### D) Verify OTP (expired)

Wait until OTP expires, then:

```bash
curl -i -X POST "$SUPABASE_URL/functions/v1/verify-otp" \
  -H "Content-Type: application/json" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -d "{\"phone\":\"$PHONE_E164\",\"otp\":\"<EXPIRED_CODE>\"}"
```

Expected: HTTP `410`, `error_code: "OTP_EXPIRED"`.

## Security notes

- No secrets are hardcoded.
- No Authorization header values are logged.
- No full phone numbers are logged; masked phone only.
- No OTP values are logged.
