# Sprint 1 Technical Design — Centers & Onboarding

## Scope
- Canonical Egypt center scoping with governorate + district (+ optional electoral district).
- Source of truth for center data is `src/data/egypt-geo-complete.json`.
- Onboarding uses structured governorate/district selection and persists canonical `center_id`.
- Public MP browsing remains safe and exposes only approved MP public fields.
- Admin dashboard gets center-level user distribution counts.

## Data Model
- New table: `public.centers`
  - `id` (uuid PK)
  - `governorate_en`, `governorate_ar`
  - `district_en`, `district_ar`
  - `electoral_district_en`, `electoral_district_ar` (nullable)
  - `electoral_seats` (nullable, positive)
  - unique `(governorate_en, district_en)`
- Profile canonical FK:
  - add `profiles.center_id -> centers.id`
  - keep compatibility fields: `governorate`, `district`, `center`, `constituency`, `electoral_district`

## Migration Strategy
- Seed `centers` directly from `src/data/egypt-geo-complete.json` (no invented lists).
- Add resolver and sync trigger:
  - `resolve_center_id(governorate, district)` resolves canonical center.
  - `sync_profile_center_fields()` enforces consistency between `center_id` and text fields.
- Backfill existing profiles to set `center_id` from existing governorate/center data when possible.
- Update `handle_new_user()` to store location fields + resolve `center_id` at signup.
- Recreate `mp_public_profiles` view with additional safe location columns.

## RLS & Privacy
- `centers`: read-only for anon/authenticated, full management only for `service_role`.
- Existing profile RLS remains in effect; no new policy to expose citizens publicly.
- MP browsing continues to use `mp_public_profiles` only (approved MPs only).

## UI & Routing
- Auth signup:
  - citizens must select governorate + district.
  - MPs keep governorate + district + electoral district + membership number.
- MP profile page reads from `mp_public_profiles` (not base `profiles`).
- Admin dashboard:
  - aggregates and shows center/district-level counts for citizens and MPs.

## Out of Scope
- Identity verification queue and private ID storage.
- Unified multi-channel notification pipeline (in-app + SMS + email).
- Polls, announcements, events, re-nomination, projects/donations workflows beyond Sprint 1.
