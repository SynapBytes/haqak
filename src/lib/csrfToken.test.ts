import { afterEach, describe, expect, it } from "vitest";
import {
  CSRF_HEADER,
  clearCsrfToken,
  generateToken,
  getOrCreateToken,
  rotateToken,
} from "./csrfToken";

afterEach(() => {
  clearCsrfToken();
});

describe("csrfToken", () => {
  it("generateToken produces a hex string of the correct length", () => {
    const token = generateToken(32);
    expect(token).toHaveLength(64); // 32 bytes → 64 hex chars
    expect(/^[0-9a-f]+$/.test(token)).toBe(true);
  });

  it("generateToken produces unique tokens", () => {
    const t1 = generateToken();
    const t2 = generateToken();
    expect(t1).not.toBe(t2);
  });

  it("getOrCreateToken returns the same token on repeated calls", () => {
    const first = getOrCreateToken();
    const second = getOrCreateToken();
    expect(first).toBe(second);
  });

  it("rotateToken returns a new token different from the previous one", () => {
    const original = getOrCreateToken();
    const rotated = rotateToken();
    expect(rotated).not.toBe(original);
    // Subsequent getOrCreateToken should return the rotated value
    expect(getOrCreateToken()).toBe(rotated);
  });

  it("clearCsrfToken causes getOrCreateToken to generate a fresh token", () => {
    const before = getOrCreateToken();
    clearCsrfToken();
    const after = getOrCreateToken();
    // After clearing, a brand-new random token is generated
    expect(after).not.toBe(before);
  });

  it("CSRF_HEADER constant is correct", () => {
    expect(CSRF_HEADER).toBe("X-CSRF-Token");
  });
});
