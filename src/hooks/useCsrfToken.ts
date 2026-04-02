/**
 * useCsrfToken.ts
 *
 * React hook that provides a CSRF token for the current browser session and
 * a helper to rotate it after a successful submission.
 */

import { useCallback, useEffect, useState } from "react";
import { CSRF_HEADER, clearCsrfToken, getOrCreateToken, rotateToken } from "@/lib/csrfToken";

interface UseCsrfTokenResult {
  /** The current CSRF token string. */
  csrfToken: string;
  /** The header name to use (X-CSRF-Token). */
  csrfHeader: typeof CSRF_HEADER;
  /** Rotate the token (call after a successful form submission). */
  rotate: () => void;
  /** Clear the token (call on logout). */
  clear: () => void;
}

/**
 * Returns the session CSRF token and helpers to manage its lifecycle.
 *
 * @example
 * ```tsx
 * const { csrfToken, csrfHeader } = useCsrfToken();
 * // Pass as a custom header when invoking a Supabase Edge Function:
 * await supabase.functions.invoke("classify-issue", {
 *   body: { ... },
 *   headers: { [csrfHeader]: csrfToken },
 * });
 * ```
 */
export function useCsrfToken(): UseCsrfTokenResult {
  const [csrfToken, setCsrfToken] = useState<string>(() => getOrCreateToken());

  useEffect(() => {
    // Ensure the token exists in storage on mount (handles SSR or hydration gaps)
    setCsrfToken(getOrCreateToken());
  }, []);

  const rotate = useCallback(() => {
    setCsrfToken(rotateToken());
  }, []);

  const clear = useCallback(() => {
    clearCsrfToken();
    setCsrfToken("");
  }, []);

  return { csrfToken, csrfHeader: CSRF_HEADER, rotate, clear };
}
