import { useEffect, useState, useCallback } from "react";

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [stage, setStage] = useState<"logo" | "brand" | "exit">("logo");
  const [isFinished, setIsFinished] = useState(false);

  const handleFinish = useCallback(() => {
    if (!isFinished) {
      setIsFinished(true);
      onFinish();
    }
  }, [isFinished, onFinish]);

  useEffect(() => {
    // المرحلة الأولى: عرض اللوجو (الريشة)
    const logoTimer = setTimeout(() => {
      setStage("brand");
    }, 2000);

    // المرحلة الثانية: عرض اسم البراند (HAQAK)
    const brandTimer = setTimeout(() => {
      setStage("exit");
    }, 4000);

    // إنهاء الشاشة الترحيبية (Safety Timeout)
    const finishTimer = setTimeout(() => {
      handleFinish();
    }, 4600);

    return () => {
      clearTimeout(logoTimer);
      clearTimeout(brandTimer);
      clearTimeout(finishTimer);
    };
  }, [handleFinish]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        transition: "opacity 0.6s ease-in-out",
        opacity: stage === "exit" ? 0 : 1,
        pointerEvents: "none",
      }}
    >
      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: scale(0.95); filter: blur(8px); }
          15% { opacity: 1; transform: scale(1); filter: blur(0px); }
          85% { opacity: 1; transform: scale(1); filter: blur(0px); }
          100% { opacity: 0; transform: scale(1.02); filter: blur(8px); }
        }
        
        .splash-content {
          max-width: 280px;
          width: 80%;
          height: auto;
          object-fit: contain;
          animation: fadeInOut 2.2s ease-in-out forwards;
          user-select: none;
          -webkit-user-drag: none;
        }

        .glow-effect {
          position: absolute;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(255, 100, 0, 0.1) 0%, rgba(0, 0, 0, 0) 70%);
          border-radius: 50%;
          pointer-events: none;
          animation: pulseGlow 4s infinite ease-in-out;
        }

        @keyframes pulseGlow {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }
      `}</style>

      <div className="glow-effect" />

      {stage === "logo" && (
        <img
          src="/assets/splash/logo.png"
          alt="Logo"
          className="splash-content"
          onError={handleFinish}
        />
      )}

      {stage === "brand" && (
        <img
          src="/assets/splash/brand.png"
          alt="Brand"
          className="splash-content"
          onError={handleFinish}
        />
      )}
    </div>
  );
};

export default SplashScreen;
