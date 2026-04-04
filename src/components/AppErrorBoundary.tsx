import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Top-level React Error Boundary.
 * Catches unhandled render errors and displays a localised error screen
 * instead of a blank white page.
 */
export class AppErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: unknown): State {
    const errorMessage =
      error instanceof Error ? error.message : String(error ?? "Unknown error");
    return { hasError: true, errorMessage };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("[AppErrorBoundary] Unhandled render error:", error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
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
            حدث خطأ غير متوقع
          </h1>
          <p style={{ marginBottom: "1.5rem", color: "#666", maxWidth: "480px" }}>
            نعتذر، حدث خطأ أثناء تحميل الصفحة. يرجى تحديث الصفحة أو المحاولة
            مرة أخرى لاحقاً.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: "0.6rem 1.5rem",
              borderRadius: "6px",
              border: "none",
              background: "#2563eb",
              color: "#fff",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            تحديث الصفحة
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
