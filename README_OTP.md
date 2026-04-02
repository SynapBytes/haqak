# OTP Backend (Vercel Serverless Functions)

This implementation adds Twilio Verify OTP endpoints under `/api/otp` using Node.js + TypeScript.

## Endpoints

- `POST /api/otp/send`
  - Body:
    ```json
    { "phone": "+201012345678" }
    ```
  - Sends OTP SMS using Twilio Verify.

- `POST /api/otp/verify`
  - Body:
    ```json
    { "phone": "+201012345678", "code": "123456" }
    ```
  - Verifies OTP code using Twilio Verify.

## Security controls

- Strict E.164 validation for phone input.
- CORS allowlist from `ALLOWED_ORIGINS` (comma-separated origins).
- Lightweight in-memory rate limiting per-IP and per-phone for each endpoint.
- No OTP code storage in application code (delegated to Twilio Verify).

## Required environment variables

Only the following variables are used by these functions:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_VERIFY_SERVICE_SID`
- `ALLOWED_ORIGINS`

## Notes

- In-memory rate limits are best-effort in serverless and may reset across cold starts or instances.
- Configure `ALLOWED_ORIGINS` as exact origins, e.g.:
  - `https://haqak.app,https://www.haqak.app`
- For strict cross-instance throttling, replace in-memory buckets with a shared store (e.g. Redis/Upstash).
