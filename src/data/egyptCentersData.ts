/**
 * Egyptian governorates and their district centers — local fallback dataset.
 *
 * This module is the **local fallback** used by CenterOnboarding when the
 * Supabase `centers` table is unavailable (network error) or returns no rows
 * (migration not yet applied).  The canonical source of truth is always the
 * database; this file mirrors the sprint1 seed migration and the
 * `20260417000000_add_missing_sohag_monshaa_district.sql` patch.
 *
 * ## Maintenance guide
 * 1. Edit the relevant Supabase migration to add/rename a district.
 * 2. Mirror that change in `src/data/egypt-geo-complete.json`.
 * 3. Reflect it in `src/data/centers-seed-placeholder.json` as well (used by
 *    automated tests to assert the expected dataset size of 268 entries).
 * 4. This file is auto-derived from `egypt-geo-complete.json` at build time, so
 *    no manual edits are needed here unless the JSON structure changes.
 */

import geoComplete from "./egypt-geo-complete.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LocalCenter = {
  governorate_en: string;
  governorate_ar: string;
  district_en: string;
  district_ar: string;
};

export type LocalGovernorate = {
  en: string;
  ar: string;
};

// ---------------------------------------------------------------------------
// Internal shape of egypt-geo-complete.json
// ---------------------------------------------------------------------------

type GeoDistrict = { en: string; ar: string };
type GeoEntry = { name_ar: string; districts: GeoDistrict[] };
type GeoComplete = Record<string, GeoEntry>;

const geoData = geoComplete as GeoComplete;

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Flat list of all 268 Egyptian district centers derived from the local geo
 * dataset.  Each entry mirrors a row in the `public.centers` Supabase table
 * (without the `id` UUID, which only the live DB can provide).
 */
export const LOCAL_CENTERS: LocalCenter[] = Object.entries(geoData).flatMap(
  ([gov_en, gov]) =>
    gov.districts.map((d) => ({
      governorate_en: gov_en,
      governorate_ar: gov.name_ar,
      district_en: d.en,
      district_ar: d.ar,
    })),
);

/**
 * Unique governorates in display order (matches DB seed order).
 * Use this to populate the first dropdown without needing the database.
 */
export const LOCAL_GOVERNORATES: LocalGovernorate[] = Object.entries(
  geoData,
).map(([gov_en, gov]) => ({ en: gov_en, ar: gov.name_ar }));
