/**
 * Sentry frontend error monitoring initializer.
 *
 * Required env var:
 *   VITE_SENTRY_DSN — Sentry project DSN
 *
 * Optional env var:
 *   VITE_ENV        — environment label sent to Sentry (default: "production")
 *                     Use "development" locally to suppress noise.
 */

import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const ENVIRONMENT = (import.meta.env.VITE_ENV as string | undefined) ?? "production";

export function initSentry() {
  if (!SENTRY_DSN) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    // Sample 10 % of transactions for performance monitoring — keeps quota low.
    tracesSampleRate: 0.1,
    // Disable session replay to avoid collecting PII.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    // Scrub common sensitive keys before they are sent.
    beforeSend(event) {
      if (event.request?.cookies) event.request.cookies = "[Filtered]";
      return event;
    },
  });
}
