import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearToken,
  consumeToken,
  getToken,
  getTokenAge,
  isTokenValid,
  storeToken,
} from "./captchaTokenStore";

afterEach(() => {
  clearToken();
  vi.useRealTimers();
});

describe("captchaTokenStore", () => {
  it("returns null when no token has been stored", () => {
    expect(getToken()).toBeNull();
    expect(isTokenValid()).toBe(false);
  });

  it("stores and returns a valid token", () => {
    storeToken("tok-abc");
    expect(getToken()).toBe("tok-abc");
    expect(isTokenValid()).toBe(true);
  });

  it("reports token age in milliseconds", () => {
    vi.useFakeTimers();
    storeToken("tok-age");
    vi.advanceTimersByTime(30_000); // 30 seconds
    const age = getTokenAge();
    expect(age).toBeGreaterThanOrEqual(30_000);
  });

  it("rejects a token older than 5 minutes", () => {
    vi.useFakeTimers();
    storeToken("tok-old");
    vi.advanceTimersByTime(5 * 60 * 1000 + 1); // 5 min + 1 ms
    expect(isTokenValid()).toBe(false);
    expect(getToken()).toBeNull();
    expect(getTokenAge()).toBeNull();
  });

  it("rejects a consumed token", () => {
    storeToken("tok-used");
    consumeToken();
    expect(isTokenValid()).toBe(false);
    expect(getToken()).toBeNull();
    expect(getTokenAge()).toBeNull();
  });

  it("replaces a previous token on new storeToken call", () => {
    storeToken("tok-first");
    storeToken("tok-second");
    expect(getToken()).toBe("tok-second");
  });

  it("clearToken removes any stored token", () => {
    storeToken("tok-clear");
    clearToken();
    expect(getToken()).toBeNull();
    expect(isTokenValid()).toBe(false);
  });
});
