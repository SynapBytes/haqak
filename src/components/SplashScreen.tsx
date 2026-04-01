import { useEffect, useState } from "react";

/**
 * SplashScreen Component - Standalone & Resilient
 * This component is designed to be independent of the app's internal state
 * to ensure it always renders and finishes correctly.
 */
const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [stage, setStage] = useState<"logo" | "brand" | "exit">("logo");

  useEffect(() => {
    // Force body background to black during splash
    document.body.style.backgroundColor = "#000";
    
    const logoTimer = setTimeout(() => setStage("brand"), 2000);
    const brandTimer = setTimeout(() => setStage("exit"), 4000);
    const finishTimer = setTimeout(() => {
      document.body.style.backgroundColor = ""; // Reset background
      onFinish();
    }, 4600);

    return () => {
      clearTimeout(logoTimer);
      clearTimeout(brandTimer);
      clearTimeout(finishTimer);
      document.body.style.backgroundColor = "";
    };
  }, [onFinish]);

  return (
    <div
      id="haqak-splash-root"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        backgroundColor: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        transition: "opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
        opacity: stage === "exit" ? 0 : 1,
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <style>{`
        @keyframes splash-entry {
          0% { opacity: 0; transform: scale(0.85); filter: blur(12px); }
          100% { opacity: 1; transform: scale(1); filter: blur(0px); }
        }
        
        @keyframes splash-exit {
          0% { opacity: 1; transform: scale(1); filter: blur(0px); }
          100% { opacity: 0; transform: scale(1.05); filter: blur(12px); }
        }

        .splash-asset {
          max-width: 300px;
          width: 75%;
          height: auto;
          object-fit: contain;
          animation: splash-entry 1s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .splash-asset.exit {
          animation: splash-exit 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .splash-glow-orb {
          position: absolute;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(255, 80, 0, 0.08) 0%, rgba(0, 0, 0, 0) 70%);
          border-radius: 50%;
          pointer-events: none;
          animation: pulse-glow 4s infinite ease-in-out;
        }

        @keyframes pulse-glow {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.15); opacity: 0.7; }
        }
      `}</style>

      <div className="splash-glow-orb" />

      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
        {stage === "logo" && (
          <img
            src="/assets/splash/logo.png"
            alt="HAQAK Logo"
            className="splash-asset"
            key="splash-logo"
          />
        )}

        {stage === "brand" && (
          <img
            src="/assets/splash/brand.png"
            alt="HAQAK Brand"
            className="splash-asset"
            key="splash-brand"
          />
        )}
      </div>
    </div>
  );
};

export default SplashScreen;
