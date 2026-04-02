import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "haqak-logo.png",
        "haqak-logo.webp",
        "haqak-logo-192.png",
        "haqak-logo-512.png",
        "haqak-wordmark.png",
        "haqak-wordmark.webp",
        "placeholder.svg",
      ],
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // Exclude auth-sensitive routes from service worker navigation handling.
        // These paths must always hit the network so stale cached content cannot
        // serve a logged-out user an apparently-authenticated page.
        navigateFallbackDenylist: [
          /^\/~oauth/,
          /^\/auth/,
          /^\/login/,
          /^\/logout/,
          /^\/signup/,
          /^\/reset-password/,
          /^\/verify/,
          /^\/citizen/,
          /^\/profile/,
          /^\/mps/,
          /^\/mp/,
          /^\/admin/,
          /^\/onboarding/,
        ],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "google-fonts-cache", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "gstatic-fonts-cache", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
      manifest: {
        name: "حقك — منصة التواصل المدني",
        short_name: "حقك",
        description: "منصة حقك تربط المواطنين بأعضاء مجلس النواب لحل المشاكل بشكل منظم وآمن",
        theme_color: "#4285f4",
        background_color: "#f8fafc",
        display: "standalone",
        dir: "rtl",
        lang: "ar",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/haqak-logo-192.png", sizes: "192x192", type: "image/png" },
          { src: "/haqak-logo-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
    }),
  ].filter(Boolean),
  optimizeDeps: {
    include: ["react", "react-dom", "@tanstack/react-query"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
}));
