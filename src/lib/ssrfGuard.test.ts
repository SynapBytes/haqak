import { describe, expect, it } from "vitest";
import {
  buildValidatedUrl,
  isHostAllowed,
  parseAllowedHostPatterns,
} from "./ssrfGuard";

// ---------------------------------------------------------------------------
// parseAllowedHostPatterns
// ---------------------------------------------------------------------------

describe("parseAllowedHostPatterns", () => {
  it("parses a single exact hostname", () => {
    expect(parseAllowedHostPatterns("images.example.com")).toEqual([
      "images.example.com",
    ]);
  });

  it("parses multiple hostnames separated by commas", () => {
    expect(
      parseAllowedHostPatterns("images.example.com,cdn.example.com")
    ).toEqual(["images.example.com", "cdn.example.com"]);
  });

  it("parses wildcard subdomain patterns", () => {
    expect(parseAllowedHostPatterns("*.example.com")).toEqual(["*.example.com"]);
  });

  it("trims whitespace around entries", () => {
    expect(
      parseAllowedHostPatterns("  images.example.com , *.cdn.example.org  ")
    ).toEqual(["images.example.com", "*.cdn.example.org"]);
  });

  it("returns an empty array for an empty string", () => {
    expect(parseAllowedHostPatterns("")).toEqual([]);
  });

  it("rejects entries containing a scheme", () => {
    expect(parseAllowedHostPatterns("https://example.com")).toEqual([]);
  });

  it("rejects entries containing a port", () => {
    expect(parseAllowedHostPatterns("example.com:8080")).toEqual([]);
  });

  it("rejects entries containing a path", () => {
    expect(parseAllowedHostPatterns("example.com/images")).toEqual([]);
  });

  it("rejects entries containing whitespace within the token", () => {
    expect(parseAllowedHostPatterns("exa mple.com")).toEqual([]);
  });

  it("rejects bare wildcard '*' without a suffix", () => {
    expect(parseAllowedHostPatterns("*")).toEqual([]);
  });

  it("rejects wildcard with empty suffix '*.'", () => {
    expect(parseAllowedHostPatterns("*.")).toEqual([]);
  });

  it("silently drops invalid entries while keeping valid ones", () => {
    expect(
      parseAllowedHostPatterns(
        "images.example.com,https://bad.com,cdn.example.com"
      )
    ).toEqual(["images.example.com", "cdn.example.com"]);
  });
});

// ---------------------------------------------------------------------------
// isHostAllowed
// ---------------------------------------------------------------------------

