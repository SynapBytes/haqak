/**
 * csrfToken.ts
 *
 * Lightweight CSRF protection for SPA form submissions.
 *
 * How it works:
 * - A cryptographically random token is generated once per browser session and
 *   stored in `sessionStorage`.
 * - The token is included as the `X-CSRF-Token` request header on every
 *   mutating API call.
 * - The Edge Function verifies the header is present and non-empty.  Because
 *   the browser's same-origin policy prevents cross-origin pages from setting
 *   custom headers, this is sufficient CSRF protection for a Bearer-JWT API.
 *
 * Note: The `classify-issue` Edge Function already requires a valid JWT (Bearer
 * token), which provides primary protection. This module adds defence-in-depth.
 */

const SESSION_KEY = "csrf_token";

/**
 * Generate a cryptographically random hex token of the requested byte length.
 */
export function generateToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Return the CSRF token for the current browser session, creating one if it
 * does not yet exist.
 */
export function getOrCreateToken(): string {
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const token = generateToken();
  sessionStorage.setItem(SESSION_KEY, token);
  return token;
}

/**
 * Explicitly rotate the CSRF token (e.g. after a successful form submission or
 * on user logout).
 */
export function rotateToken(): string {
  const token = generateToken();
  sessionStorage.setItem(SESSION_KEY, token);
  return token;
}

/**
 * Remove the CSRF token from storage (call on logout).
 */
export function clearCsrfToken(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

/**
 * Return the header name used to transmit the CSRF token.
 */
export const CSRF_HEADER = "X-CSRF-Token" as const;
