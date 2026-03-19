import { motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import ornament1 from "@/assets/egyptian-ornament-1.png";
import ornament2 from "@/assets/egyptian-ornament-2.png";
import ornament3 from "@/assets/egyptian-ornament-3.png";
import egyptianScene from "@/assets/egyptian-scene.png";

const DecorativeBackground = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* ── Warm ambient glow ── */}
      <div
        className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(200,149,60,${isDark ? 0.06 : 0.04}) 0%, transparent 70%)`,
        }}
      />
      <div
        className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(34,197,94,${isDark ? 0.04 : 0.03}) 0%, transparent 70%)`,
        }}
      />

      {/* ── Lotus ornament - top right ── */}
      <motion.img
        src={ornament1}
        alt=""
        className="absolute -top-8 -right-8 w-[220px] md:w-[300px] select-none"
        style={{
          opacity: isDark ? 0.12 : 0.08,
          filter: isDark ? "brightness(1.3) drop-shadow(0 0 30px rgba(200,149,60,0.2))" : "none",
        }}
        animate={{ y: [0, -8, 0], rotate: [0, 2, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        draggable={false}
      />

      {/* ── Eye of Horus - left middle ── */}
      <motion.img
        src={ornament2}
        alt=""
        className="absolute top-[40%] -left-12 w-[180px] md:w-[240px] select-none"
        style={{
          opacity: isDark ? 0.1 : 0.06,
          filter: isDark ? "brightness(1.3) drop-shadow(0 0 25px rgba(200,149,60,0.15))" : "none",
        }}
        animate={{ y: [0, 10, 0], rotate: [0, -3, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        draggable={false}
      />

      {/* ── Scarab winged - bottom right ── */}
      <motion.img
        src={ornament3}
        alt=""
        className="absolute bottom-[15%] -right-16 w-[250px] md:w-[350px] select-none"
        style={{
          opacity: isDark ? 0.1 : 0.06,
          filter: isDark ? "brightness(1.2) drop-shadow(0 0 30px rgba(200,149,60,0.15))" : "none",
        }}
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        draggable={false}
      />

      {/* ── Pyramids scene - bottom center ── */}
      <motion.img
        src={egyptianScene}
        alt=""
        className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[500px] md:w-[700px] select-none"
        style={{
          opacity: isDark ? 0.08 : 0.05,
          filter: isDark ? "brightness(1.3) drop-shadow(0 0 40px rgba(200,149,60,0.1))" : "none",
        }}
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        draggable={false}
      />

      {/* ── Lotus ornament mirror - bottom left ── */}
      <motion.img
        src={ornament1}
        alt=""
        className="absolute bottom-[55%] -left-16 w-[140px] md:w-[180px] select-none"
        style={{
          opacity: isDark ? 0.07 : 0.04,
          transform: "scaleX(-1)",
          filter: isDark ? "brightness(1.2) drop-shadow(0 0 20px rgba(200,149,60,0.1))" : "none",
        }}
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 6 }}
        draggable={false}
      />

      {/* ── Eye of Horus - top left small ── */}
      <motion.img
        src={ornament2}
        alt=""
        className="absolute top-[10%] left-[15%] w-[80px] md:w-[110px] select-none"
        style={{
          opacity: isDark ? 0.06 : 0.035,
          filter: isDark ? "brightness(1.3)" : "none",
        }}
        animate={{ rotate: [0, 5, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        draggable={false}
      />

      {/* ── Subtle golden line separator ── */}
      <div
        className="absolute top-[30%] left-[10%] right-[10%] h-px"
        style={{
          background: `linear-gradient(90deg, transparent, rgba(200,149,60,${isDark ? 0.08 : 0.05}), transparent)`,
        }}
      />
      <div
        className="absolute top-[65%] left-[5%] right-[5%] h-px"
        style={{
          background: `linear-gradient(90deg, transparent, rgba(200,149,60,${isDark ? 0.06 : 0.04}), transparent)`,
        }}
      />

      {/* ── Dark mode extra glow ── */}
      {isDark && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(200,149,60,0.03) 0%, transparent 60%)",
          }}
        />
      )}
    </div>
  );
};

export default DecorativeBackground;
