/**
 * Centralized configuration for the Haqak application.
 * This file should be the single source of truth for global settings and keys.
 */

export const APP_CONFIG = {
  VAPID_PUBLIC_KEY: import.meta.env.VITE_VAPID_PUBLIC_KEY || "BNVKoUpjJ2sGXKaWxBBbSGkPTGv38mDDeUbk1UFupvGkZ8_xWVj5dg8MnH-ZnNvtpOOMHu-HjbGZe4mZSSRw0M4",
  TURNSTILE_SITE_KEY: import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA",
  SUPPORT_EMAIL: "team@haqak.org",
  CHAT_AUTO_CLOSE_DAYS: 30,
  NOTIFICATIONS_PER_PAGE: 20,
};
