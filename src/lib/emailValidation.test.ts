import { describe, expect, it } from "vitest";
import { isValidEmail, normalizeEmail } from "./emailValidation";

describe("emailValidation", () => {
  it("normalizes email by trimming and lowercasing", () => {
    expect(normalizeEmail("  User.Name+Tag@Example.COM ")).toBe("user.name+tag@example.com");
  });

  it("accepts valid email formats", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("user.name+tag@example.co.uk")).toBe(true);
  });

  it("rejects invalid email formats", () => {
    expect(isValidEmail("invalid-email")).toBe(false);
    expect(isValidEmail("user@localhost")).toBe(false);
    expect(isValidEmail("user@.com")).toBe(false);
  });
});
