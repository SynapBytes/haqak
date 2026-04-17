import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Sprint 1 security regressions", () => {
  it("MP public profile page must query the public-safe MP view, not raw profiles", () => {
    const source = fs.readFileSync("src/pages/MPProfilePage.tsx", "utf8");
    expect(source).toContain('.from("mp_public_profiles")');
    expect(source).not.toContain('.from("profiles").select("user_id, full_name, avatar_url, constituency, governorate, center")');
  });
});

describe("Location gating – CenterOnboarding", () => {
  const source = fs.readFileSync("src/pages/CenterOnboarding.tsx", "utf8");

  it("fetches governorate_ar and district_ar from the centers table", () => {
    expect(source).toContain("governorate_ar");
    expect(source).toContain("district_ar");
  });

  it("citizen navigates to /citizen (not /mps) after saving center", () => {
    // The post-save navigation must route citizens to /citizen, not /mps.
    expect(source).not.toContain('"/mps"');
    expect(source).toContain('"/citizen"');
  });

  it("district dropdown is disabled until a governorate is selected", () => {
    // The Select for the district must carry a disabled={!governorate} prop.
    expect(source).toContain("disabled={!governorate}");
  });

  it("continue button is disabled until both governorate and center are selected", () => {
    expect(source).toContain("!governorate || !centerId");
  });
});

describe("Location gating – route guard in App", () => {
  const source = fs.readFileSync("src/App.tsx", "utf8");

  it("ProtectedRoute redirects to /onboarding/center when center_id is missing", () => {
    expect(source).toContain("/onboarding/center");
    expect(source).toContain("!profile?.center_id");
  });

  it("/onboarding/center route uses allowMissingCenter so it is accessible pre-onboarding", () => {
    expect(source).toContain('allowMissingCenter><CenterOnboarding');
  });
});

describe("Egypt centers seed data", () => {
  it("centers-seed-placeholder.json contains all 268 Egyptian districts", () => {
    const seedPath = path.resolve(__dirname, "../../src/data/centers-seed-placeholder.json");
    const seed = JSON.parse(fs.readFileSync(seedPath, "utf8")) as unknown[];
    expect(seed.length).toBe(268);
  });

  it("every seed entry has required fields: code, name_ar, name_en, governorate_ar, governorate_en", () => {
    const seedPath = path.resolve(__dirname, "../../src/data/centers-seed-placeholder.json");
    const seed = JSON.parse(fs.readFileSync(seedPath, "utf8")) as Record<string, string>[];
    for (const entry of seed) {
      expect(entry.code).toBeTruthy();
      expect(entry.name_ar).toBeTruthy();
      expect(entry.name_en).toBeTruthy();
      expect(entry.governorate_ar).toBeTruthy();
      expect(entry.governorate_en).toBeTruthy();
    }
  });

  it("migration file for missing Sohag Monsha'a district exists", () => {
    const migPath = path.resolve(
      __dirname,
      "../../supabase/migrations/20260417000000_add_missing_sohag_monshaa_district.sql",
    );
    expect(fs.existsSync(migPath)).toBe(true);
    const sql = fs.readFileSync(migPath, "utf8");
    expect(sql).toContain("Monsha");
    expect(sql).toContain("سوهاج");
  });
});

