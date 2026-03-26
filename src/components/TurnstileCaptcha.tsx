import Turnstile from "react-turnstile";
import { APP_CONFIG } from "@/lib/config";

interface TurnstileCaptchaProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

const SITE_KEY = APP_CONFIG.TURNSTILE_SITE_KEY;

const TurnstileCaptcha = ({ onVerify, onExpire }: TurnstileCaptchaProps) => {
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
