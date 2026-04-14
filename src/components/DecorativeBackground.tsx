import { useTheme } from "@/contexts/ThemeContext";
import { 
  Scale, 
  MessageSquare, 
  ShieldCheck, 
  FileText, 
  Globe, 
  Users, 
  CheckCircle2,
  Zap,
  LayoutGrid
} from "lucide-react";
import { motion } from "framer-motion";

const GeometricPattern = ({ isDark }: { isDark: boolean }) => (
  <svg width="100%" height="100%" className="absolute inset-0 opacity-[0.03] pointer-events-none">
    <pattern
      id="classic-grid"
      x="0"
      y="0"
      width="40"
      height="40"
      patternUnits="userSpaceOnUse"
    >
      <path
        d="M 40 0 L 0 0 0 40"
        fill="none"
        stroke={isDark ? "white" : "black"}
        strokeWidth="0.5"
      />
    </pattern>
    <rect width="100%" height="100%" fill="url(#classic-grid)" />
  </svg>
);

const ModernOrnament = ({
  Icon,
  className,
  isDark,
  darkOpacity = 0.15,
  lightOpacity = 0.08,
}: {
  Icon: any;
  className: string;
  isDark: boolean;
  darkOpacity?: number;
  lightOpacity?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: isDark ? darkOpacity : lightOpacity, scale: 1 }}
    className={`absolute pointer-events-none select-none ${className}`}
  >
    <Icon 
      className="w-full h-full" 
      strokeWidth={1}
      style={{
        filter: isDark
          ? "drop-shadow(0 0 20px hsl(var(--warning) / 0.2))"
          : "drop-shadow(0 10px 15px hsl(var(--primary) / 0.1))",
      }}
    />
  </motion.div>
);

export const HeroDecorations = ({ isDark }: { isDark: boolean }) => (
  <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
    <GeometricPattern isDark={isDark} />
    <ModernOrnament
      Icon={Scale}
      className="top-10 right-4 md:right-10 w-32 md:w-48 lg:w-64"
      isDark={isDark}
    />
    <ModernOrnament
      Icon={ShieldCheck}
      className="top-14 left-4 md:left-10 w-32 md:w-48 lg:w-64"
      isDark={isDark}
    />
    <ModernOrnament
      Icon={Globe}
      className="bottom-10 left-10 w-24 md:w-32"
      isDark={isDark}
    />
    <ModernOrnament
      Icon={MessageSquare}
      className="right-[6%] top-[45%] w-20 md:w-28"
      isDark={isDark}
    />
  </div>
);

export const VisionDecorations = ({ isDark }: { isDark: boolean }) => (
  <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
    <ModernOrnament
      Icon={Users}
      className="right-4 bottom-8 w-40 md:w-56"
      isDark={isDark}
    />
    <ModernOrnament
      Icon={Scale}
      className="left-4 top-8 w-24 md:w-32"
      isDark={isDark}
    />
  </div>
);

export const StepsDecorations = ({ isDark }: { isDark: boolean }) => (
  <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
    <ModernOrnament
      Icon={FileText}
      className="left-2 top-12 w-32 md:w-48"
      isDark={isDark}
    />
    <ModernOrnament
      Icon={CheckCircle2}
      className="right-4 top-8 w-40 md:w-52"
      isDark={isDark}
    />
  </div>
);

export const FeaturesDecorations = ({ isDark }: { isDark: boolean }) => (
  <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
    <ModernOrnament
      Icon={Zap}
      className="left-2 top-10 w-48 md:w-64"
      isDark={isDark}
    />
    <ModernOrnament
      Icon={ShieldCheck}
      className="right-4 bottom-8 w-24 md:w-32"
      isDark={isDark}
    />
  </div>
);

export const SupportDecorations = ({ isDark }: { isDark: boolean }) => (
  <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
    <ModernOrnament
      Icon={MessageSquare}
      className="left-2 top-1/2 w-40 -translate-y-1/2 md:w-60"
      isDark={isDark}
    />
    <ModernOrnament
      Icon={Globe}
      className="right-4 top-10 w-24 md:w-32"
      isDark={isDark}
    />
  </div>
);

export const PartnersDecorations = ({ isDark }: { isDark: boolean }) => (
  <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
    <ModernOrnament
      Icon={Users}
      className="left-1/2 top-4 w-16 -translate-x-1/2 md:w-24"
      isDark={isDark}
    />
  </div>
);

export const CTADecorations = ({ isDark }: { isDark: boolean }) => (
  <div className="absolute inset-0 z-[1] overflow-hidden rounded-[2rem] pointer-events-none">
    <ModernOrnament
      Icon={Zap}
      className="left-5 top-5 w-16 md:w-24"
      isDark={isDark}
      darkOpacity={0.2}
      lightOpacity={0.1}
    />
    <ModernOrnament
      Icon={CheckCircle2}
      className="right-5 bottom-5 w-24 md:w-32"
      isDark={isDark}
      darkOpacity={0.2}
      lightOpacity={0.1}
    />
  </div>
);

export const FooterDecorations = ({ isDark }: { isDark: boolean }) => (
  <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
    <ModernOrnament
      Icon={LayoutGrid}
      className="left-1/2 bottom-0 w-64 -translate-x-1/2 md:w-96"
      isDark={isDark}
      darkOpacity={0.1}
      lightOpacity={0.05}
    />
  </div>
);

const DecorativeBackground = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <GeometricPattern isDark={isDark} />
      <div
        className="absolute -right-32 -top-32 h-[520px] w-[520px] rounded-full"
        style={{
          background: `radial-gradient(circle, hsl(var(--warning) / ${isDark ? 0.09 : 0.05}) 0%, transparent 72%)`,
        }}
      />
      <div
        className="absolute -left-32 -bottom-32 h-[460px] w-[460px] rounded-full"
        style={{
          background: `radial-gradient(circle, hsl(var(--primary) / ${isDark ? 0.05 : 0.03}) 0%, transparent 72%)`,
        }}
      />
    </div>
  );
};

export default DecorativeBackground;
