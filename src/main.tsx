import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { analytics } from "@/lib/analytics";
import { initSentry } from "@/lib/sentry";
import { supabaseConfigError } from "@/integrations/supabase/client";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";

// Initialise observability before the React tree renders.
initSentry();
analytics.init();

const RUNTIME_RECOVERY_KEY = "app:runtime-recovery-attempted";
const RECOVERY_ATTEMPTED_VALUE = "1";
const RECOVERY_FLAG_CLEAR_DELAY_MS = 3000;
const IS_DEVELOPMENT = import.meta.env.DEV;
let recoveryAttemptedInMemory = false;

const clearRecoveryFlag = () => {
  try {
    sessionStorage.removeItem(RUNTIME_RECOVERY_KEY);
  } catch {
    // Ignore storage failures in restrictive browsers.
  }
};

const maybeRecoverFromStaleAssets = (reason: unknown) => {
  const message = reason instanceof Error ? reason.message : String(reason ?? "");
  const normalized = message.toLowerCase();
  const isStaleAssetError =
    normalized.includes("failed to fetch dynamically imported module") ||
    normalized.includes("importing a module script failed") ||
    normalized.includes("chunkloaderror") ||
    normalized.includes("loading chunk");

  if (!isStaleAssetError) return;

  try {
    if (sessionStorage.getItem(RUNTIME_RECOVERY_KEY) === RECOVERY_ATTEMPTED_VALUE) return;
    sessionStorage.setItem(RUNTIME_RECOVERY_KEY, RECOVERY_ATTEMPTED_VALUE);
  } catch {
    if (recoveryAttemptedInMemory) return;
    recoveryAttemptedInMemory = true;
  }

  window.location.reload();
};

window.addEventListener("error", (event) => maybeRecoverFromStaleAssets(event.error ?? event.message));
window.addEventListener("unhandledrejection", (event) => maybeRecoverFromStaleAssets(event.reason));
window.addEventListener("load", () => {
  window.setTimeout(clearRecoveryFlag, RECOVERY_FLAG_CLEAR_DELAY_MS);
});

if (supabaseConfigError) {
  console.error("[bootstrap] Supabase configuration missing:", supabaseConfigError);
}

const rootElement = document.getElementById("root")!;

createRoot(rootElement).render(
  <React.StrictMode>
    <AppErrorBoundary>
      {supabaseConfigError ? (
        <div
          dir="rtl"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "2rem",
            fontFamily: "sans-serif",
            background: "#fafafa",
            color: "#333",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
            خطأ في إعدادات التطبيق
          </h1>
          <p style={{ marginBottom: "0.5rem", color: "#666", maxWidth: "480px" }}>
            لا يمكن تشغيل التطبيق بسبب نقص في إعدادات الاتصال بقاعدة البيانات.
          </p>
          <p style={{ color: "#999", fontSize: "0.85rem", maxWidth: "480px" }}>
            يرجى التواصل مع مسؤول النظام للتحقق من إعدادات البيئة.
          </p>
          {IS_DEVELOPMENT ? (
            <p style={{ color: "#999", fontSize: "0.85rem", maxWidth: "480px", marginTop: "0.5rem" }}>
              Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY (ANON_KEY)
            </p>
          ) : null}
        </div>
      ) : (
        <App />
      )}
    </AppErrorBoundary>
  </React.StrictMode>
);
