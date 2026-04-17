# CSP Implementation Guide — Haqak

## Overview

This document describes the Content Security Policy (CSP) implementation for
the Haqak platform, explains each whitelisted source, and provides guidance for
maintaining the policy as the application evolves.

---

## Policy Location

| Environment | Where the CSP is set |
|-------------|----------------------|
| **Production (GitHub Pages)** | `src/server/security-headers.ts` → `CSP_DIRECTIVES` (single source of truth) |
| **Development (Vite dev server)** | `src/server/security-headers.ts` → `viteSecurityHeaders()` |
| **Edge Functions / custom servers** | `src/server/security-headers.ts` → `buildSecurityHeaders()` |

The single source-of-truth for directive values is the `CSP_DIRECTIVES` array in
`src/server/security-headers.ts`.

---

## Directive Reference

### `default-src 'self'`

Base fallback for all resource types not explicitly listed.  By setting this to
`'self'` only, any undeclared resource type is blocked by default.

---

### `script-src 'self' https://challenges.cloudflare.com https://app.posthog.com https://us.i.posthog.com`

| Source | Purpose |
|--------|---------|
| `'self'` | Application's own JavaScript bundles |
| `https://challenges.cloudflare.com` | Cloudflare Turnstile CAPTCHA widget |
| `https://app.posthog.com` | PostHog analytics SDK |
| `https://us.i.posthog.com` | PostHog US-region ingestion |

> **Why no `'unsafe-inline'`?**  Inline scripts are blocked.  React and the Vite
> build system produce no runtime inline scripts; any that appear are from browser
> extensions (filtered by the CSP reporter) or a potential injection.

---

### `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`

| Source | Purpose |
|--------|---------|
| `'self'` | Compiled CSS files |
| `'unsafe-inline'` | Required by Tailwind CSS and Radix UI runtime style injection |
| `https://fonts.googleapis.com` | Google Fonts stylesheet loader |

> **Roadmap:** Replace `'unsafe-inline'` with a nonce-based approach once
> Tailwind v4 / CSS-in-JS tooling supports it.

---

### `font-src 'self' https://fonts.gstatic.com`

| Source | Purpose |
|--------|---------|
| `'self'` | Self-hosted font files |
| `https://fonts.gstatic.com` | Google Fonts binary CDN |

---

### `img-src 'self' data: blob: https://cdnjs.cloudflare.com https://*.tile.openstreetmap.org https://challenges.cloudflare.com https://*.supabase.co`

| Source | Purpose |
|--------|---------|
| `'self'` | Static images in the app bundle |
| `data:` | Inline data URIs (avatars, canvas exports, EXIF-stripped previews) |
| `blob:` | Blob URL object URLs created during image crop/resize operations |
| `https://cdnjs.cloudflare.com` | Leaflet map icons |
| `https://*.tile.openstreetmap.org` | OpenStreetMap map tile CDN |
| `https://challenges.cloudflare.com` | Turnstile CAPTCHA images |
| `https://*.supabase.co` | Issue attachment images stored in Supabase Storage |

---

### `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://app.posthog.com https://us.i.posthog.com https://us-assets.i.posthog.com https://*.ingest.sentry.io https://*.sentry.io https://challenges.cloudflare.com`

| Source | Purpose |
|--------|---------|
| `'self'` | Same-origin API routes |
| `https://*.supabase.co` | Supabase REST API (auth, database, storage) |
| `wss://*.supabase.co` | Supabase Realtime WebSocket (live notifications) |
| `https://app.posthog.com` | PostHog event ingestion |
| `https://us.i.posthog.com` | PostHog US region |
| `https://us-assets.i.posthog.com` | PostHog asset host |
| `https://*.ingest.sentry.io` | Sentry error reporting |
| `https://*.sentry.io` | Sentry SDK metadata |
| `https://challenges.cloudflare.com` | Turnstile token verification |

---

### `frame-src https://challenges.cloudflare.com`

Only the Cloudflare Turnstile challenge iframe is allowed.  All other
third-party iframes are blocked.

---

### `frame-ancestors 'none'`

