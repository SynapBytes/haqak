/**
 * CORS header builder scoped to a single allowed origin.
 *
 * Set the ALLOWED_ORIGIN edge-function secret to the frontend origin
 * (e.g. "https://haqak.org").  Falls back to that value when the env var
 * is absent.  For local development add ALLOWED_ORIGIN=http://localhost:5173
 * to the edge-function environment.
 *
 * The wildcard "*" is intentionally avoided: it allows any page to make
 * credentialed cross-origin requests, which is unsafe for admin endpoints.
 */
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "https://haqak.org";

const BASE_HEADERS = "authorization, x-client-info, apikey, content-type";

const EXTENDED_HEADERS =
  `${BASE_HEADERS}, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version`;

/**
 * Return CORS response headers for the given request origin.
 *
 * @param requestOrigin - Value of the incoming `Origin` header (may be null).
 * @param extended      - When true, also allow Supabase client-info headers.
 */
export function buildCorsHeaders(
  requestOrigin: string | null,
  extended = false,
): Record<string, string> {
  const origin =
    requestOrigin && requestOrigin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : "";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": extended ? EXTENDED_HEADERS : BASE_HEADERS,
    "Vary": "Origin",
  };
}
