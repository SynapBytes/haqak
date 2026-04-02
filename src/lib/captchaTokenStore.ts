/**
 * captchaTokenStore.ts
 *
 * Client-side CAPTCHA token store that enforces:
 * 1. A 5-minute time-to-live (TTL) on each token.
 * 2. Single-use semantics — once a token has been consumed it cannot be reused.
 *
 * Note: This is a defence-in-depth helper.  The authoritative single-use and
 * TTL enforcement lives in the `verify-captcha` Edge Function.
 */

const TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface StoredToken {
  token: string;
  issuedAt: number; // Date.now() value
  consumed: boolean;
}

let _store: StoredToken | null = null;

/**
 * Record a freshly issued Turnstile token.
 * Any previously stored token is discarded.
 */
export function storeToken(token: string): void {
  _store = { token, issuedAt: Date.now(), consumed: false };
}

/**
 * Return `true` when a stored token is present, not yet consumed, and still
 * within the 5-minute TTL window.
 */
export function isTokenValid(): boolean {
  if (!_store || _store.consumed) return false;
  return Date.now() - _store.issuedAt < TOKEN_TTL_MS;
}

/**
 * Mark the current token as consumed so it cannot be reused on the client.
 */
export function consumeToken(): void {
  if (_store) _store.consumed = true;
}

/**
 * Return the stored token string, or `null` if none / expired / consumed.
 */
export function getToken(): string | null {
  return isTokenValid() ? _store!.token : null;
}

/**
 * Clear any stored token (e.g. on form reset or logout).
 */
export function clearToken(): void {
  _store = null;
}

/**
 * Return the age of the stored token in milliseconds, or `null` if there is
 * no valid token.
 */
export function getTokenAge(): number | null {
  if (!_store || _store.consumed) return null;
  const age = Date.now() - _store.issuedAt;
  if (age >= TOKEN_TTL_MS) return null;
  return age;
}
