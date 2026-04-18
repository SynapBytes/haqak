import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  base: "/",
  server: {
    host: "0.0.0.0",
    port: 8080,
    hmr: {
      overlay: false,
    },
    headers: {
      "Cache-Control": "no-cache",
    },
  },
  build: {
    target: "esnext",
    minify: "terser",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/framer-motion")) return "framer-motion";
          if (id.includes("node_modules/leaflet") || id.includes("node_modules/react-leaflet")) return "leaflet";
          if (id.includes("node_modules/recharts")) return "recharts";
          if (id.includes("node_modules/@tanstack/react-query")) return "react-query";
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) return "react-vendor";
          if (id.includes("node_modules")) return "vendor";
          return undefined;
        },
      },
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
        // Only public routes should receive app-shell offline fallback.
        navigateFallbackAllowlist: [
          /^\/$/,
          /^\/(reset-password|privacy|terms|careers|support|genius)(\/|$)/,
          /^\/mp-profile\/[^/]+$/,
        ],
        // Exclude auth-sensitive routes from service worker navigation handling.
        // These paths must always hit the network so stale cached content cannot
        // serve a logged-out user an apparently-authenticated page.
        navigateFallbackDenylist: [
          /^\/api\//,
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
            // Never cache same-origin API responses.
            urlPattern: ({ url }) => url.origin === self.location.origin && url.pathname.startsWith("/api/"),
            handler: "NetworkOnly",
          },
          {
            // Never cache Supabase traffic (auth/functions/rest/realtime negotiation).
            urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.co\/.*/i,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
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
