/**
 * Centralized configuration for the Haqak application.
 * This file should be the single source of truth for global settings and keys.
 */

const parseBooleanEnv = (value: string | undefined, fallback: boolean) => {
  if (value == null || value.trim() === "") return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
};

export const APP_CONFIG = {
  VAPID_PUBLIC_KEY: import.meta.env.VITE_VAPID_PUBLIC_KEY || "",
  TURNSTILE_SITE_KEY:
    import.meta.env.VITE_TURNSTILE_SITE_KEY ||
    (import.meta.env.DEV ? "1x00000000000000000000AA" : ""),
  SUPPORT_EMAIL: "support@haqak.org",
  CHAT_AUTO_CLOSE_DAYS: 30,
  NOTIFICATIONS_PER_PAGE: 20,
  FEATURES: {
    ENABLE_CITIZEN_TIMELINE: parseBooleanEnv(import.meta.env.VITE_ENABLE_CITIZEN_TIMELINE, false),
    ENABLE_NOTIFICATIONS_V2: parseBooleanEnv(import.meta.env.VITE_ENABLE_NOTIFICATIONS_V2, false),
    ENABLE_FAQ_SMART_SEARCH: parseBooleanEnv(import.meta.env.VITE_ENABLE_FAQ_SMART_SEARCH, true),
  },
};
