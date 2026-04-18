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

describe("get_center_members RPC – security contract", () => {
  const migSql = fs.readFileSync(
    "supabase/migrations/20260418200000_get_center_members_rpc.sql",
    "utf8",
  );

  it("migration file exists and is non-empty", () => {
    expect(migSql.length).toBeGreaterThan(0);
  });

  it("function is SECURITY DEFINER so clients cannot bypass RLS", () => {
    expect(migSql).toContain("SECURITY DEFINER");
  });

  it("center_id is resolved server-side from auth.uid() – no client-supplied center", () => {
    // The function must look up center_id from the profiles table using
    // auth.uid(), never accepting a center UUID as a parameter.
    expect(migSql).toContain("auth.uid()");
    expect(migSql).toContain("profiles");
    // No centerId / center_id parameter in the function signature
    expect(migSql).not.toMatch(/FUNCTION\s+public\.get_center_members\s*\([^)]*center_id/i);
  });

  it("hard per-page cap of 50 rows prevents bulk data exfiltration", () => {
    expect(migSql).toContain("LEAST(p_limit, 50)");
  });

  it("caller is excluded from their own center member list", () => {
    // The WHERE clause must exclude the calling user.
    expect(migSql).toContain("auth.uid()");
    expect(migSql).toContain("<> auth.uid()");
  });

  it("GRANT is restricted to authenticated role only", () => {
    expect(migSql).toContain("TO authenticated");
    expect(migSql).toContain("REVOKE ALL");
  });
});

describe("CenterMembersList component – security properties", () => {
  const source = fs.readFileSync("src/components/CenterMembersList.tsx", "utf8");

  it("calls get_center_members RPC (not a raw profiles query)", () => {
    expect(source).toContain('rpc("get_center_members"');
  });

  it("does not pass a center_id parameter from the client to the RPC", () => {
    // Verify the only parameters passed are pagination (p_limit, p_offset)
    // and NOT a caller-supplied center_id.
    expect(source).not.toContain("center_id:");
  });

  it("does not render sensitive fields (phone, national_id)", () => {
    expect(source).not.toContain("national_id");
    // "phone" must not appear as a field name rendered in the template
    expect(source).not.toContain("{member.phone}");
    expect(source).not.toContain("{member.email}");
  });
});

describe("Auth page – already-authenticated redirect", () => {
  const source = fs.readFileSync("src/pages/Auth.tsx", "utf8");

  it("redirects already-authenticated users away from /auth on mount", () => {
    // The useEffect that calls getSession() and navigates must be present.
    expect(source).toContain("getSession");
    expect(source).toContain("getRoleRedirect");
  });

  it("getRoleRedirect is a module-level function (not duplicated inside component)", () => {
    // Count occurrences of the function declaration.
    const matches = source.match(/function getRoleRedirect/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(1);
  });

  it("post-signup auto-redirects when Supabase returns a session immediately", () => {
    // When email confirmation is disabled, signUp returns a session.
    // The Auth page should detect signupData.session and navigate directly.
    expect(source).toContain("signupData.session");
  });
});
