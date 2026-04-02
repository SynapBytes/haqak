import { describe, expect, it } from "vitest";
import {
  normalizeClassifyIssueResponse,
  parseCaptchaResponse,
  safeParseAttachmentRows,
  safeParseIdentityVerificationRows,
} from "@/lib/boundaryAdapters";

describe("boundary adapters", () => {
  it("captcha adapter accepts { valid }", () => {
    const result = parseCaptchaResponse({ valid: true });
    expect(result.valid).toBe(true);
  });

  it("captcha adapter accepts { success }", () => {
    const result = parseCaptchaResponse({ success: true });
    expect(result.valid).toBe(true);
  });

  it("classify normalize fallback is safe when parse fails", () => {
    const fallback = normalizeClassifyIssueResponse(
      { status: "unsupported" },
      {
        title: "title",
        description: "description",
        category: "roads",
        issueType: "individual",
        aiSummary: null,
        priority: "normal",
      },
    );

    expect(fallback.usedFallback).toBe(true);
    expect(fallback.rejected).toBe(false);
    expect(fallback.title).toBe("title");
    expect(fallback.description).toBe("description");
    expect(fallback.category).toBe("roads");
    expect(fallback.issueType).toBe("individual");
    expect(fallback.priority).toBe("normal");
  });

  it("attachment row parser returns failure for invalid rows", () => {
    const result = safeParseAttachmentRows([{ id: "not-uuid" }]);
    expect(result.success).toBe(false);
  });

  it("identity verification parser returns failure for invalid rows", () => {
    const result = safeParseIdentityVerificationRows([{ id: "not-uuid" }]);
    expect(result.success).toBe(false);
  });
});
