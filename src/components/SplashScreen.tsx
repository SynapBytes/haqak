import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [phase, setPhase] = useState<"logo" | "text" | "exit">("logo");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("text"), 800);
    const t2 = setTimeout(() => setPhase("exit"), 2400);
    const t3 = setTimeout(onFinish, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onFinish]);

  return (
    <AnimatePresence>
      {phase !== "exit" && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: "linear-gradient(160deg, #0a1628 0%, #0d1f3c 40%, #0a1628 100%)" }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          {/* Ambient glow */}
          <motion.div
            className="absolute w-[500px] h-[500px] rounded-full opacity-20 blur-[120px]"
            style={{ background: "radial-gradient(circle, #c8953c 0%, transparent 70%)" }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Subtle grid lines */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "linear-gradient(rgba(200,149,60,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(200,149,60,0.3) 1px, transparent 1px)",
              backgroundSize: "60px 60px"
            }}
          />

          {/* Logo */}
          <motion.div
            className="relative"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Ring pulse */}
            <motion.div
              className="absolute inset-[-20px] rounded-full border border-[#c8953c]/20"
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute inset-[-40px] rounded-full border border-[#c8953c]/10"
              animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0, 0.2] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
            />

            <img
              src="/logo-sawtak.webp"
              alt="صوتك"
              className="w-24 h-24 md:w-28 md:h-28 rounded-2xl object-contain drop-shadow-[0_0_40px_rgba(200,149,60,0.3)]"
            />
          </motion.div>

          {/* App name */}
          <motion.div
            className="mt-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={phase === "text" ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h1
              className="text-3xl md:text-4xl font-bold tracking-tight"
              style={{
                background: "linear-gradient(135deg, #e8c566 0%, #c8953c 50%, #e8c566 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              صوتك
            </h1>
            <p className="text-sm text-[#8a9bb5] mt-2 font-light tracking-wide">
              منصة التواصل المدني
            </p>
          </motion.div>

          {/* Loader */}
          <motion.div
            className="absolute bottom-16 flex items-center gap-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-[#c8953c]"
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
