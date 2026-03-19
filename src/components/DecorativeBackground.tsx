import { motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";

// Egyptian artwork imports
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

/** Shared image styling helper */
const deco = (isDark: boolean, opacity: [number, number]) => ({
  opacity: isDark ? opacity[0] : opacity[1],
  filter: isDark
    ? "brightness(1.4) drop-shadow(0 0 30px rgba(200,149,60,0.2))"
    : "sepia(0.15) brightness(1.05)",
});

/** Reusable floating Egyptian ornament */
const EgyptianOrnament = ({
  src,
  className,
  isDark,
  opacity = [0.15, 0.1],
  animate = {},
  transition = {},
}: {
  src: string;
  className: string;
  isDark: boolean;
  opacity?: [number, number];
  animate?: object;
  transition?: object;
}) => (
  <motion.img
    src={src}
    alt=""
    className={`absolute select-none pointer-events-none ${className}`}
    style={deco(isDark, opacity)}
    initial={{ opacity: 0 }}
    whileInView={{ opacity: isDark ? opacity[0] : opacity[1] }}
    viewport={{ once: true, margin: "-50px" }}
    animate={animate}
    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", ...transition }}
    draggable={false}
    loading="lazy"
  />
);

/** Golden divider between sections */
export const EgyptianDividerLine = ({ isDark }: { isDark: boolean }) => (
  <div className="relative w-full overflow-hidden pointer-events-none" style={{ height: "40px" }}>
    <motion.img
      src={egyptianDivider}
      alt=""
      className="w-full h-full object-cover select-none"
      style={{
        opacity: isDark ? 0.15 : 0.1,
        filter: isDark ? "brightness(1.3)" : "sepia(0.1)",
      }}
      initial={{ opacity: 0, scaleX: 0.5 }}
      whileInView={{ opacity: isDark ? 0.15 : 0.1, scaleX: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1, ease: "easeOut" }}
      draggable={false}
    />
  </div>
);

/** ═══ HERO section decorations ═══ */
export const HeroDecorations = ({ isDark }: { isDark: boolean }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    {/* Eye of Horus — top right */}
    <EgyptianOrnament
      src={ornament2}
      className="top-4 -right-8 w-[160px] md:w-[220px] lg:w-[280px]"
      isDark={isDark}
      opacity={[0.13, 0.08]}
      animate={{ y: [0, -8, 0], rotate: [0, 2, 0] }}
    />
    {/* Pyramids & Nile — bottom center */}
    <EgyptianOrnament
      src={egyptianScene}
      className="-bottom-6 left-1/2 -translate-x-1/2 w-[400px] md:w-[600px] lg:w-[800px]"
      isDark={isDark}
      opacity={[0.1, 0.06]}
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 20 }}
    />
    {/* Scarab winged — top left */}
    <EgyptianOrnament
      src={ornament3}
      className="-top-4 -left-16 w-[180px] md:w-[250px] lg:w-[320px]"
      isDark={isDark}
      opacity={[0.1, 0.06]}
      animate={{ y: [0, 6, 0] }}
      transition={{ duration: 18, delay: 3 }}
    />
    {/* Ankh — bottom right */}
    <EgyptianOrnament
      src={egyptianAnkh}
      className="bottom-[10%] right-[5%] w-[60px] md:w-[90px]"
      isDark={isDark}
      opacity={[0.1, 0.06]}
      animate={{ y: [0, -10, 0], rotate: [0, 5, 0] }}
      transition={{ duration: 12, delay: 1 }}
    />
    {/* Lotus — bottom left */}
    <EgyptianOrnament
      src={ornament1}
      className="bottom-[15%] -left-8 w-[100px] md:w-[140px]"
      isDark={isDark}
      opacity={[0.08, 0.05]}
      animate={{ y: [0, 8, 0] }}
      transition={{ duration: 14, delay: 5 }}
    />
  </div>
);

/** ═══ VISION section decorations ═══ */
export const VisionDecorations = ({ isDark }: { isDark: boolean }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    {/* Nefertiti — right side */}
    <EgyptianOrnament
      src={egyptianNefertiti}
      className="top-1/2 -translate-y-1/2 -right-12 w-[140px] md:w-[200px] lg:w-[250px]"
      isDark={isDark}
      opacity={[0.1, 0.06]}
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 16 }}
    />
    {/* Ankh — left side */}
    <EgyptianOrnament
      src={egyptianAnkh}
      className="top-[20%] -left-6 w-[70px] md:w-[100px]"
      isDark={isDark}
      opacity={[0.08, 0.05]}
      animate={{ y: [0, 8, 0], rotate: [0, -3, 0] }}
      transition={{ duration: 14, delay: 2 }}
    />
  </div>
);

