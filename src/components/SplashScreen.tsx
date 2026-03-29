import { useEffect, useRef } from "react";

const SPLASH_DURATION_MS = 7000;
const SPLASH_VIDEO_SRC = "/video-black.mov";

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(onFinish, SPLASH_DURATION_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onFinish]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const attempt = () => v.play().catch(() => {});
    const p = v.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => setTimeout(attempt, 150));
    }
  }, []);

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
      <style>{`
        .splash-video,
        .splash-video * {
          user-select: none;
          -webkit-user-select: none;
        }
        .splash-video::-webkit-media-controls,
        .splash-video::-webkit-media-controls-enclosure,
        .splash-video::-webkit-media-controls-start-playback-button,
        .splash-video::-webkit-media-controls-play-button {
          display: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
      `}</style>

      <video
        ref={videoRef}
        className="splash-video"
        autoPlay
        muted
        playsInline
        preload="auto"
        loop={false}
        controls={false}
        controlsList="nodownload noremoteplayback nofullscreen noplaybackrate"
        disablePictureInPicture
        disableRemotePlayback
        tabIndex={-1}
        onContextMenu={(e) => e.preventDefault()}
        onMouseDown={(e) => e.preventDefault()}
        onTouchStart={(e) => e.preventDefault()}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          pointerEvents: "none",
          backgroundColor: "#000",
        }}
      >
        <source src={SPLASH_VIDEO_SRC} type="video/quicktime" />
        <source src={SPLASH_VIDEO_SRC} type="video/mp4" />
      </video>
    </div>
  );
};

export default SplashScreen;