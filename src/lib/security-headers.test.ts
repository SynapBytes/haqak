/**
 * security-headers.test.ts
 *
 * Tests for the CSP and security-header utilities in:
 *   - src/server/security-headers.ts  (header builder / middleware)
 *   - src/lib/csp-reporter.ts          (violation report parser / filter / logger)
 */

import { describe, expect, it, vi } from "vitest";
import {
  buildCspHeaderValue,
  buildSecurityHeaders,
  applySecurityHeaders,
} from "../server/security-headers";
import {
  parseCspReport,
  shouldIgnoreViolation,
  logCspViolation,
  CspViolationReport,
} from "./csp-reporter";

// ── buildCspHeaderValue ───────────────────────────────────────────────────────

describe("buildCspHeaderValue", () => {
  it("returns a non-empty string", () => {
    expect(buildCspHeaderValue().length).toBeGreaterThan(0);
  });

  it("contains default-src 'self'", () => {
    expect(buildCspHeaderValue()).toContain("default-src 'self'");
  });

  it("contains frame-ancestors 'none'", () => {
    expect(buildCspHeaderValue()).toContain("frame-ancestors 'none'");
  });

  it("contains upgrade-insecure-requests", () => {
    expect(buildCspHeaderValue()).toContain("upgrade-insecure-requests");
  });

  it("contains report-uri /api/csp-report", () => {
    expect(buildCspHeaderValue()).toContain("report-uri /api/csp-report");
  });

  it("contains Cloudflare Turnstile in script-src", () => {
    expect(buildCspHeaderValue()).toContain("https://challenges.cloudflare.com");
  });

  it("contains Google Fonts in font-src", () => {
    expect(buildCspHeaderValue()).toContain("https://fonts.gstatic.com");
  });

  it("contains Supabase WebSocket in connect-src", () => {
    expect(buildCspHeaderValue()).toContain("wss://*.supabase.co");
  });

  it("contains object-src 'none'", () => {
    expect(buildCspHeaderValue()).toContain("object-src 'none'");
  });

  it("contains base-uri 'self'", () => {
    expect(buildCspHeaderValue()).toContain("base-uri 'self'");
  });

  it("semicolon-separates each directive", () => {
    const parts = buildCspHeaderValue().split("; ");
    expect(parts.length).toBeGreaterThan(5);
  });
});

// ── buildSecurityHeaders ──────────────────────────────────────────────────────

