/**
 * security-headers.ts
 *
 * CSP and security-header middleware for development and edge environments.
 *
 * Usage (Express / Node.js dev server):
 *   import { applySecurityHeaders } from "./security-headers";
 *   app.use(applySecurityHeaders);
 *
 * Usage (Supabase Edge Function / Deno):
 *   import { buildSecurityHeaders } from "./security-headers";
 *   const headers = buildSecurityHeaders();
 */

// ── CSP directive configuration ─────────────────────────────────────────────

/**
 * Ordered list of CSP directives.  Each entry maps a directive name to the
 * space-separated list of sources (or a bare keyword like "upgrade-insecure-requests").
 */
const CSP_DIRECTIVES: ReadonlyArray<[string, string]> = [
  // Block everything not explicitly allowed
  ["default-src", "'self'"],

  // JavaScript: self + Cloudflare Turnstile CAPTCHA widget + PostHog analytics
  ["script-src", "'self' https://challenges.cloudflare.com https://app.posthog.com https://us.i.posthog.com"],

  // CSS: self + inline styles (required by Tailwind/Radix runtime) + Google Fonts
  ["style-src", "'self' 'unsafe-inline' https://fonts.googleapis.com"],

  // Fonts: self + Google Fonts CDN
  ["font-src", "'self' https://fonts.gstatic.com"],

  // Images: self + data URIs + blob URLs (canvas/cropping) + OSM tiles + Supabase storage
  ["img-src", "'self' data: blob: https://cdnjs.cloudflare.com https://*.tile.openstreetmap.org https://challenges.cloudflare.com https://*.supabase.co"],

  // Fetch / XHR / WebSocket: self + Supabase REST + Realtime WS + analytics + Sentry + Turnstile
  ["connect-src", "'self' https://*.supabase.co wss://*.supabase.co https://app.posthog.com https://us.i.posthog.com https://us-assets.i.posthog.com https://*.ingest.sentry.io https://*.sentry.io https://challenges.cloudflare.com"],

  // iframes: only Cloudflare Turnstile challenge frame
  ["frame-src", "https://challenges.cloudflare.com"],

  // Prevent the page from being embedded in any external frame (clickjacking)
  ["frame-ancestors", "'none'"],

  // Block plugin/embed content (Flash, Java, etc.)
  ["object-src", "'none'"],

  // Restrict <base> to same-origin only
  ["base-uri", "'self'"],

  // Limit form submissions to same-origin
  ["form-action", "'self'"],

  // Allow service worker and blob-based workers
  ["worker-src", "'self' blob:"],

  // PWA manifest
  ["manifest-src", "'self'"],

  // Automatically upgrade http:// requests to https://
  ["upgrade-insecure-requests", ""],

  // Send violation reports to our logging endpoint
  ["report-uri", "/api/csp-report"],
];

// ── Builder ──────────────────────────────────────────────────────────────────

/**
 * Build the full CSP header value string from the directive list.
 */
export function buildCspHeaderValue(): string {
  return CSP_DIRECTIVES.map(([directive, value]) =>
    value ? `${directive} ${value}` : directive,
  ).join("; ");
}

/**
 * Build the complete set of security response headers.
 * Returns a plain object suitable for use in any HTTP framework.
 */
export function buildSecurityHeaders(): Record<string, string> {
  return {
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(self), geolocation=(self), payment=(), usb=(), bluetooth=()",
    "Content-Security-Policy": buildCspHeaderValue(),
    // Report-Only header to pilot SRI enforcement before switching to enforced mode
    "Content-Security-Policy-Report-Only": "require-sri-for script style",
  };
}

// ── Express middleware ────────────────────────────────────────────────────────

/**
 * Express-compatible middleware that applies all security headers to every
 * response.  Use this in the local Vite/Express dev server so development
 * parity with production (Vercel) is maintained.
 *
 * @example
 * import express from "express";
 * import { applySecurityHeaders } from "./src/server/security-headers";
 *
 * const app = express();
 * app.use(applySecurityHeaders);
 */
export function applySecurityHeaders(
  _req: { method: string; url: string },
  res: { setHeader: (key: string, value: string) => void },
  next: () => void,
): void {
  const headers = buildSecurityHeaders();
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value);
  }
  next();
}

// ── Vite plugin helper ────────────────────────────────────────────────────────

/**
 * Returns a Vite `server.headers` configuration object containing all security
 * headers.  Add to `vite.config.ts` under `server.headers` for dev-mode CSP.
 *
 * @example
 * // vite.config.ts
 * import { viteSecurityHeaders } from "./src/server/security-headers";
 * export default defineConfig({ server: { headers: viteSecurityHeaders() } });
 */
export function viteSecurityHeaders(): Record<string, string> {
  return buildSecurityHeaders();
}
