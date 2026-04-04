import React from "react";
import { APP_CONFIG } from "@/lib/config";

interface TurnstileCaptchaProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

const SITE_KEY = APP_CONFIG.TURNSTILE_SITE_KEY;

/* ── Error Boundary ── */
class TurnstileErrorBoundary extends React.Component<
  { children: React.ReactNode; onFallback?: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onFallback?: () => void }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    // Turnstile SDK can throw during cleanup — silently degrade.
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

/* ── Lazy-loaded Turnstile ── */
const LazyTurnstile = React.lazy(() => import("react-turnstile"));

const TurnstileCaptcha = ({ onVerify, onExpire }: TurnstileCaptchaProps) => {
  // Don't render Turnstile if no sitekey is configured
  if (!SITE_KEY) {
    // Auto-verify in development when no key is set
    if (import.meta.env.DEV) {
      // Schedule to avoid calling setState during render
      React.useEffect(() => { onVerify("dev-bypass-token"); }, []);
    }
    return null;
  }

  return (
    <TurnstileErrorBoundary>
      <React.Suspense fallback={<div className="h-[65px]" />}>
        <div className="flex justify-center my-3">
          <LazyTurnstile
            sitekey={SITE_KEY}
            onVerify={onVerify}
            onExpire={onExpire}
            theme="auto"
          />
        </div>
      </React.Suspense>
    </TurnstileErrorBoundary>
  );
};

export default TurnstileCaptcha;
