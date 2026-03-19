import { motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";

const DecorativeBackground = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Opacity multiplier for dark vs light
  const o = isDark ? 1 : 0.7;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* ── Large golden gradient orbs ── */}
      <motion.div
        className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(200,149,60,${0.08 * o}) 0%, rgba(200,149,60,${0.02 * o}) 50%, transparent 70%)`,
        }}
        animate={{ scale: [1, 1.15, 1], x: [0, 20, 0], y: [0, 15, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(34,197,94,${0.06 * o}) 0%, rgba(34,197,94,${0.01 * o}) 50%, transparent 70%)`,
        }}
        animate={{ scale: [1, 1.1, 1], x: [0, -15, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(232,197,102,${0.05 * o}) 0%, transparent 60%)`,
        }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-[15%] left-[20%] w-[350px] h-[350px] rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(239,68,68,${0.04 * o}) 0%, transparent 60%)`,
        }}
        animate={{ scale: [1, 1.15, 1], y: [0, -20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* ── Islamic geometric SVG patterns ── */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c8953c" stopOpacity={0.12 * o} />
            <stop offset="100%" stopColor="#e8c566" stopOpacity={0.04 * o} />
          </linearGradient>
          <linearGradient id="green-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.08 * o} />
            <stop offset="100%" stopColor="#16a34a" stopOpacity={0.03 * o} />
          </linearGradient>
          <linearGradient id="warm-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.07 * o} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.03 * o} />
          </linearGradient>
        </defs>

        {/* Hexagons scattered */}
        {[
          { cx: "8%", cy: "12%", r: 35, rot: 0, grad: "gold-grad", delay: 0 },
          { cx: "92%", cy: "8%", r: 25, rot: 30, grad: "green-grad", delay: 2 },
          { cx: "85%", cy: "55%", r: 30, rot: 15, grad: "gold-grad", delay: 1 },
          { cx: "12%", cy: "65%", r: 22, rot: 45, grad: "warm-grad", delay: 3 },
          { cx: "75%", cy: "85%", r: 28, rot: 10, grad: "green-grad", delay: 1.5 },
          { cx: "45%", cy: "92%", r: 20, rot: 60, grad: "gold-grad", delay: 2.5 },
          { cx: "30%", cy: "35%", r: 18, rot: 20, grad: "warm-grad", delay: 4 },
          { cx: "65%", cy: "25%", r: 24, rot: 50, grad: "gold-grad", delay: 0.5 },
        ].map((h, i) => (
          <motion.g
            key={`hex-${i}`}
            animate={{ rotate: [h.rot, h.rot + 60, h.rot], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 20 + i * 2, repeat: Infinity, ease: "easeInOut", delay: h.delay }}
            style={{ originX: h.cx, originY: h.cy }}
          >
            <polygon
              points={hexPoints(parseFloat(h.cx) / 100 * 1920, parseFloat(h.cy) / 100 * 1080, h.r)}
              fill="none"
              stroke={`url(#${h.grad})`}
              strokeWidth="1"
            />
          </motion.g>
        ))}

        {/* Elegant Bezier curves */}
        <motion.path
          d="M0,200 Q400,100 800,300 T1600,200"
          fill="none"
          stroke={`rgba(200,149,60,${0.06 * o})`}
          strokeWidth="1.5"
          animate={{ pathLength: [0, 1], opacity: [0, 0.8, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.path
          d="M1920,400 Q1400,200 900,500 T0,350"
          fill="none"
          stroke={`rgba(34,197,94,${0.05 * o})`}
          strokeWidth="1"
          animate={{ pathLength: [0, 1], opacity: [0, 0.6, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        />
        <motion.path
          d="M200,900 Q600,700 1000,850 T1800,750"
          fill="none"
          stroke={`rgba(232,197,102,${0.05 * o})`}
          strokeWidth="1"
          animate={{ pathLength: [0, 1], opacity: [0, 0.7, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        />
      </svg>

      {/* ── Diamond shapes ── */}
      {[
        { x: "18%", y: "22%", size: 12, color: `rgba(200,149,60,${0.15 * o})`, delay: 0 },
        { x: "82%", y: "18%", size: 8, color: `rgba(34,197,94,${0.12 * o})`, delay: 1 },
        { x: "90%", y: "72%", size: 10, color: `rgba(232,197,102,${0.13 * o})`, delay: 2 },
        { x: "5%", y: "80%", size: 14, color: `rgba(239,68,68,${0.08 * o})`, delay: 1.5 },
        { x: "55%", y: "10%", size: 9, color: `rgba(200,149,60,${0.1 * o})`, delay: 3 },
        { x: "40%", y: "75%", size: 11, color: `rgba(34,197,94,${0.09 * o})`, delay: 2.5 },
      ].map((d, i) => (
        <motion.div
          key={`diamond-${i}`}
          className="absolute"
          style={{
            left: d.x,
            top: d.y,
            width: d.size,
            height: d.size,
            backgroundColor: d.color,
            transform: "rotate(45deg)",
          }}
          animate={{
            y: [0, -15, 0],
            opacity: [0.5, 1, 0.5],
            rotate: [45, 90, 45],
          }}
          transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut", delay: d.delay }}
        />
      ))}

      {/* ── Ring shapes ── */}
      {[
        { x: "25%", y: "45%", size: 60, color: `rgba(200,149,60,${0.06 * o})`, delay: 0 },
        { x: "70%", y: "35%", size: 45, color: `rgba(34,197,94,${0.05 * o})`, delay: 2 },
        { x: "50%", y: "70%", size: 55, color: `rgba(232,197,102,${0.04 * o})`, delay: 1 },
        { x: "15%", y: "90%", size: 40, color: `rgba(239,68,68,${0.04 * o})`, delay: 3 },
      ].map((r, i) => (
        <motion.div
          key={`ring-${i}`}
          className="absolute rounded-full border-2"
          style={{
            left: r.x,
            top: r.y,
            width: r.size,
            height: r.size,
            borderColor: r.color,
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{ duration: 8 + i * 2, repeat: Infinity, ease: "easeInOut", delay: r.delay }}
        />
      ))}

      {/* ── Sparkle / shimmer dots ── */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={`sparkle-${i}`}
          className="absolute rounded-full"
          style={{
            left: `${5 + Math.random() * 90}%`,
            top: `${5 + Math.random() * 90}%`,
            width: 2 + Math.random() * 3,
            height: 2 + Math.random() * 3,
            backgroundColor: [
              `rgba(200,149,60,${0.25 * o})`,
              `rgba(232,197,102,${0.2 * o})`,
              `rgba(34,197,94,${0.15 * o})`,
              `rgba(239,68,68,${0.1 * o})`,
            ][i % 4],
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1.5, 0.5],
          }}
          transition={{
            duration: 3 + Math.random() * 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 5,
          }}
        />
      ))}

      {/* ── Dot pattern overlay ── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(200,149,60,${0.04 * o}) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* ── Dark mode glow effects ── */}
      {isDark && (
        <>
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px]"
            style={{
              background: "radial-gradient(ellipse, rgba(200,149,60,0.04) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute bottom-0 left-1/4 w-[600px] h-[300px]"
            style={{
              background: "radial-gradient(ellipse, rgba(34,197,94,0.03) 0%, transparent 70%)",
            }}
          />
        </>
      )}
    </div>
  );
};

// Helper: generate hexagon points
function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 })
    .map((_, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    })
    .join(" ");
}

export default DecorativeBackground;
