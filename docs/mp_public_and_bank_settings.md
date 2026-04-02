# MP Public Data, AI Usage, and Bank Verification

## Public vs Private Data Boundaries

### Publicly visible (authenticated users)
- MP display name (`profiles.full_name` through `mp_public_profiles`)
- MP avatar (`profiles.avatar_url`)
- MP non-sensitive location data (`center`, `center_id`, `governorate`, `district`, `constituency`, `electoral_district`)
- MP public posts/projects (`mp_public_posts`) with `visibility = 'public'`
- Aggregated stats on MP profile pages (counts/rates from issues, without exposing citizen identities)

### Never public
- MP bank account details (`mp_bank_accounts`)
- Any citizen-identifying data in MP public profile pages
- AI secrets/tokens

## AI Refinement Usage (MP Public Posts)

- AI refinement is done server-side only through Edge Function `refine-mp-post`.
- The client never receives or stores provider API keys.
- The function enforces:
  - Authenticated request
  - CSRF token
  - Rate limiting
  - Verified-MP gate
- Stored AI metadata (`ai_meta`) is limited to safe audit fields:
  - provider
  - model
  - timestamp
  - short note
  - availability flag

## Bank Verification Process

1. MP enters bank details in MP settings.
2. Data is written to `mp_bank_accounts` with `status = pending_verification`.
3. Only admin can access all bank accounts and decide verification.
4. Admin approves or rejects with reason.
5. Decision fields are recorded:
   - `status`
   - `verified_by`
   - `verified_at`
   - `rejection_reason`

## Access Control Summary

- MPs can read only their own bank row.
- MPs can insert/update only their own bank row and only when verified.
- Admins can read/update all bank rows.
- Citizens and other MPs cannot access another MP’s bank details.

## Audit Logging

- Bank account submit/update/verify/reject events are audited.
- Sensitive values are masked in audit payloads (account/IBAN/SWIFT).
