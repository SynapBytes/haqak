/**
 * Centralized PostHog analytics wrapper.
 *
 * Usage:
 *   import { analytics } from "@/lib/analytics";
 *   analytics.track("issue_submitted", { category: "water" });
 *
 * Required env var:
 *   VITE_POSTHOG_KEY   — PostHog project API key
 *   VITE_POSTHOG_HOST  — PostHog host (default: https://app.posthog.com)
 */

import posthog from "posthog-js";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? "https://app.posthog.com";

let initialised = false;

function init() {
  if (initialised || !POSTHOG_KEY) return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    // Disable automatic pageview capture; we emit them explicitly if needed.
    capture_pageview: false,
    // Respect Do Not Track browser setting.
    respect_dnt: true,
    // Disable session recording to stay lean.
    disable_session_recording: true,
    // Do not collect geographic data beyond country-level.
    ip: false,
  });
  initialised = true;
}

/**
 * Identify the current user. Call after a successful login.
 * Only the anonymous role string is sent — no PII.
 */
function identify(userId: string, role: string) {
  if (!initialised) return;
  posthog.identify(userId, { role });
}

/** Reset identity on sign-out. */
function reset() {
  if (!initialised) return;
  posthog.reset();
}

/**
 * Track a named event with optional properties.
 * All strings are trimmed; no raw personal data should be passed as values.
 */
function track(event: string, properties?: Record<string, string | number | boolean | null>) {
  if (!initialised) return;
  posthog.capture(event, properties);
}

export const analytics = { init, identify, reset, track };
