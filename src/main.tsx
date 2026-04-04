import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { analytics } from "@/lib/analytics";
import { initSentry } from "@/lib/sentry";
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

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("Unhandled app error boundary crash:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-6 text-center">
          <div>
            <h1 className="text-2xl font-semibold mb-3">حدث خطأ غير متوقع</h1>
            <p className="text-muted-foreground">يرجى إعادة تحميل الصفحة أو المحاولة لاحقًا.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

if (supabaseConfigError) {
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <div className="min-h-screen flex items-center justify-center bg-background px-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold mb-3">إعدادات التطبيق غير مكتملة</h1>
          <p className="text-muted-foreground">{supabaseConfigError}</p>
        </div>
      </div>
    </React.StrictMode>
  );
} else {
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);
}
