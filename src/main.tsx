import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
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

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
