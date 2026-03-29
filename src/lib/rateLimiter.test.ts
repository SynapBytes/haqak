import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captchaRateLimiter, createRateLimiter } from "./rateLimiter";

afterEach(() => {
  vi.useRealTimers();
});

// ── createRateLimiter ──────────────────────────────────────────────────────────

describe("createRateLimiter", () => {
  it("allows attempts up to the max limit", () => {
    const limiter = createRateLimiter({ maxAttempts: 3, windowMs: 60_000 });
    expect(limiter.tryConsume("user-1")).toBe(true);
    expect(limiter.tryConsume("user-1")).toBe(true);
    expect(limiter.tryConsume("user-1")).toBe(true);
  });

  it("rejects the attempt that exceeds the limit", () => {
    const limiter = createRateLimiter({ maxAttempts: 3, windowMs: 60_000 });
    limiter.tryConsume("user-2");
    limiter.tryConsume("user-2");
    limiter.tryConsume("user-2");
    expect(limiter.tryConsume("user-2")).toBe(false);
  });

  it("reports correct remaining count", () => {
    const limiter = createRateLimiter({ maxAttempts: 5, windowMs: 60_000 });
    expect(limiter.remaining("user-3")).toBe(5);
    limiter.tryConsume("user-3");
    expect(limiter.remaining("user-3")).toBe(4);
    limiter.tryConsume("user-3");
    expect(limiter.remaining("user-3")).toBe(3);
  });

  it("allows attempts again after the window expires", () => {
    vi.useFakeTimers();
    const limiter = createRateLimiter({ maxAttempts: 2, windowMs: 60_000 });
    limiter.tryConsume("user-4");
    limiter.tryConsume("user-4");
    expect(limiter.tryConsume("user-4")).toBe(false);

    // Advance past the window
    vi.advanceTimersByTime(60_001);
    expect(limiter.tryConsume("user-4")).toBe(true);
  });

  it("reset() clears state for a specific key", () => {
    const limiter = createRateLimiter({ maxAttempts: 1, windowMs: 60_000 });
    limiter.tryConsume("user-5");
    expect(limiter.tryConsume("user-5")).toBe(false);
    limiter.reset("user-5");
    expect(limiter.tryConsume("user-5")).toBe(true);
  });

  it("resetAll() clears all keys", () => {
    const limiter = createRateLimiter({ maxAttempts: 1, windowMs: 60_000 });
    limiter.tryConsume("a");
    limiter.tryConsume("b");
    limiter.resetAll();
    expect(limiter.tryConsume("a")).toBe(true);
    expect(limiter.tryConsume("b")).toBe(true);
  });

  it("resetAt() returns null when no attempts made", () => {
    const limiter = createRateLimiter({ maxAttempts: 5, windowMs: 60_000 });
    expect(limiter.resetAt("fresh-key")).toBeNull();
  });

  it("resetAt() returns a future timestamp after first attempt", () => {
    vi.useFakeTimers();
    const now = Date.now();
    const limiter = createRateLimiter({ maxAttempts: 5, windowMs: 60_000 });
    limiter.tryConsume("ts-key");
    const reset = limiter.resetAt("ts-key");
    expect(reset).toBe(now + 60_000);
  });

  it("isolates limits between different keys", () => {
    const limiter = createRateLimiter({ maxAttempts: 1, windowMs: 60_000 });
    limiter.tryConsume("alpha");
    expect(limiter.tryConsume("alpha")).toBe(false);
    // Different key should still have full quota
    expect(limiter.tryConsume("beta")).toBe(true);
  });
});

// ── captchaRateLimiter default export ──────────────────────────────────────────

describe("captchaRateLimiter (default, 5 / 60 s)", () => {
  beforeEach(() => captchaRateLimiter.resetAll());

  it("allows exactly 5 attempts", () => {
    for (let i = 0; i < 5; i++) {
      expect(captchaRateLimiter.tryConsume("ip-1")).toBe(true);
    }
  });

  it("blocks the 6th attempt", () => {
    for (let i = 0; i < 5; i++) captchaRateLimiter.tryConsume("ip-2");
    expect(captchaRateLimiter.tryConsume("ip-2")).toBe(false);
  });
});
