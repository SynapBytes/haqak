/**
 * CORS header builder scoped to a strict allowlist.
 *
 * Set ALLOWED_ORIGINS as comma-separated exact origins, e.g.
 *   https://haqak.org,https://www.haqak.org
 *
 * Wildcard "*" is intentionally avoided to prevent credentialed abuse from
 * untrusted origins on authenticated/admin endpoints.
 */
const ALLOWED_ORIGINS = new Set(
  (Deno.env.get("ALLOWED_ORIGINS") ?? "https://haqak.org,https://www.haqak.org")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

const ALLOWED_ORIGIN_REGEX_RAW = Deno.env.get("ALLOWED_ORIGIN_REGEX")?.trim() ?? "";
const ALLOWED_ORIGIN_REGEX = ALLOWED_ORIGIN_REGEX_RAW ? new RegExp(ALLOWED_ORIGIN_REGEX_RAW) : null;

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
  const origin = isAllowedOrigin(requestOrigin) ? requestOrigin ?? "" : "";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": extended ? EXTENDED_HEADERS : BASE_HEADERS,
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

export function isAllowedOrigin(requestOrigin: string | null): boolean {
  if (!requestOrigin) return false;
  return ALLOWED_ORIGINS.has(requestOrigin) || (ALLOWED_ORIGIN_REGEX?.test(requestOrigin) ?? false);
}
