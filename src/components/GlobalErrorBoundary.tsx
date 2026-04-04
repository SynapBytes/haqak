import React from "react";

interface State {
  hasError: boolean;
  error: Error | null;
}

interface Props {
  children: React.ReactNode;
}

/**
 * Global error boundary that catches any uncaught React rendering error.
 * Prevents the app from going entirely blank — shows a friendly recovery UI
 * and logs the error to the console (and to Sentry when available).
 */
class GlobalErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Always log to console for developer visibility.
    console.error("[GlobalErrorBoundary] Uncaught error:", error, info.componentStack);

    // Forward to Sentry when available (optional integration).
    try {
      // Dynamic import avoids hard dependency on Sentry being configured.
      import("@sentry/react").then(({ captureException }) => {
        captureException(error, { extra: { componentStack: info.componentStack } });
      }).catch(() => {/* ignore if Sentry is not configured */});
    } catch {
      // Ignore any errors in the error reporter itself.
    }
  }

  handleReload = () => {
    // Clear the error state and attempt a hard reload to recover from stale
    // service worker / cached asset issues.
    try {
      sessionStorage.removeItem("app:runtime-recovery-attempted");
    } catch {
      // Ignore storage failures in restrictive browsers.
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        dir="rtl"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
          color: "#f0f0f0",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "1.5rem",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "420px", width: "100%" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "rgba(255,80,0,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
              fontSize: "2rem",
            }}
          >
            ⚠️
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>
            حدث خطأ غير متوقع
          </h1>
          <p style={{ color: "#9ca3af", marginBottom: "2rem", lineHeight: 1.6 }}>
            تعذّر تحميل التطبيق. يمكنك تحديث الصفحة للمحاولة مرة أخرى.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: "0.75rem 2rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "linear-gradient(135deg, #ff5000, #ff7a00)",
              color: "#fff",
              fontWeight: 600,
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            تحديث الصفحة
          </button>
          {process.env.NODE_ENV !== "production" && this.state.error && (
            <details
              style={{
                marginTop: "2rem",
                textAlign: "left",
                background: "#1a1a1a",
                borderRadius: "0.5rem",
                padding: "1rem",
                fontSize: "0.75rem",
                color: "#f87171",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              <summary style={{ cursor: "pointer", marginBottom: "0.5rem", color: "#fca5a5" }}>
                Error details (dev only)
              </summary>
              {String(this.state.error)}
            </details>
          )}
        </div>
      </div>
    );
  }
}

export default GlobalErrorBoundary;
