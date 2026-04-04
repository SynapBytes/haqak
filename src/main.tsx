import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { analytics } from "@/lib/analytics";
import { initSentry } from "@/lib/sentry";
import ErrorBoundary from "@/components/ErrorBoundary";
import { supabaseConfigError } from "@/integrations/supabase/client";

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
    <ErrorBoundary>
      {supabaseConfigError ? (
        <div
          dir="rtl"
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f8fafc",
            fontFamily: "system-ui, sans-serif",
            padding: "1rem",
          }}
        >
          <div
            style={{
              maxWidth: 520,
              width: "100%",
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
              padding: "2rem",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🔧</div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.5rem" }}>
              خطأ في إعدادات التطبيق
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "1rem" }}>
              لم يتم تكوين متغيرات البيئة المطلوبة للتطبيق. يرجى التحقق من إعدادات النشر.
            </p>
            <pre
              style={{
                background: "#fef2f2",
                borderRadius: 8,
                padding: "0.75rem",
                fontSize: "0.75rem",
                color: "#b91c1c",
                textAlign: "left",
                direction: "ltr",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                marginBottom: "1.5rem",
                border: "1px solid #fecaca",
              }}
            >
              {supabaseConfigError}
            </pre>
            <p style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
              إذا كنت مشرفًا، تأكد من ضبط{" "}
              <code style={{ background: "#f1f5f9", padding: "0.1rem 0.3rem", borderRadius: 4 }}>
                VITE_SUPABASE_URL
              </code>{" "}
              و{" "}
              <code style={{ background: "#f1f5f9", padding: "0.1rem 0.3rem", borderRadius: 4 }}>
                VITE_SUPABASE_PUBLISHABLE_KEY
              </code>{" "}
              في إعدادات متغيرات البيئة الخاصة بمنصة النشر.
            </p>
          </div>
        </div>
      ) : (
        <App />
      )}
    </ErrorBoundary>
  </React.StrictMode>
);
