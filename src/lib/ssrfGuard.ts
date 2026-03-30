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
 *   - Private/reserved IP ranges are always rejected (defense-in-depth).
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
 * Return true if `hostname` resolves to a private, loopback, link-local, or
 * otherwise reserved address that must never be reached from a user-supplied
 * URL (defense-in-depth against SSRF even when the allowlist is mis-configured).
 *
 * Blocked ranges (IPv4 and IPv6):
 *   127.0.0.0/8      – IPv4 loopback
 *   10.0.0.0/8       – RFC 1918 private
 *   172.16.0.0/12    – RFC 1918 private
 *   192.168.0.0/16   – RFC 1918 private
 *   169.254.0.0/16   – IPv4 link-local / cloud metadata (AWS 169.254.169.254)
 *   ::1              – IPv6 loopback
 *   fc00::/7         – IPv6 unique-local (fc00:: – fdff::)
 *   fe80::/10        – IPv6 link-local
 *   "localhost"      – by name
 */
export function isPrivateIp(hostname: string): boolean {
  const h = hostname.toLowerCase();

  if (h === "localhost") return true;

  // Strip IPv6 brackets if present.
  const bare = h.startsWith("[") && h.endsWith("]") ? h.slice(1, -1) : h;

  // IPv6 checks.
  if (bare === "::1") return true;
  // fc00::/7 covers fc00:: – fdff:: (unique-local)
  if (/^f[cd]/.test(bare)) return true;
  // fe80::/10 (link-local)
  if (/^fe[89ab]/.test(bare)) return true;

  // IPv4 checks – require dotted-decimal format to avoid bypasses.
  const parts = bare.split(".");
  if (parts.length === 4) {
    const octets = parts.map(Number);
    if (octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) {
      // Not a valid IPv4 address; let the allowlist decide.
      return false;
    }
    const [a, b] = octets;
    if (a === 127) return true;               // 127.0.0.0/8
    if (a === 10) return true;                // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true;  // 192.168.0.0/16
    if (a === 169 && b === 254) return true;  // 169.254.0.0/16 (link-local / metadata)
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

  // Reject private/reserved addresses regardless of allowlist configuration.
  if (isPrivateIp(url.hostname)) {
    throw new Error("Invalid host");
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
