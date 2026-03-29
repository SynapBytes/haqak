/**
 * rateLimiter.ts
 *
 * Client-side in-memory rate limiter.
 *
 * Provides a lightweight token-bucket / sliding-window rate limiter for use
 * in the browser.  This is a defence-in-depth measure; the authoritative rate
 * limit enforcement lives in the `verify-captcha` Edge Function (server-side,
 * backed by the `rate_limit_logs` DB table).
 *
 * Usage:
 * ```ts
 * const limiter = createRateLimiter({ maxAttempts: 5, windowMs: 60_000 });
 * if (!limiter.tryConsume("captcha-verify")) {
 *   toast.error("Too many attempts. Please wait.");
 * }
 * ```
 */

export interface RateLimiterOptions {
  /** Maximum number of allowed attempts within `windowMs`. */
  maxAttempts: number;
  /** Sliding-window duration in milliseconds. */
  windowMs: number;
}

export interface RateLimiter {
  /**
   * Attempt to consume one slot for `key`.
   * Returns `true` if the action is allowed, `false` if the limit is exceeded.
   */
  tryConsume(key: string): boolean;
  /**
   * Return the number of remaining allowed attempts for `key` in the current
   * window, without consuming a slot.
   */
  remaining(key: string): number;
  /**
   * Return the timestamp (ms since epoch) when the oldest recorded attempt for
   * `key` will fall outside the window, or `null` if no attempts have been made.
   */
  resetAt(key: string): number | null;
  /** Remove all recorded attempts for `key`. */
  reset(key: string): void;
  /** Remove all recorded attempts for all keys. */
  resetAll(): void;
}

/**
 * Create a new in-memory sliding-window rate limiter.
 */
export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const { maxAttempts, windowMs } = options;

  // Map from key → sorted list of attempt timestamps (ms)
  const store = new Map<string, number[]>();

  /** Prune timestamps outside the current window for `key`. */
  function prune(key: string): number[] {
    const now = Date.now();
    const cutoff = now - windowMs;
    const existing = store.get(key) ?? [];
    const pruned = existing.filter((t) => t > cutoff);
    // Only update the store when entries were actually removed
    if (pruned.length !== existing.length) {
      store.set(key, pruned);
    }
    return pruned;
  }

  return {
    tryConsume(key: string): boolean {
      const timestamps = prune(key);
      if (timestamps.length >= maxAttempts) return false;
      timestamps.push(Date.now());
      store.set(key, timestamps);
      return true;
    },

    remaining(key: string): number {
      const timestamps = prune(key);
      return Math.max(0, maxAttempts - timestamps.length);
    },

    resetAt(key: string): number | null {
      const timestamps = prune(key);
      if (timestamps.length === 0) return null;
      return timestamps[0] + windowMs;
    },

    reset(key: string): void {
      store.delete(key);
    },

    resetAll(): void {
      store.clear();
    },
  };
}

/**
 * A shared default rate limiter pre-configured for CAPTCHA verification:
 * 5 attempts per 60 seconds.
 */
export const captchaRateLimiter = createRateLimiter({
  maxAttempts: 5,
  windowMs: 60_000,
});
