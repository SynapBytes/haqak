import { describe, expect, it } from "vitest";
import { normalizeIssueCategory } from "@/lib/issueCategories";

describe("issue category normalization", () => {
  it("normalizes Arabic legacy categories to stable keys", () => {
    expect(normalizeIssueCategory("مياه")).toBe("water");
    expect(normalizeIssueCategory("طرق")).toBe("roads");
    expect(normalizeIssueCategory("مرافق عامة")).toBe("public_facilities");
  });

  it("keeps stable keys unchanged", () => {
    expect(normalizeIssueCategory("water")).toBe("water");
    expect(normalizeIssueCategory("other")).toBe("other");
  });

  it("falls back to other for unknown or empty values", () => {
    expect(normalizeIssueCategory("")).toBe("other");
    expect(normalizeIssueCategory("unknown-value")).toBe("other");
    expect(normalizeIssueCategory(null)).toBe("other");
  });
});