/** ═══ HOW IT WORKS section decorations ═══ */
export const StepsDecorations = ({ isDark }: { isDark: boolean }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    {/* Pharaoh mask — right */}
    <EgyptianOrnament
      src={egyptianCobra}
      className="top-[10%] -right-16 w-[130px] md:w-[180px] lg:w-[220px]"
      isDark={isDark}
      opacity={[0.1, 0.06]}
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 18 }}
    />
    {/* Lotus — left bottom */}
    <EgyptianOrnament
      src={ornament1}
      className="bottom-[5%] -left-10 w-[100px] md:w-[150px]"
      isDark={isDark}
      opacity={[0.08, 0.05]}
      animate={{ y: [0, 6, 0], rotate: [0, 3, 0] }}
      transition={{ duration: 16, delay: 4 }}
    />
    {/* Eye of Horus small — center top */}
    <EgyptianOrnament
      src={ornament2}
      className="top-[5%] left-1/2 -translate-x-1/2 w-[60px] md:w-[80px]"
      isDark={isDark}
      opacity={[0.06, 0.04]}
      animate={{ rotate: [0, 5, 0] }}
      transition={{ duration: 20, delay: 2 }}
    />
  </div>
);

/** ═══ FEATURES section decorations ═══ */
export const FeaturesDecorations = ({ isDark }: { isDark: boolean }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    {/* Scarab — left */}
    <EgyptianOrnament
      src={ornament3}
      className="top-1/2 -translate-y-1/2 -left-20 w-[160px] md:w-[220px] lg:w-[280px]"
      isDark={isDark}
      opacity={[0.08, 0.05]}
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 20 }}
    />
    {/* Ankh — right top */}
    <EgyptianOrnament
      src={egyptianAnkh}
      className="top-[10%] -right-4 w-[60px] md:w-[80px]"
      isDark={isDark}
      opacity={[0.08, 0.05]}
      animate={{ y: [0, 10, 0] }}
      transition={{ duration: 14, delay: 3 }}
    />
    {/* Nefertiti — bottom right small */}
    <EgyptianOrnament
      src={egyptianNefertiti}
      className="bottom-[5%] right-[3%] w-[80px] md:w-[120px]"
      isDark={isDark}
      opacity={[0.06, 0.04]}
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 16, delay: 6 }}
    />
  </div>
);

/** ═══ SUPPORT/CONTACT section decorations ═══ */
export const SupportDecorations = ({ isDark }: { isDark: boolean }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    {/* Papyrus scroll — left */}
    <EgyptianOrnament
      src={egyptianPapyrus}
      className="top-1/2 -translate-y-1/2 -left-16 w-[150px] md:w-[220px] lg:w-[280px]"
      isDark={isDark}
      opacity={[0.12, 0.08]}
      animate={{ y: [0, -6, 0], rotate: [0, 2, 0] }}
      transition={{ duration: 18 }}
    />
    {/* Pharaoh border — right */}
    <EgyptianOrnament
      src={egyptianBorder}
      className="top-[20%] -right-20 w-[100px] md:w-[150px] rotate-90"
      isDark={isDark}
      opacity={[0.08, 0.05]}
      animate={{ y: [0, 5, 0] }}
      transition={{ duration: 14, delay: 2 }}
    />
    {/* Lotus — bottom center */}
    <EgyptianOrnament
      src={ornament1}
      className="bottom-[5%] left-1/2 -translate-x-1/2 w-[80px] md:w-[100px]"
      isDark={isDark}
      opacity={[0.06, 0.04]}
      animate={{ y: [0, 6, 0] }}
      transition={{ duration: 12, delay: 4 }}
    />
  </div>
);

/** ═══ CTA section decorations ═══ */
export const CTADecorations = ({ isDark }: { isDark: boolean }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 rounded-[2rem]">
    {/* Eye of Horus — top right */}
    <EgyptianOrnament
      src={ornament2}
      className="top-4 -right-6 w-[80px] md:w-[120px]"
      isDark={isDark}
      opacity={[0.15, 0.12]}
      animate={{ rotate: [0, 5, 0] }}
      transition={{ duration: 16 }}
    />
    {/* Ankh — bottom left */}
    <EgyptianOrnament
      src={egyptianAnkh}
      className="bottom-4 -left-4 w-[50px] md:w-[70px]"
      isDark={isDark}
      opacity={[0.12, 0.1]}
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 12, delay: 2 }}
    />
  </div>
);

/** ═══ FOOTER section decorations ═══ */
export const FooterDecorations = ({ isDark }: { isDark: boolean }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    {/* Pyramids scene — center bottom */}
    <EgyptianOrnament
      src={egyptianScene}
      className="bottom-0 left-1/2 -translate-x-1/2 w-[300px] md:w-[500px]"
      isDark={isDark}
      opacity={[0.06, 0.04]}
    />
  </div>
);

/** Main wrapper — no longer fixed, just provides subtle global ambient */
const DecorativeBackground = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Subtle warm ambient glow only */}
      <div
        className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(200,149,60,${isDark ? 0.04 : 0.025}) 0%, transparent 70%)`,
        }}
      />
      <div
        className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(34,197,94,${isDark ? 0.03 : 0.02}) 0%, transparent 70%)`,
        }}
      />
      {isDark && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(200,149,60,0.02) 0%, transparent 60%)",
          }}
        />
      )}
    </div>
  );
};

export default DecorativeBackground;
