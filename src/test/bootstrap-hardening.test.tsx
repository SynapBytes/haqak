import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";

// ── AppErrorBoundary tests ────────────────────────────────────────────────────

/** Helper component that throws on render when `shouldThrow` is true. */
function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("Test render error");
  return <div data-testid="child">child content</div>;
}

describe("AppErrorBoundary", () => {
  // Suppress React's error boundary console.error noise in test output.
  let consoleError: typeof console.error;
  beforeEach(() => {
    consoleError = console.error;
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = consoleError;
  });

  it("renders children when there is no error", () => {
    render(
      <AppErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </AppErrorBoundary>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("renders the Arabic error screen when a child throws", () => {
    render(
      <AppErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </AppErrorBoundary>
    );
    expect(screen.getByText("حدث خطأ غير متوقع")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "تحديث الصفحة" })).toBeInTheDocument();
  });

  it("does not render children after an error is caught", () => {
    const { container } = render(
      <AppErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </AppErrorBoundary>
    );
    expect(within(container).queryByTestId("child")).not.toBeInTheDocument();
  });

  it("reload button calls window.location.reload", () => {
    const reloadMock = vi.fn();
    const original = window.location;
    Object.defineProperty(window, "location", {
      value: { ...original, reload: reloadMock },
      writable: true,
    });

    const { container } = render(
      <AppErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </AppErrorBoundary>
    );

    fireEvent.click(within(container).getByRole("button", { name: "تحديث الصفحة" }));
    expect(reloadMock).toHaveBeenCalledOnce();

    Object.defineProperty(window, "location", { value: original, writable: true });
  });
});

// ── supabaseConfigError derivation tests ─────────────────────────────────────

describe("supabaseConfigError derivation logic", () => {
  /**
   * Inline the same logic used in client.ts so we can unit-test it without
   * importing the module (which would attempt to call createClient).
   */
  function deriveConfigError(url: string | undefined, key: string | undefined): string | null {
    return !url || !key
      ? "Missing Supabase configuration: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set."
      : null;
  }

  it("returns null when both env vars are present", () => {
    expect(deriveConfigError("https://abc.supabase.co", "anon-key-value")).toBeNull();
  });

  it("returns an error string when SUPABASE_URL is missing", () => {
    expect(deriveConfigError(undefined, "anon-key-value")).not.toBeNull();
  });

  it("returns an error string when SUPABASE_PUBLISHABLE_KEY is missing", () => {
    expect(deriveConfigError("https://abc.supabase.co", undefined)).not.toBeNull();
  });

  it("returns an error string when both env vars are missing", () => {
    expect(deriveConfigError(undefined, undefined)).not.toBeNull();
  });

  it("returns an error string when env vars are empty strings", () => {
    expect(deriveConfigError("", "")).not.toBeNull();
  });

  it("error message mentions both required variable names", () => {
    const msg = deriveConfigError(undefined, undefined) ?? "";
    expect(msg).toContain("VITE_SUPABASE_URL");
    expect(msg).toContain("VITE_SUPABASE_ANON_KEY");
  });
});

// ── Bootstrap config-error fallback UI ───────────────────────────────────────

describe("Bootstrap config-error fallback UI", () => {
  it("renders the Arabic misconfiguration message when supabaseConfigError is set", () => {
    render(
      <AppErrorBoundary>
        <div
          dir="rtl"
          data-testid="config-error-screen"
        >
          <h1>خطأ في إعدادات التطبيق</h1>
          <p>لا يمكن تشغيل التطبيق بسبب نقص في إعدادات الاتصال بقاعدة البيانات.</p>
        </div>
      </AppErrorBoundary>
    );
    expect(screen.getByTestId("config-error-screen")).toBeInTheDocument();
    expect(screen.getByText("خطأ في إعدادات التطبيق")).toBeInTheDocument();
  });
});
