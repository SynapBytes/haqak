import Turnstile from "react-turnstile";

interface TurnstileCaptchaProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"; // Test key fallback

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