describe("buildSecurityHeaders", () => {
  it("includes Content-Security-Policy", () => {
    expect(buildSecurityHeaders()).toHaveProperty("Content-Security-Policy");
  });

  it("includes Strict-Transport-Security with long max-age", () => {
    const hsts = buildSecurityHeaders()["Strict-Transport-Security"];
    expect(hsts).toContain("max-age=63072000");
    expect(hsts).toContain("includeSubDomains");
    expect(hsts).toContain("preload");
  });

  it("includes X-Content-Type-Options: nosniff", () => {
    expect(buildSecurityHeaders()["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("includes X-Frame-Options: DENY", () => {
    expect(buildSecurityHeaders()["X-Frame-Options"]).toBe("DENY");
  });

  it("includes Referrer-Policy", () => {
    expect(buildSecurityHeaders()).toHaveProperty("Referrer-Policy");
  });

  it("includes Permissions-Policy", () => {
    expect(buildSecurityHeaders()).toHaveProperty("Permissions-Policy");
  });

  it("includes Content-Security-Policy-Report-Only", () => {
    expect(buildSecurityHeaders()).toHaveProperty(
      "Content-Security-Policy-Report-Only",
    );
  });

  it("CSP value in object matches buildCspHeaderValue()", () => {
    expect(buildSecurityHeaders()["Content-Security-Policy"]).toBe(
      buildCspHeaderValue(),
    );
  });
});

// ── applySecurityHeaders ──────────────────────────────────────────────────────

describe("applySecurityHeaders", () => {
  it("sets all security headers on the response and calls next()", () => {
    const setHeader = vi.fn();
    const next = vi.fn();
    const req = { method: "GET", url: "/" };
    const res = { setHeader };

    applySecurityHeaders(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(setHeader).toHaveBeenCalledWith(
      "Content-Security-Policy",
      buildCspHeaderValue(),
    );
    expect(setHeader).toHaveBeenCalledWith(
      "Strict-Transport-Security",
      expect.stringContaining("max-age=63072000"),
    );
    expect(setHeader).toHaveBeenCalledWith("X-Frame-Options", "DENY");
  });

  it("does not throw when called multiple times", () => {
    const res = { setHeader: vi.fn() };
    const next = vi.fn();
    const req = { method: "GET", url: "/" };
    expect(() => {
      applySecurityHeaders(req, res, next);
      applySecurityHeaders(req, res, next);
    }).not.toThrow();
  });
});

// ── parseCspReport ────────────────────────────────────────────────────────────

describe("parseCspReport", () => {
  const validBody = {
    "csp-report": {
      "document-uri": "https://haqak.app/",
      "referrer": "",
      "blocked-uri": "https://evil.com/script.js",
      "violated-directive": "script-src",
      "effective-directive": "script-src",
      "original-policy": "default-src 'self'; script-src 'self'",
      "status-code": 200,
    },
  };

  it("returns a CspViolationReport for a valid body", () => {
    const report = parseCspReport(validBody);
    expect(report).not.toBeNull();
    expect(report?.documentUri).toBe("https://haqak.app/");
    expect(report?.blockedUri).toBe("https://evil.com/script.js");
    expect(report?.violatedDirective).toBe("script-src");
  });

  it("includes optional sourceFile / lineNumber / columnNumber when present", () => {
    const body = {
      "csp-report": {
        ...validBody["csp-report"],
        "source-file": "https://haqak.app/main.js",
        "line-number": 42,
        "column-number": 7,
      },
    };
    const report = parseCspReport(body);
    expect(report?.sourceFile).toBe("https://haqak.app/main.js");
    expect(report?.lineNumber).toBe(42);
    expect(report?.columnNumber).toBe(7);
  });

  it("falls back effectiveDirective to violatedDirective when missing", () => {
    const body = {
      "csp-report": {
        "document-uri": "https://haqak.app/",
        "blocked-uri": "inline",
        "violated-directive": "script-src 'self'",
        "status-code": 0,
      },
    };
    const report = parseCspReport(body);
    expect(report?.effectiveDirective).toBe("script-src 'self'");
  });

  it("returns null for null input", () => {
    expect(parseCspReport(null)).toBeNull();
  });

  it("returns null for a non-object input", () => {
    expect(parseCspReport("bad")).toBeNull();
  });

  it("returns null when csp-report key is missing", () => {
    expect(parseCspReport({})).toBeNull();
  });

  it("returns null when document-uri is missing", () => {
    const body = {
      "csp-report": { "violated-directive": "script-src" },
    };
    expect(parseCspReport(body)).toBeNull();
  });

  it("returns null when violated-directive is missing", () => {
    const body = {
      "csp-report": { "document-uri": "https://haqak.app/" },
    };
    expect(parseCspReport(body)).toBeNull();
  });
});

// ── shouldIgnoreViolation ─────────────────────────────────────────────────────

const makeReport = (blockedUri: string): CspViolationReport => ({
  documentUri: "https://haqak.app/",
  referrer: "",
  blockedUri,
  violatedDirective: "script-src",
  effectiveDirective: "script-src",
  originalPolicy: "default-src 'self'",
  statusCode: 200,
});

describe("shouldIgnoreViolation", () => {
  it("ignores chrome-extension:// URIs", () => {
    expect(shouldIgnoreViolation(makeReport("chrome-extension://abc/inject.js"))).toBe(true);
  });

  it("ignores moz-extension:// URIs", () => {
    expect(shouldIgnoreViolation(makeReport("moz-extension://def/inject.js"))).toBe(true);
  });

  it("ignores about: URIs", () => {
    expect(shouldIgnoreViolation(makeReport("about:blank"))).toBe(true);
  });

  it("does not ignore legitimate external violations", () => {
    expect(shouldIgnoreViolation(makeReport("https://evil.com/script.js"))).toBe(false);
  });

  it("does not ignore inline violations", () => {
    expect(shouldIgnoreViolation(makeReport("inline"))).toBe(false);
  });

  it("does not ignore empty blockedUri", () => {
    expect(shouldIgnoreViolation(makeReport(""))).toBe(false);
  });
});

// ── logCspViolation ───────────────────────────────────────────────────────────

describe("logCspViolation", () => {
  it("calls the provided logger with the violation data", () => {
    const logger = vi.fn();
    const report = makeReport("https://evil.com/script.js");
    logCspViolation(report, logger);

    expect(logger).toHaveBeenCalledOnce();
    const [message, data] = logger.mock.calls[0];
    expect(message).toContain("CSP violation");
    expect(data).toMatchObject({
      event: "csp_violation",
      blockedUri: "https://evil.com/script.js",
      violatedDirective: "script-src",
    });
  });

  it("includes documentUri in the logged data", () => {
    const logger = vi.fn();
    logCspViolation(makeReport("https://evil.com/x.js"), logger);
    const [, data] = logger.mock.calls[0];
    expect(data.documentUri).toBe("https://haqak.app/");
  });
});
