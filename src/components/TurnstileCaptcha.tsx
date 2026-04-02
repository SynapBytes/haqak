import Turnstile from "react-turnstile";
import { APP_CONFIG } from "@/lib/config";

interface TurnstileCaptchaProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

const SITE_KEY = APP_CONFIG.TURNSTILE_SITE_KEY;

const TurnstileCaptcha = ({ onVerify, onExpire }: TurnstileCaptchaProps) => {
  // Don't render Turnstile if no sitekey is configured
  if (!SITE_KEY) {
    // Auto-verify in development when no key is set
    if (import.meta.env.DEV) {
      onVerify("dev-bypass-token");
    }
    return null;
  }

  return (
    <div className="flex justify-center my-3">
      <Turnstile
        sitekey={SITE_KEY}
        onVerify={onVerify}
        onExpire={onExpire}
        theme="auto"
      />
    </div>
  );
};

export default TurnstileCaptcha;
