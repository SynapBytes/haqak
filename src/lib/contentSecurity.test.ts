import { describe, expect, it } from "vitest";
import { censorText, detectOffensiveContent, filterContent, getContentReport } from "@/lib/contentSecurity";

describe("contentSecurity", () => {
  it("detects basic spacing bypass in offensive words", () => {
    expect(detectOffensiveContent("هذا النص فيه ك س")).toBeGreaterThan(0);
    expect(detectOffensiveContent("this contains f u c k")).toBeGreaterThan(0);
  });

  it("does not expose raw offensive words in report payload", () => {
    const result = filterContent("title", "this contains fuck");
    expect(typeof result.offensiveMatches).toBe("number");

    const report = getContentReport("title", "this contains fuck").join(" ");
    expect(report).not.toContain("fuck");
  });

  it("censors offensive terms", () => {
    expect(censorText("fuck")).toContain("***");
    expect(censorText("f u c k")).toContain("***");
  });
});