Prevents the Haqak application from being embedded in any `<iframe>`, `<frame>`,
or `<object>` on any external domain.  This is the primary clickjacking
mitigation (supplementing the `X-Frame-Options: DENY` header).

---

### `object-src 'none'`

Blocks all plugin-based content (Flash, Java, Silverlight, ActiveX).  None of
these are used by the application.

---

### `base-uri 'self'`

Restricts `<base href>` overrides to the same origin, preventing base-URI
injection that could redirect relative URLs to an attacker-controlled server.

---

### `form-action 'self'`

Limits `<form action>` submissions to the same origin.

---

### `worker-src 'self' blob:`

Allows the PWA service worker (`sw.js`) and any `blob:`-based worker created
during background processing.

---

### `manifest-src 'self'`

Restricts the PWA Web App Manifest to the same origin.

---

### `upgrade-insecure-requests`

Instructs the browser to automatically upgrade `http://` sub-resource requests
to `https://`.  This is defence-in-depth against mixed-content issues on pages
served over HTTPS.

---

### `report-uri /api/csp-report`

Instructs the browser to POST a JSON violation report to the `/api/csp-report`
endpoint whenever the CSP is violated.

> See `src/lib/csp-reporter.ts` for the report schema and processing utilities.

---

## Violation Reporting

### Endpoint

`POST /api/csp-report`

The browser sends a JSON body with a `csp-report` key:

```json
{
  "csp-report": {
    "document-uri": "https://haqak.app/issues/123",
    "blocked-uri": "https://evil.com/script.js",
    "violated-directive": "script-src",
    "effective-directive": "script-src",
    "original-policy": "...",
    "status-code": 200
  }
}
```

### Processing

Use the utilities in `src/lib/csp-reporter.ts`:

```typescript
import { parseCspReport, shouldIgnoreViolation, logCspViolation } from "@/lib/csp-reporter";

// Inside your serverless handler:
const body = await req.json().catch(() => null);
const report = parseCspReport(body);
if (report && !shouldIgnoreViolation(report)) {
  logCspViolation(report);
  // Forward to Sentry / PostHog / your SIEM as needed
}
return new Response(null, { status: 204 });
```

### False Positives

`shouldIgnoreViolation` automatically filters out reports from:
- Browser extensions (`chrome-extension://`, `moz-extension://`, `safari-extension://`)
- Antivirus / security toolbar injections (Kaspersky, Avast)
- Synthetic monitoring agents (Pingdom, SpeedCurve)
- `about:` URIs

---

## Development Environment

### Vite Dev Server

To apply CSP headers during local development, add the `viteSecurityHeaders()`
helper to `vite.config.ts`:

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import { viteSecurityHeaders } from "./src/server/security-headers";

export default defineConfig({
  server: {
    headers: viteSecurityHeaders(),
  },
});
```

### Express Dev Server

```typescript
import express from "express";
import { applySecurityHeaders } from "./src/server/security-headers";

const app = express();
app.use(applySecurityHeaders);
```

---

## Adding New Third-Party Sources

When integrating a new third-party service:

1. Identify every domain the service loads resources from (check the browser
   Network panel with a cleared cache).
2. Add the minimum required sources to the relevant directives in
   `src/server/security-headers.ts` (`CSP_DIRECTIVES`).
3. Document the new source in this guide with a purpose comment.
4. Run `npm test` to confirm the updated header is picked up by the test suite.

---

## Maintenance Checklist

| Task | Frequency |
|------|-----------|
| Review CSP violation dashboard for new patterns | Weekly |
| Remove obsolete whitelist entries for deprecated services | Each sprint |
| Validate CSP against [CSP Evaluator](https://csp-evaluator.withgoogle.com/) | Quarterly |
| Check if `'unsafe-inline'` in `style-src` can be removed | Quarterly |
| Audit `connect-src` against current third-party SDK list | Quarterly |

---

## Resources

- [CSP Level 3 specification](https://www.w3.org/TR/CSP3/)
- [MDN Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy)
- [CSP Evaluator tool](https://csp-evaluator.withgoogle.com/)
- [Report-URI service](https://report-uri.com/)
