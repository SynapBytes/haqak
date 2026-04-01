import { useEffect, useState } from "react";

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [stage, setStage] = useState<"logo" | "brand" | "exit">("logo");

  useEffect(() => {
    // المرحلة الأولى: عرض اللوجو (الريشة) لمدة 1.5 ثانية
    const logoTimer = setTimeout(() => {
      setStage("brand");
    }, 1800);

    // المرحلة الثانية: عرض اسم البراند (HAQAK) لمدة 1.5 ثانية
    const brandTimer = setTimeout(() => {
      setStage("exit");
    }, 3600);

    // إنهاء الشاشة الترحيبية
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
          0% { opacity: 0; transform: scale(0.9); filter: blur(10px); }
          20% { opacity: 1; transform: scale(1); filter: blur(0px); }
          80% { opacity: 1; transform: scale(1); filter: blur(0px); }
          100% { opacity: 0; transform: scale(1.05); filter: blur(10px); }
        }
        
        .splash-content {
          max-width: 80%;
          max-height: 60%;
          object-fit: contain;
          animation: fadeInOut 2s ease-in-out forwards;
        }

        .glow-effect {
          position: absolute;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(255, 69, 0, 0.15) 0%, rgba(0, 0, 0, 0) 70%);
          border-radius: 50%;
          pointer-events: none;
        }
      `}</style>

      <div className="glow-effect" />

      {stage === "logo" && (
        <img
          src="/assets/splash/logo.png"
          alt="Logo"
          className="splash-content"
        />
      )}

      {stage === "brand" && (
        <img
          src="/assets/splash/brand.png"
          alt="Brand"
          className="splash-content"
        />
      )}
    </div>
  );
};

export default SplashScreen;
