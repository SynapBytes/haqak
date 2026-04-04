import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import GlobalErrorBoundary from "@/components/GlobalErrorBoundary";
import "./index.css";
import "./i18n";
import { analytics } from "@/lib/analytics";
import { initSentry } from "@/lib/sentry";

// Initialise observability before the React tree renders.
initSentry();
analytics.init();

const RUNTIME_RECOVERY_KEY = "app:runtime-recovery-attempted";
const RECOVERY_ATTEMPTED_VALUE = "1";
const RECOVERY_FLAG_CLEAR_DELAY_MS = 3000;
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

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("[boot] #root element not found — cannot mount application.");
} else {
  try {
    createRoot(rootElement).render(
      <React.StrictMode>
        <GlobalErrorBoundary>
          <App />
        </GlobalErrorBoundary>
      </React.StrictMode>
    );
  } catch (err) {
    console.error("[boot] Fatal error during React mount:", err);
    // Surface a user-visible message when even the error boundary cannot render.
    rootElement.innerHTML =
      '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a0a;color:#f0f0f0;font-family:system-ui,sans-serif;text-align:center;padding:1.5rem"><div><h1 style="font-size:1.5rem;font-weight:700;margin-bottom:0.75rem">تعذّر تحميل التطبيق</h1><p style="color:#9ca3af;margin-bottom:1.5rem">يرجى تحديث الصفحة أو المحاولة لاحقاً.</p><button onclick="window.location.reload()" style="padding:0.75rem 2rem;border-radius:0.5rem;border:none;background:linear-gradient(135deg,#ff5000,#ff7a00);color:#fff;font-weight:600;font-size:1rem;cursor:pointer">تحديث الصفحة</button></div></div>';
  }
}
