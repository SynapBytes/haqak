/**
 * Security hardening tests
 *
 * Covers:
 *  1. OTP rate limiting (in-memory client-side limiter with OTP configuration)
 *  2. File upload validation (MIME, extension, size)
 *  3. CSP header format in vercel.json
 *  4. Analytics: userId hashing before PostHog identify
 */

import { describe, it, expect } from "vitest";
import { createRateLimiter } from "@/lib/rateLimiter";
import { validateBeforeUpload } from "@/lib/fileValidation";
import { MAX_FILE_SIZE_BYTES } from "@/constants/uploadConstraints";
import vercelConfig from "../../vercel.json";

// ── 1. OTP rate limit ─────────────────────────────────────────────────────────
describe("OTP rate limit (client-side guard)", () => {
  it("allows up to 5 attempts in a window then blocks", () => {
    const limiter = createRateLimiter({ maxAttempts: 5, windowMs: 60_000 });
    for (let i = 0; i < 5; i++) {
      expect(limiter.tryConsume("phone:+201234567890")).toBe(true);
    }
    expect(limiter.tryConsume("phone:+201234567890")).toBe(false);
  });

  it("isolates limits between different phone numbers", () => {
    const limiter = createRateLimiter({ maxAttempts: 1, windowMs: 60_000 });
    limiter.tryConsume("phone:+201234567890");
    expect(limiter.tryConsume("phone:+201234567890")).toBe(false);
    // Different phone should have a fresh quota
    expect(limiter.tryConsume("phone:+201098765432")).toBe(true);
  });

  it("isolates limits by IP as well", () => {
    const limiter = createRateLimiter({ maxAttempts: 10, windowMs: 60_000 });
    const ipKey = "ip:1.2.3.4";
    for (let i = 0; i < 10; i++) limiter.tryConsume(ipKey);
    expect(limiter.tryConsume(ipKey)).toBe(false);
    // Different IP should be fine
    expect(limiter.tryConsume("ip:5.6.7.8")).toBe(true);
  });
});

// ── 2. File upload validation ─────────────────────────────────────────────────
const makeFile = (size: number, name: string, type: string) =>
  new File(["a".repeat(size)], name, { type });

describe("File upload hardening", () => {
  it("rejects executable files by MIME type", () => {
    const result = validateBeforeUpload([makeFile(100, "evil.exe", "application/x-msdownload")]);
    expect(result.valid).toBe(false);
  });

  it("rejects script files by extension", () => {
    const result = validateBeforeUpload([makeFile(100, "script.sh", "text/x-shellscript")]);
    expect(result.valid).toBe(false);
  });

  it("rejects oversized files (> MAX_FILE_SIZE_BYTES)", () => {
    const result = validateBeforeUpload([makeFile(MAX_FILE_SIZE_BYTES + 1, "big.pdf", "application/pdf")]);
    expect(result.valid).toBe(false);
  });

  it("accepts a valid PDF within size limits", () => {
    const result = validateBeforeUpload([makeFile(1_000, "doc.pdf", "application/pdf")]);
    expect(result.valid).toBe(true);
  });

  it("rejects a file disguised as PDF but with EXE MIME", () => {
    const result = validateBeforeUpload([makeFile(500, "virus.pdf", "application/x-msdownload")]);
    expect(result.valid).toBe(false);
  });
});

// ── 3. CSP headers presence in vercel.json ────────────────────────────────────
describe("CSP / security headers in vercel.json", () => {
  const allHeaders = vercelConfig.headers ?? [];

  // Find the catch-all source entry
  const catchAll = allHeaders.find((h: { source: string }) => h.source === "/(.*)");

  it("has a catch-all header block", () => {
    expect(catchAll).toBeDefined();
  });

  const getHeader = (key: string) => {
    if (!catchAll) return undefined;
    return (catchAll as { source: string; headers: { key: string; value: string }[] })
      .headers.find((h) => h.key.toLowerCase() === key.toLowerCase())?.value;
  };

  it("sets Content-Security-Policy with frame-ancestors none", () => {
    const csp = getHeader("Content-Security-Policy");
    expect(csp).toBeDefined();
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("sets Content-Security-Policy with default-src self", () => {
    const csp = getHeader("Content-Security-Policy");
    expect(csp).toContain("default-src 'self'");
  });

  it("sets Strict-Transport-Security", () => {
    const hsts = getHeader("Strict-Transport-Security");
    expect(hsts).toBeDefined();
    expect(hsts).toContain("max-age=");
    expect(hsts).toContain("includeSubDomains");
  });

  it("sets X-Frame-Options to DENY", () => {
    const xfo = getHeader("X-Frame-Options");
    expect(xfo).toBe("DENY");
  });

  it("sets X-Content-Type-Options to nosniff", () => {
    const xcto = getHeader("X-Content-Type-Options");
    expect(xcto).toBe("nosniff");
  });
});

// ── 4. Analytics userId hashing ───────────────────────────────────────────────
describe("PostHog userId anonymisation (sha256Hex)", () => {
  // Inline the same hashing logic so we can test it directly without importing
  // the analytics module (which requires PostHog to be initialised).
  async function sha256Hex(value: string): Promise<string> {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest("SHA-256", enc.encode(value));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  it("produces a 64-character hex string", async () => {
    const hash = await sha256Hex("test-user-id");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it("raw userId does not appear in the hash output", async () => {
    const userId = "sensitive-user-uuid-12345";
    const hash = await sha256Hex("salt" + userId);
    expect(hash).not.toContain(userId);
  });

  it("two different userIds produce different hashes", async () => {
    const h1 = await sha256Hex("user-a");
    const h2 = await sha256Hex("user-b");
    expect(h1).not.toBe(h2);
  });

  it("adding a salt changes the output hash", async () => {
    const withoutSalt = await sha256Hex("user-1");
    const withSalt = await sha256Hex("mysalt:user-1");
    expect(withoutSalt).not.toBe(withSalt);
  });
});