describe("isHostAllowed", () => {
  it("returns false when patterns list is empty (fail-closed)", () => {
    expect(isHostAllowed("example.com", [])).toBe(false);
  });

  it("allows an exact hostname match", () => {
    expect(isHostAllowed("images.example.com", ["images.example.com"])).toBe(
      true
    );
  });

  it("rejects an exact hostname that is not in the list", () => {
    expect(isHostAllowed("evil.com", ["images.example.com"])).toBe(false);
  });

  it("wildcard pattern matches the bare domain", () => {
    expect(isHostAllowed("example.com", ["*.example.com"])).toBe(true);
  });

  it("wildcard pattern matches a direct subdomain", () => {
    expect(isHostAllowed("cdn.example.com", ["*.example.com"])).toBe(true);
  });

  it("wildcard pattern matches a nested subdomain", () => {
    expect(isHostAllowed("static.cdn.example.com", ["*.example.com"])).toBe(
      true
    );
  });

  it("wildcard pattern does not match a different domain", () => {
    expect(isHostAllowed("evil.com", ["*.example.com"])).toBe(false);
  });

  it("wildcard pattern does not match a domain that ends with the suffix but is not a subdomain", () => {
    // "notexample.com" ends with "example.com" but lacks the "." separator
    expect(isHostAllowed("notexample.com", ["*.example.com"])).toBe(false);
  });

  it("returns true when any one of multiple patterns matches", () => {
    const patterns = ["images.example.com", "*.cdn.example.org"];
    expect(isHostAllowed("files.cdn.example.org", patterns)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildValidatedUrl
// ---------------------------------------------------------------------------

const PATTERNS = parseAllowedHostPatterns(
  "images.example.com,*.cdn.example.org"
);

describe("buildValidatedUrl", () => {
  // ── allowed URLs ──────────────────────────────────────────────────────────

  it("returns the normalized URL for an allowed https host", () => {
    const url = "https://images.example.com/photo.jpg";
    expect(buildValidatedUrl(url, PATTERNS)).toBe(url);
  });

  it("allows http:// for an allowed host", () => {
    const url = "http://images.example.com/photo.jpg";
    expect(buildValidatedUrl(url, PATTERNS)).toBe(url);
  });

  it("allows a subdomain matched by a wildcard pattern", () => {
    const url = "https://static.cdn.example.org/img.png";
    expect(buildValidatedUrl(url, PATTERNS)).toBe(url);
  });

  it("preserves query strings and fragments", () => {
    const url = "https://images.example.com/photo.jpg?w=800&fmt=webp#main";
    expect(buildValidatedUrl(url, PATTERNS)).toBe(url);
  });

  // ── blocked: protocol ────────────────────────────────────────────────────

  it("throws for ftp:// protocol", () => {
    expect(() =>
      buildValidatedUrl("ftp://images.example.com/file.txt", PATTERNS)
    ).toThrow("Invalid protocol");
  });

  it("throws for file:// protocol", () => {
    expect(() =>
      buildValidatedUrl("file:///etc/passwd", PATTERNS)
    ).toThrow();
  });

  it("throws for javascript: protocol", () => {
    expect(() =>
      buildValidatedUrl("javascript:alert(1)", PATTERNS)
    ).toThrow();
  });

  it("throws for data: URI", () => {
    expect(() =>
      buildValidatedUrl("data:text/html,<script>alert(1)</script>", PATTERNS)
    ).toThrow();
  });

  // ── blocked: host not in allowlist ───────────────────────────────────────

  it("throws when host is not in the allowlist", () => {
    expect(() =>
      buildValidatedUrl("https://evil.com/image.jpg", PATTERNS)
    ).toThrow("Invalid host");
  });

  it("throws when no patterns are configured (fail-closed)", () => {
    expect(() =>
      buildValidatedUrl("https://images.example.com/photo.jpg", [])
    ).toThrow("Invalid host");
  });

  it("throws for an internal localhost URL", () => {
    expect(() =>
      buildValidatedUrl("http://localhost/secret", PATTERNS)
    ).toThrow("Invalid host");
  });

  it("throws for a private IP address", () => {
    expect(() =>
      buildValidatedUrl("http://192.168.1.1/secret", PATTERNS)
    ).toThrow("Invalid host");
  });

  it("throws for a cloud metadata endpoint", () => {
    expect(() =>
      buildValidatedUrl("http://169.254.169.254/latest/meta-data/", PATTERNS)
    ).toThrow("Invalid host");
  });

  // ── blocked: path traversal ───────────────────────────────────────────────

  it("throws when the path contains a percent-encoded slash '..' traversal (%2f)", () => {
    // The URL constructor does NOT normalize ..%2f (encoded slash) as a path
    // separator, so the raw encoded ".." segment reaches our check.
    expect(() =>
      buildValidatedUrl("https://images.example.com/..%2fetc%2fpasswd", PATTERNS)
    ).toThrow("Invalid path");
  });

  it("does not throw for a standard '..' that the URL constructor already normalizes", () => {
    // new URL() resolves '../etc/passwd' to '/etc/passwd' so no '..' remains.
    // The resulting URL is safe and should be accepted.
    expect(() =>
      buildValidatedUrl("https://images.example.com/../etc/passwd", PATTERNS)
    ).not.toThrow();
  });

  // ── blocked: malformed URL ────────────────────────────────────────────────

  it("throws for a non-URL string", () => {
    expect(() => buildValidatedUrl("not a url", PATTERNS)).toThrow(
      "Invalid URL"
    );
  });

  it("throws for an empty string", () => {
    expect(() => buildValidatedUrl("", PATTERNS)).toThrow("Invalid URL");
  });
});
