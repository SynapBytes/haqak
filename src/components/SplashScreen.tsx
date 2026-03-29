import { useEffect, useRef } from "react";

// SPLASH_DURATION_MS controls how long the splash screen is shown before
// redirecting to the landing page. Adjust this value to change the duration.
const SPLASH_DURATION_MS = 7000;

const SPLASH_VIDEO_SRC = "/video-black.mov";

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(onFinish, SPLASH_DURATION_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onFinish]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "#000",
        overflow: "hidden",
      }}
    >
      <video
        autoPlay
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      >
        <source src={SPLASH_VIDEO_SRC} type="video/quicktime" />
        <source src={SPLASH_VIDEO_SRC} type="video/mp4" />
      </video>
    </div>
  );
};

export default SplashScreen;

