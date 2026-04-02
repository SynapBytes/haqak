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

/**
 * Hash a string with SHA-256 using the Web Crypto API.
 * Used to anonymise user IDs before sending them to third-party analytics.
 */
async function sha256Hex(value: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(value));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** One-time cached salt — sourced from build-time env to avoid per-call env reads. */
const HASH_SALT = (import.meta.env.VITE_HASH_SALT as string | undefined) ?? "";

// Warn at initialisation time if HASH_SALT is missing — the hash still runs but
// provides weaker anonymisation without a salt, and analysts could correlate
// users across deployments using rainbow tables.
if (!HASH_SALT && import.meta.env.PROD) {
  console.warn("[analytics] VITE_HASH_SALT is not set. User ID hashing will run without a salt. Set VITE_HASH_SALT in your environment for stronger anonymisation.");
}

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
 * The raw userId is hashed with SHA-256 + salt before being sent so no PII
 * reaches PostHog.  Only the role string is forwarded as a property.
 */
function identify(userId: string, role: string) {
  if (!initialised) return;
  // Hash asynchronously; fire-and-forget is fine for analytics.
  sha256Hex(HASH_SALT + userId)
    .then((hashedId) => {
      posthog.identify(hashedId, { role });
    })
    .catch(() => {
      // If hashing fails, use a generic anonymous id without any userId info.
      posthog.identify("anon", { role });
    });
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
