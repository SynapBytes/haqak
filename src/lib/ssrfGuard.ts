/**
 * SSRF-prevention utilities for validating user-supplied image URLs.
 *
 * Uses a strict hostname allowlist.  Patterns are loaded from the
 * ALLOWED_IMAGE_HOSTS environment variable (comma-separated) in the edge
 * runtime and passed explicitly in tests/client code so there is no
 * implicit global state.
 *
 * Supported patterns:
 *   - Exact hostname       e.g. "images.example.com"
 *   - Wildcard subdomain   e.g. "*.example.com"
 *     matches "example.com" and every subdomain
 *
 * Design notes:
 *   - Fails closed: empty pattern list → every host is rejected.
 *   - Only http: and https: protocols are permitted.
 *   - Decoded URL path segments are checked for ".." traversal.
 *   - Callers should use `redirect: "manual"` when fetching so that
 *     HTTP redirects cannot be used to bypass the allowlist.
 */

/**
 * Parse and validate a raw comma-separated host pattern string.
 * Invalid entries (containing schemes, ports, paths, or whitespace) are
 * silently discarded so a misconfigured entry cannot open a bypass.
 */
export function parseAllowedHostPatterns(raw: string): string[] {
  return raw
    .split(",")
    .map((h) => h.trim())
    .filter((h) => h.length > 0)
    .filter((h) => {
      // Disallow schemes, ports, paths, and whitespace in patterns.
      if (/[:/\s]/.test(h)) return false;
      if (h.startsWith("*.")) {
        const rest = h.slice(2);
        return rest.length > 0 && /^[A-Za-z0-9.-]+$/.test(rest);
      }
      return /^[A-Za-z0-9.-]+$/.test(h);
    });
}

/**
 * Return true if `hostname` matches at least one entry in `patterns`.
 * Returns false when `patterns` is empty (fail-closed).
 */
export function isHostAllowed(hostname: string, patterns: string[]): boolean {
  if (patterns.length === 0) return false;

  for (const pattern of patterns) {
    if (pattern.startsWith("*.")) {
      const suffix = pattern.slice(1); // ".example.com"
      const bare = suffix.slice(1);    // "example.com"
      if (hostname === bare || hostname.endsWith(suffix)) return true;
    } else if (hostname === pattern) {
      return true;
    }
  }
  return false;
}

/**
 * Validate `rawUrl` against the supplied allowlist patterns and return a
 * normalised URL string.
 *
 * Throws an `Error` when:
 *   - `rawUrl` is not a valid URL
 *   - the protocol is not http: or https:
 *   - the hostname is not in the allowlist
 *   - the decoded path contains a ".." segment (path traversal)
 */
export function buildValidatedUrl(rawUrl: string, patterns: string[]): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch (err) {
    throw new Error("Invalid URL", { cause: err });
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Invalid protocol");
  }

  if (!isHostAllowed(url.hostname, patterns)) {
    throw new Error("Invalid host");
  }

  // Guard against path traversal via percent-encoded ".." segments.
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(url.pathname);
  } catch (err) {
    throw new Error("Invalid URL", { cause: err });
  }
  if (decodedPath.split("/").some((seg) => seg === "..")) {
    throw new Error("Invalid path");
  }

  return url.href;
}
