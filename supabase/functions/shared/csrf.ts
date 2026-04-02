/**
 * CSRF token validation helper.
 *
 * The browser's same-origin policy prevents cross-origin pages from setting
 * custom request headers on fetch/XHR requests, so the presence of a
 * non-empty `X-CSRF-Token` header proves the request originates from
 * the same (or explicitly CORS-allowed) origin.
 *
 * This provides defense-in-depth on top of Bearer JWT authentication for
 * state-mutating edge functions.
 *
 * Returns a 403 Response when the token is missing or blank; null otherwise.
 */
export function requireCsrfToken(
  req: Request,
  corsHeaders: Record<string, string>,
): Response | null {
  const token = req.headers.get("X-CSRF-Token");
  if (!token || token.trim() === "") {
    return new Response(
      JSON.stringify({ error: "Forbidden: missing CSRF token" }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
  return null;
}
