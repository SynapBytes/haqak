# Sprint 1 Technical Design — Centers & Onboarding

## Scope
- Canonical Egypt center scoping with governorate + district (+ optional electoral district).
- `centers` includes legacy-compatible fields (`name_*`, `code`) while remaining canonical by district.
- Onboarding uses structured center selection and persists canonical `center_id`.
- Public MP browsing remains safe and exposes only approved MP public fields.
- Admin dashboard gets center-level user distribution counts, including verified subsets.

## Data Model
- `public.centers`
  - `id` (uuid PK)
  - `code` (unique, required)
  - `name_ar`, `name_en` (required)
  - `governorate_en`, `governorate_ar`
  - `district_en`, `district_ar`
  - `electoral_district_en`, `electoral_district_ar` (nullable)
  - `electoral_seats` (nullable, positive)
  - unique `(governorate_en, district_en)` and `code`
- Profile canonical FK:
  - add `profiles.center_id -> centers.id`
  - keep compatibility fields: `governorate`, `district`, `center`, `constituency`, `electoral_district`
  - add profile verification metadata:
    - `email`, `email_verified`, `phone_verified`
    - `verification_status` (`unverified|pending|verified|rejected`)
    - `verification_submitted_at`, `verification_decided_at`, `verification_decided_by`

## Migration Strategy
- Keep initial canonical district seed in SQL migration for backward compatibility.
- Add JSON import path for future full-list center refresh:
  - placeholder file: `src/data/centers-seed-placeholder.json`
  - helper function: `public.upsert_centers_from_json(jsonb)` (service role only).
- Add resolver and sync trigger:
  - `resolve_center_id(governorate, district)` resolves canonical center.
  - `sync_profile_center_fields()` enforces consistency between `center_id` and text fields.
- Backfill existing profiles to set `center_id` from existing governorate/center data when possible.
- Update `handle_new_user()`/backfill to store location fields + resolve `center_id`.
- Recreate `mp_public_profiles` view with additional safe location columns.

## RLS & Privacy
- `centers`: read-only for anon/authenticated, full management only for `service_role`.
- Profiles:
  - citizens cannot read other citizens.
  - MPs cannot read citizens directly.
  - authenticated MP browsing is restricted to approved MP rows only via view-scoped policy.
  - self profile updates cannot arbitrarily change `center_id` after first onboarding set, unless admin.
- MP browsing continues to use `mp_public_profiles` only (approved MPs only).

## UI & Routing
- Auth signup:
  - citizens must select governorate + district.
  - MPs keep governorate + district + electoral district + membership number.
- First-login center onboarding:
  - if logged-in citizen/MP has `profiles.center_id IS NULL`, force redirect to `/onboarding/center`.
- MP profile page reads from `mp_public_profiles` (not base `profiles`).
- MPs directory:
  - citizens see only approved MPs from their own center.
  - MPs see approved MPs globally with center filter.
- MP dashboard:
  - MPs see only aggregate citizen count in their center via RPC, not citizen listings.
- Admin dashboard:
  - aggregates and shows center/district-level counts for citizens/MPs and verified subsets.
  - supports filtering users by role and center.
  - includes verification requests stub list.

## Out of Scope
- Identity verification queue and private ID storage.
- Unified multi-channel notification pipeline (in-app + SMS + email).
- Polls, announcements, events, re-nomination, projects/donations workflows beyond Sprint 1.
