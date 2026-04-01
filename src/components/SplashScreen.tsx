import { useEffect, useState } from "react";

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [stage, setStage] = useState<"logo" | "brand" | "exit">("logo");

  useEffect(() => {
    // المرحلة الأولى: عرض اللوجو (الريشة) لمدة 1.8 ثانية
    const logoTimer = setTimeout(() => {
      setStage("brand");
    }, 1800);

    // المرحلة الثانية: عرض اسم البراند (HAQAK) لمدة 1.8 ثانية إضافية
    const brandTimer = setTimeout(() => {
      setStage("exit");
    }, 3600);

    // إنهاء الشاشة الترحيبية تماماً بعد 4.2 ثانية
    const finishTimer = setTimeout(() => {
      onFinish();
    }, 4200);

    return () => {
      clearTimeout(logoTimer);
      clearTimeout(brandTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        backgroundColor: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        transition: "opacity 0.5s ease-in-out",
        opacity: stage === "exit" ? 0 : 1,
        pointerEvents: "none",
      }}
    >
      <style>{`
        @keyframes splashFade {
          0% { opacity: 0; transform: scale(0.92); filter: blur(10px); }
          20% { opacity: 1; transform: scale(1); filter: blur(0px); }
          80% { opacity: 1; transform: scale(1); filter: blur(0px); }
          100% { opacity: 0; transform: scale(1.05); filter: blur(10px); }
        }
        
        .splash-img {
          max-width: 280px;
          width: 70%;
          height: auto;
          object-fit: contain;
          animation: splashFade 2s ease-in-out forwards;
        }

        .splash-glow {
          position: absolute;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(255, 80, 0, 0.12) 0%, rgba(0, 0, 0, 0) 70%);
          border-radius: 50%;
          pointer-events: none;
        }
      `}</style>

      <div className="splash-glow" />

      {stage === "logo" && (
        <img
          src="/assets/splash/logo.png"
          alt="Logo"
          className="splash-img"
          key="logo-img"
        />
      )}

      {stage === "brand" && (
        <img
          src="/assets/splash/brand.png"
          alt="Brand"
          className="splash-img"
          key="brand-img"
        />
      )}
    </div>
  );
};

export default SplashScreen;
