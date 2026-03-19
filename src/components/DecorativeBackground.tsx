import { motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";

import ornament1 from "@/assets/egyptian-ornament-1.png";
import ornament2 from "@/assets/egyptian-ornament-2.png";
import ornament3 from "@/assets/egyptian-ornament-3.png";
import egyptianScene from "@/assets/egyptian-scene.png";
import egyptianAnkh from "@/assets/egyptian-ankh.png";
import egyptianPapyrus from "@/assets/egyptian-papyrus.png";
import egyptianNefertiti from "@/assets/egyptian-nefertiti.png";
import egyptianDivider from "@/assets/egyptian-divider.png";
import egyptianCobra from "@/assets/egyptian-cobra.png";
import egyptianBorder from "@/assets/egyptian-border.png";

/** Reusable ornament with proper visibility */
const Ornament = ({
  src,
  className,
  isDark,
  darkOpacity = 0.3,
  lightOpacity = 0.18,
  animateProps,
  transition = {},
}: {
  src: string;
  className: string;
  isDark: boolean;
  darkOpacity?: number;
  lightOpacity?: number;
  animateProps?: Record<string, number[]>;
  transition?: object;
}) => (
  <motion.img
    src={src}
    alt=""
    className={`absolute select-none pointer-events-none ${className}`}
    style={{
      opacity: isDark ? darkOpacity : lightOpacity,
      filter: isDark
        ? "brightness(1.5) drop-shadow(0 0 40px rgba(200,149,60,0.35))"
        : "drop-shadow(0 4px 20px rgba(200,149,60,0.15))",
    }}
    initial={{ opacity: 0, scale: 0.9 }}
    whileInView={{
      opacity: isDark ? darkOpacity : lightOpacity,
      scale: 1,
    }}
    viewport={{ once: true, margin: "-30px" }}
    animate={animateProps}
    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", ...transition }}
    draggable={false}
    loading="lazy"
  />
);

/** Golden lotus divider */
export const EgyptianDividerLine = ({ isDark }: { isDark: boolean }) => (
  <div className="relative w-full pointer-events-none py-2">
    <motion.img
      src={egyptianDivider}
      alt=""
      className="w-full h-[50px] md:h-[60px] object-cover select-none"
      style={{
        opacity: isDark ? 0.25 : 0.18,
        filter: isDark ? "brightness(1.4) drop-shadow(0 0 15px rgba(200,149,60,0.2))" : "none",
      }}
      initial={{ opacity: 0, scaleX: 0.6 }}
      whileInView={{ opacity: isDark ? 0.25 : 0.18, scaleX: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      draggable={false}
    />
  </div>
);

/* ═══════════════════════════════════════════════
   HERO — عين حورس + أهرامات + جعران + عنخ + لوتس
   ═══════════════════════════════════════════════ */
export const HeroDecorations = ({ isDark }: { isDark: boolean }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
    {/* عين حورس — أعلى يمين */}
    <Ornament
      src={ornament2}
      className="top-8 right-4 md:right-8 w-[200px] md:w-[280px] lg:w-[350px]"
      isDark={isDark}
      darkOpacity={0.22}
      lightOpacity={0.13}
      animateProps={{ y: [0, -10, 0], rotate: [0, 3, 0] }}
      transition={{ duration: 12 }}
    />
    {/* الأهرامات — أسفل المنتصف */}
    <Ornament
      src={egyptianScene}
      className="bottom-0 left-1/2 -translate-x-1/2 w-[500px] md:w-[700px] lg:w-[900px]"
      isDark={isDark}
      darkOpacity={0.18}
      lightOpacity={0.1}
      animateProps={{ y: [0, -5, 0] }}
      transition={{ duration: 20 }}
    />
    {/* الجعران المجنح — أعلى يسار */}
    <Ornament
      src={ornament3}
      className="top-12 left-4 md:left-12 w-[220px] md:w-[300px] lg:w-[380px]"
      isDark={isDark}
      darkOpacity={0.18}
      lightOpacity={0.1}
      animateProps={{ y: [0, 8, 0] }}
      transition={{ duration: 18, delay: 2 }}
    />
    {/* العنخ — يمين وسط */}
    <Ornament
      src={egyptianAnkh}
      className="bottom-[20%] right-[8%] w-[80px] md:w-[120px] lg:w-[150px]"
      isDark={isDark}
      darkOpacity={0.2}
      lightOpacity={0.12}
      animateProps={{ y: [0, -12, 0], rotate: [0, 5, 0] }}
      transition={{ duration: 10, delay: 1 }}
    />
    {/* زهرة اللوتس — يسار أسفل */}
    <Ornament
      src={ornament1}
      className="bottom-[12%] left-[5%] w-[120px] md:w-[170px] lg:w-[200px]"
      isDark={isDark}
      darkOpacity={0.15}
      lightOpacity={0.09}
      animateProps={{ y: [0, 10, 0] }}
      transition={{ duration: 14, delay: 4 }}
    />
  </div>
);

/* ═══════════════════════════════════
   VISION — نفرتيتي + عنخ + كوبرا
   ═══════════════════════════════════ */
export const VisionDecorations = ({ isDark }: { isDark: boolean }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    {/* نفرتيتي — يمين */}
    <Ornament
      src={egyptianNefertiti}
      className="top-1/2 -translate-y-1/2 right-2 md:right-8 w-[180px] md:w-[250px] lg:w-[320px]"
      isDark={isDark}
      darkOpacity={0.2}
      lightOpacity={0.12}
      animateProps={{ y: [0, -8, 0] }}
      transition={{ duration: 16 }}
    />
    {/* العنخ — يسار */}
    <Ornament
      src={egyptianAnkh}
      className="top-[15%] left-4 md:left-12 w-[90px] md:w-[130px] lg:w-[160px]"
      isDark={isDark}
      darkOpacity={0.18}
      lightOpacity={0.1}
      animateProps={{ y: [0, 10, 0], rotate: [0, -4, 0] }}
      transition={{ duration: 14, delay: 2 }}
    />
    {/* قناع فرعوني صغير — أسفل يسار */}
    <Ornament
      src={egyptianCobra}
      className="bottom-[10%] left-[10%] w-[80px] md:w-[110px]"
      isDark={isDark}
      darkOpacity={0.12}
      lightOpacity={0.07}
      animateProps={{ y: [0, 6, 0] }}
      transition={{ duration: 18, delay: 5 }}
    />
  </div>
);

/* ═══════════════════════════════════════════
   STEPS — فرعون + لوتس + عين حورس + بردية
   ═══════════════════════════════════════════ */
export const StepsDecorations = ({ isDark }: { isDark: boolean }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    {/* قناع الفرعون — يمين */}
    <Ornament
      src={egyptianCobra}
      className="top-[8%] right-4 md:right-12 w-[160px] md:w-[220px] lg:w-[280px]"
      isDark={isDark}
      darkOpacity={0.2}
      lightOpacity={0.12}
      animateProps={{ y: [0, -6, 0] }}
      transition={{ duration: 18 }}
    />
    {/* زهرة اللوتس — يسار أسفل */}
    <Ornament
      src={ornament1}
      className="bottom-[8%] left-4 md:left-12 w-[130px] md:w-[180px] lg:w-[220px]"
      isDark={isDark}
      darkOpacity={0.16}
      lightOpacity={0.1}
      animateProps={{ y: [0, 8, 0], rotate: [0, 3, 0] }}
      transition={{ duration: 16, delay: 3 }}
    />
    {/* عين حورس صغيرة — وسط أعلى */}
    <Ornament
      src={ornament2}
      className="top-[5%] left-1/2 -translate-x-1/2 w-[80px] md:w-[110px]"
      isDark={isDark}
      darkOpacity={0.14}
      lightOpacity={0.08}
      animateProps={{ rotate: [0, 5, 0] }}
      transition={{ duration: 20, delay: 2 }}
    />
    {/* بردية — يسار وسط */}
    <Ornament
      src={egyptianPapyrus}
      className="top-1/2 -translate-y-1/2 left-0 w-[100px] md:w-[140px]"
      isDark={isDark}
      darkOpacity={0.12}
      lightOpacity={0.07}
      animateProps={{ y: [0, -5, 0] }}
      transition={{ duration: 14, delay: 6 }}
    />
  </div>
);

/* ═══════════════════════════════════════════════
   FEATURES — جعران + عنخ + نفرتيتي + لوتس
   ═══════════════════════════════════════════════ */
export const FeaturesDecorations = ({ isDark }: { isDark: boolean }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    {/* الجعران — يسار */}
    <Ornament
      src={ornament3}
      className="top-[15%] left-2 md:left-8 w-[200px] md:w-[280px] lg:w-[350px]"
      isDark={isDark}
      darkOpacity={0.16}
      lightOpacity={0.09}
      animateProps={{ y: [0, -8, 0] }}
      transition={{ duration: 20 }}
    />
    {/* العنخ — يمين أعلى */}
    <Ornament
      src={egyptianAnkh}
      className="top-[10%] right-4 md:right-12 w-[80px] md:w-[120px] lg:w-[150px]"
      isDark={isDark}
      darkOpacity={0.18}
      lightOpacity={0.1}
      animateProps={{ y: [0, 12, 0] }}
      transition={{ duration: 14, delay: 2 }}
    />
    {/* نفرتيتي — أسفل يمين */}
    <Ornament
      src={egyptianNefertiti}
      className="bottom-[5%] right-4 md:right-12 w-[120px] md:w-[170px] lg:w-[220px]"
      isDark={isDark}
      darkOpacity={0.14}
      lightOpacity={0.08}
      animateProps={{ y: [0, -6, 0] }}
      transition={{ duration: 16, delay: 5 }}
    />
    {/* لوتس — أسفل يسار */}
    <Ornament
      src={ornament1}
      className="bottom-[10%] left-[5%] w-[100px] md:w-[140px]"
      isDark={isDark}
      darkOpacity={0.12}
      lightOpacity={0.07}
      animateProps={{ y: [0, 6, 0] }}
      transition={{ duration: 12, delay: 7 }}
    />
  </div>
);

/* ═══════════════════════════════════════════════════
   SUPPORT — بردية + قناع فرعون + لوتس + عين حورس
   ═══════════════════════════════════════════════════ */
export const SupportDecorations = ({ isDark }: { isDark: boolean }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    {/* البردية — يسار كبيرة */}
    <Ornament
      src={egyptianPapyrus}
      className="top-1/2 -translate-y-1/2 left-2 md:left-8 w-[180px] md:w-[260px] lg:w-[320px]"
      isDark={isDark}
      darkOpacity={0.22}
      lightOpacity={0.14}
      animateProps={{ y: [0, -8, 0], rotate: [0, 2, 0] }}
      transition={{ duration: 18 }}
    />
    {/* قناع الفرعون — يمين */}
    <Ornament
      src={egyptianCobra}
      className="top-[15%] right-4 md:right-12 w-[140px] md:w-[190px] lg:w-[240px]"
      isDark={isDark}
      darkOpacity={0.18}
      lightOpacity={0.1}
      animateProps={{ y: [0, 6, 0] }}
      transition={{ duration: 16, delay: 3 }}
    />
    {/* لوتس — أسفل وسط */}
    <Ornament
      src={ornament1}
      className="bottom-[5%] left-1/2 -translate-x-1/2 w-[110px] md:w-[150px]"
      isDark={isDark}
      darkOpacity={0.14}
      lightOpacity={0.08}
      animateProps={{ y: [0, 8, 0] }}
      transition={{ duration: 12, delay: 5 }}
    />
    {/* عين حورس — أسفل يمين */}
    <Ornament
      src={ornament2}
      className="bottom-[15%] right-[5%] w-[80px] md:w-[110px]"
      isDark={isDark}
      darkOpacity={0.12}
      lightOpacity={0.07}
      animateProps={{ rotate: [0, -5, 0] }}
      transition={{ duration: 20, delay: 7 }}
    />
  </div>
);

/* ═══════════════════
   CTA — عين + عنخ
   ═══════════════════ */
export const CTADecorations = ({ isDark }: { isDark: boolean }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1] rounded-[2rem]">
    <Ornament
      src={ornament2}
      className="top-4 right-4 w-[100px] md:w-[150px]"
      isDark={isDark}
      darkOpacity={0.25}
      lightOpacity={0.18}
      animateProps={{ rotate: [0, 5, 0] }}
      transition={{ duration: 16 }}
    />
    <Ornament
      src={egyptianAnkh}
      className="bottom-4 left-4 w-[60px] md:w-[90px]"
      isDark={isDark}
      darkOpacity={0.2}
      lightOpacity={0.15}
      animateProps={{ y: [0, -6, 0] }}
      transition={{ duration: 12, delay: 2 }}
    />
    <Ornament
      src={ornament1}
      className="top-1/2 -translate-y-1/2 left-8 w-[70px] md:w-[100px]"
      isDark={isDark}
      darkOpacity={0.15}
      lightOpacity={0.1}
      animateProps={{ y: [0, 8, 0] }}
      transition={{ duration: 14, delay: 4 }}
    />
  </div>
);

/* ═══════════════════════════════
   FOOTER — أهرامات + جعران
   ═══════════════════════════════ */
export const FooterDecorations = ({ isDark }: { isDark: boolean }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    <Ornament
      src={egyptianScene}
      className="bottom-0 left-1/2 -translate-x-1/2 w-[400px] md:w-[600px]"
      isDark={isDark}
      darkOpacity={0.12}
      lightOpacity={0.07}
    />
    <Ornament
      src={ornament3}
      className="top-[10%] right-4 w-[100px] md:w-[150px]"
      isDark={isDark}
      darkOpacity={0.1}
      lightOpacity={0.06}
      animateProps={{ y: [0, -4, 0] }}
      transition={{ duration: 16 }}
    />
  </div>
);

/** Ambient background glow */
const DecorativeBackground = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <div
        className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(200,149,60,${isDark ? 0.06 : 0.035}) 0%, transparent 70%)`,
        }}
      />
      <div
        className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(34,197,94,${isDark ? 0.04 : 0.025}) 0%, transparent 70%)`,
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(200,149,60,${isDark ? 0.03 : 0.015}) 0%, transparent 60%)`,
        }}
      />
    </div>
  );
};

export default DecorativeBackground;
