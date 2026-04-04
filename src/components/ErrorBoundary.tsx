import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Top-level error boundary that prevents a blank white page when an uncaught
 * runtime error propagates out of the React tree.  Renders a minimal but
 * actionable error screen so users know something went wrong.
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to the console so developers can see the error in DevTools.
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
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
              maxWidth: 480,
              width: "100%",
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
              padding: "2rem",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>⚠️</div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.5rem" }}>
              حدث خطأ غير متوقع
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              تعذّر تحميل التطبيق بسبب خطأ داخلي. يرجى تحديث الصفحة أو التواصل مع الدعم إذا استمرت
              المشكلة.
            </p>
            {this.state.error?.message && (
              <pre
                style={{
                  background: "#f1f5f9",
                  borderRadius: 8,
                  padding: "0.75rem",
                  fontSize: "0.75rem",
                  color: "#475569",
                  textAlign: "left",
                  direction: "ltr",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  marginBottom: "1.5rem",
                }}
              >
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "#4285f4",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "0.625rem 1.5rem",
                fontSize: "0.95rem",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              إعادة تحميل الصفحة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
