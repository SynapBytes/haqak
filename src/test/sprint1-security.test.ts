import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("Sprint 1 security regressions", () => {
  it("MP public profile page must query the public-safe MP view, not raw profiles", () => {
    const source = fs.readFileSync("src/pages/MPProfilePage.tsx", "utf8");
    expect(source).toContain('.from("mp_public_profiles")');
    expect(source).not.toContain('.from("profiles").select("user_id, full_name, avatar_url, constituency, governorate, center")');
  });
});

