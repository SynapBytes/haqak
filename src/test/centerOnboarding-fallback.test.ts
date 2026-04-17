/**
 * Tests for the CenterOnboarding local fallback mechanism and the
 * egyptCentersData module.
 *
 * These tests cover:
 * - Local dataset integrity (governorate count, district count, required fields)
 * - Cascading select behaviour (districts filtered by governorate)
 * - Fallback code paths in CenterOnboarding.tsx (static source analysis)
 * - Validation of inconsistent governorate/district input
 */

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { LOCAL_CENTERS, LOCAL_GOVERNORATES } from "@/data/egyptCentersData";

// ---------------------------------------------------------------------------
// Local dataset integrity
// ---------------------------------------------------------------------------

describe("egyptCentersData — dataset integrity", () => {
  it("exports exactly 268 centers", () => {
    expect(LOCAL_CENTERS).toHaveLength(268);
  });

  it("exports exactly 27 unique governorates", () => {
    expect(LOCAL_GOVERNORATES).toHaveLength(27);
  });

  it("every center has the four required Arabic/English fields", () => {
    for (const c of LOCAL_CENTERS) {
      expect(c.governorate_en, `missing governorate_en`).toBeTruthy();
      expect(c.governorate_ar, `missing governorate_ar for ${c.governorate_en}`).toBeTruthy();
      expect(c.district_en, `missing district_en in ${c.governorate_en}`).toBeTruthy();
      expect(c.district_ar, `missing district_ar for ${c.district_en}`).toBeTruthy();
    }
  });

  it("every governorate in LOCAL_CENTERS has a corresponding entry in LOCAL_GOVERNORATES", () => {
    const govSet = new Set(LOCAL_GOVERNORATES.map((g) => g.en));
    for (const c of LOCAL_CENTERS) {
      expect(govSet.has(c.governorate_en), `${c.governorate_en} missing from LOCAL_GOVERNORATES`).toBe(true);
    }
  });

  it("Sohag includes the Monsha'a district (added in migration 20260417)", () => {
    const monshaa = LOCAL_CENTERS.find(
      (c) => c.governorate_en === "Sohag" && c.district_en === "Monsha'a",
    );
    expect(monshaa).toBeDefined();
    expect(monshaa?.district_ar).toBe("المنشأة");
  });

  it("district codes are unique within each governorate", () => {
    const seen = new Map<string, string>();
    for (const c of LOCAL_CENTERS) {
      const key = `${c.governorate_en}::${c.district_en}`;
      expect(
        seen.has(key),
        `Duplicate district: ${key} — first seen for ${seen.get(key)}`,
      ).toBe(false);
      seen.set(key, c.district_ar);
    }
  });
});

// ---------------------------------------------------------------------------
// Cascading select logic (data-layer)
// ---------------------------------------------------------------------------

describe("egyptCentersData — cascading (district filtered by governorate)", () => {
  it("filtering LOCAL_CENTERS by Cairo returns only Cairo districts", () => {
    const cairo = LOCAL_CENTERS.filter((c) => c.governorate_en === "Cairo");
    expect(cairo.length).toBeGreaterThan(0);
    for (const c of cairo) {
      expect(c.governorate_en).toBe("Cairo");
    }
  });

  it("filtering LOCAL_CENTERS by Giza returns only Giza districts", () => {
    const giza = LOCAL_CENTERS.filter((c) => c.governorate_en === "Giza");
    expect(giza.length).toBeGreaterThan(0);
    for (const c of giza) {
      expect(c.governorate_en).toBe("Giza");
    }
  });

  it("no center belongs to more than one governorate", () => {
    for (const c of LOCAL_CENTERS) {
      const matchingGov = LOCAL_GOVERNORATES.filter((g) => g.en === c.governorate_en);
      expect(matchingGov).toHaveLength(1);
    }
  });
});

// ---------------------------------------------------------------------------
// Validation: inconsistent governorate/district pairs
// ---------------------------------------------------------------------------

describe("egyptCentersData — cross-validation", () => {
  it("a district name from Cairo is NOT found under Giza", () => {
    const cairoCenters = LOCAL_CENTERS.filter((c) => c.governorate_en === "Cairo");
    const cairoDist = cairoCenters[0].district_en;
    const wrongGovMatch = LOCAL_CENTERS.find(
      (c) => c.governorate_en === "Giza" && c.district_en === cairoDist,
    );
    // There is no Cairo district in Giza — a server-side lookup for
    // { governorate_en: "Giza", district_en: cairoDist } would return null.
    expect(wrongGovMatch).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Static source analysis — CenterOnboarding fallback code paths
// ---------------------------------------------------------------------------

describe("CenterOnboarding.tsx — fallback and validation code paths", () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "../../src/pages/CenterOnboarding.tsx"),
    "utf8",
  );

  it("imports LOCAL_CENTERS from the egyptCentersData module", () => {
    expect(source).toContain("LOCAL_CENTERS");
    expect(source).toContain("egyptCentersData");
  });

  it("has usingFallback state for tracking local-data mode", () => {
    expect(source).toContain("usingFallback");
  });

  it("activates fallback when Supabase returns an error", () => {
    // Branch: error || !data?.length → setUsingFallback(true)
    expect(source).toContain("setUsingFallback(true)");
    expect(source).toContain("FALLBACK_CENTERS");
  });

  it("activates fallback when Supabase returns an empty result set", () => {
    // Covers the !data?.length case (table not seeded / migration not applied)
    expect(source).toContain("!data?.length");
  });

  it("district dropdown is disabled until a governorate is selected", () => {
    expect(source).toContain("disabled={!governorate}");
  });

  it("continue button is disabled until both governorate and center are selected", () => {
    expect(source).toContain("!governorate || !centerId");
  });

  it("resolves UUID via a secondary Supabase query in fallback-save mode", () => {
    expect(source).toContain("maybeSingle");
    expect(source).toContain('.eq("governorate_en", governorate)');
    expect(source).toContain('.eq("district_en", centerId)');
  });

  it("validates that the selected center belongs to the selected governorate before saving", () => {
    expect(source).toContain("isConsistent");
    expect(source).toContain("filteredCenters.some");
  });
});
