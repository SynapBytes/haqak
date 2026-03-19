import { useTheme } from "@/contexts/ThemeContext";

import ornament1 from "@/assets/egyptian-ornament-1.png";
import ornament2 from "@/assets/egyptian-ornament-2.png";
import ornament3 from "@/assets/egyptian-ornament-3.png";
import egyptianScene from "@/assets/egyptian-scene.png";
import egyptianAnkh from "@/assets/egyptian-ankh.png";
import egyptianPapyrus from "@/assets/egyptian-papyrus.png";
import egyptianNefertiti from "@/assets/egyptian-nefertiti.png";
import egyptianCobra from "@/assets/egyptian-cobra.png";
import egyptianBorder from "@/assets/egyptian-border.png";

const Ornament = ({
  src,
  className,
  isDark,
  darkOpacity = 0.34,
  lightOpacity = 0.2,
}: {
  src: string;
  className: string;
  isDark: boolean;
  darkOpacity?: number;
  lightOpacity?: number;
}) => (
  <img
    src={src}
    alt=""
    aria-hidden="true"
    className={`absolute pointer-events-none select-none ${className}`}
    draggable={false}
    style={{
      opacity: isDark ? darkOpacity : lightOpacity,
      filter: isDark
        ? "brightness(1.08) drop-shadow(0 0 34px hsl(var(--warning) / 0.38))"
        : "drop-shadow(0 14px 28px hsl(var(--warning) / 0.18))",
    }}
  />
);

export const HeroDecorations = ({ isDark }: { isDark: boolean }) => (
  <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
    <Ornament
      src={ornament2}
      className="top-10 right-4 md:right-10 w-[180px] md:w-[260px] lg:w-[320px]"
      isDark={isDark}
      darkOpacity={0.28}
      lightOpacity={0.17}
    />
    <Ornament
      src={ornament3}
      className="top-14 left-4 md:left-10 w-[190px] md:w-[270px] lg:w-[340px]"
      isDark={isDark}
      darkOpacity={0.24}
      lightOpacity={0.14}
    />
    <Ornament
      src={egyptianScene}
      className="bottom-0 left-1/2 w-[520px] -translate-x-1/2 md:w-[720px] lg:w-[900px]"
      isDark={isDark}
      darkOpacity={0.22}
      lightOpacity={0.12}
    />
    <Ornament
      src={egyptianAnkh}
      className="right-[6%] top-[45%] w-[88px] md:w-[122px] lg:w-[150px]"
      isDark={isDark}
      darkOpacity={0.24}
      lightOpacity={0.14}
    />
    <Ornament
      src={ornament1}
      className="left-[6%] bottom-[18%] w-[120px] md:w-[170px] lg:w-[210px]"
      isDark={isDark}
      darkOpacity={0.2}
      lightOpacity={0.11}
    />
  </div>
);

export const VisionDecorations = ({ isDark }: { isDark: boolean }) => (
  <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
    <Ornament
      src={egyptianNefertiti}
      className="right-4 bottom-8 w-[160px] md:right-10 md:w-[230px] lg:w-[290px]"
      isDark={isDark}
      darkOpacity={0.22}
      lightOpacity={0.13}
    />
    <Ornament
      src={egyptianAnkh}
      className="left-4 top-8 w-[86px] md:left-10 md:w-[120px]"
      isDark={isDark}
      darkOpacity={0.22}
      lightOpacity={0.13}
    />
    <Ornament
      src={egyptianBorder}
      className="left-0 top-1/2 hidden -translate-y-1/2 rotate-90 md:block md:w-[220px] lg:w-[300px]"
      isDark={isDark}
      darkOpacity={0.16}
      lightOpacity={0.09}
    />
  </div>
);

export const StepsDecorations = ({ isDark }: { isDark: boolean }) => (
  <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
    <Ornament
      src={egyptianPapyrus}
      className="left-2 top-12 w-[130px] md:left-8 md:w-[190px] lg:w-[240px]"
      isDark={isDark}
      darkOpacity={0.24}
      lightOpacity={0.15}
    />
    <Ornament
      src={egyptianCobra}
      className="right-4 top-8 w-[150px] md:right-8 md:w-[210px] lg:w-[260px]"
      isDark={isDark}
      darkOpacity={0.2}
      lightOpacity={0.12}
    />
    <Ornament
      src={ornament1}
      className="bottom-8 right-[10%] w-[110px] md:w-[160px]"
      isDark={isDark}
      darkOpacity={0.18}
      lightOpacity={0.1}
    />
  </div>
);

export const FeaturesDecorations = ({ isDark }: { isDark: boolean }) => (
  <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
    <Ornament
      src={ornament3}
      className="left-2 top-10 w-[180px] md:left-8 md:w-[250px] lg:w-[320px]"
      isDark={isDark}
      darkOpacity={0.22}
      lightOpacity={0.13}
    />
    <Ornament
      src={egyptianAnkh}
      className="right-4 bottom-8 w-[80px] md:right-8 md:w-[120px] lg:w-[140px]"
      isDark={isDark}
      darkOpacity={0.22}
      lightOpacity={0.13}
    />
    <Ornament
      src={egyptianCobra}
      className="top-1/2 right-2 hidden -translate-y-1/2 md:block md:w-[150px] lg:w-[220px]"
      isDark={isDark}
      darkOpacity={0.16}
      lightOpacity={0.09}
    />
  </div>
);

export const SupportDecorations = ({ isDark }: { isDark: boolean }) => (
  <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
    <Ornament
      src={egyptianPapyrus}
      className="left-2 top-1/2 w-[160px] -translate-y-1/2 md:left-8 md:w-[240px] lg:w-[300px]"
      isDark={isDark}
      darkOpacity={0.28}
      lightOpacity={0.18}
    />
    <Ornament
      src={ornament2}
      className="right-4 top-10 w-[95px] md:right-10 md:w-[140px]"
      isDark={isDark}
      darkOpacity={0.2}
      lightOpacity={0.12}
    />
    <Ornament
      src={ornament1}
      className="bottom-6 left-1/2 w-[95px] -translate-x-1/2 md:w-[140px]"
      isDark={isDark}
      darkOpacity={0.18}
      lightOpacity={0.1}
    />
  </div>
);

export const PartnersDecorations = ({ isDark }: { isDark: boolean }) => (
  <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
    <Ornament
      src={egyptianBorder}
      className="left-0 top-1/2 hidden -translate-y-1/2 rotate-90 md:block md:w-[220px]"
      isDark={isDark}
      darkOpacity={0.16}
      lightOpacity={0.1}
    />
    <Ornament
      src={egyptianBorder}
      className="right-0 top-1/2 hidden -translate-y-1/2 -rotate-90 md:block md:w-[220px]"
      isDark={isDark}
      darkOpacity={0.16}
      lightOpacity={0.1}
    />
    <Ornament
      src={egyptianAnkh}
      className="left-1/2 top-4 w-[62px] -translate-x-1/2 md:w-[82px]"
      isDark={isDark}
      darkOpacity={0.18}
      lightOpacity={0.11}
    />
  </div>
);

export const CTADecorations = ({ isDark }: { isDark: boolean }) => (
  <div className="absolute inset-0 z-[1] overflow-hidden rounded-[2rem] pointer-events-none">
    <Ornament
      src={egyptianAnkh}
      className="left-5 top-5 w-[58px] md:w-[86px]"
      isDark={isDark}
      darkOpacity={0.24}
      lightOpacity={0.16}
    />
    <Ornament
      src={ornament1}
      className="right-5 bottom-5 w-[88px] md:w-[128px]"
      isDark={isDark}
      darkOpacity={0.22}
      lightOpacity={0.14}
    />
  </div>
);

export const FooterDecorations = ({ isDark }: { isDark: boolean }) => (
  <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
    <Ornament
      src={egyptianScene}
      className="left-1/2 bottom-0 w-[360px] -translate-x-1/2 md:w-[520px]"
      isDark={isDark}
      darkOpacity={0.14}
      lightOpacity={0.08}
    />
    <Ornament
      src={ornament3}
      className="right-4 top-3 hidden md:block md:w-[140px]"
      isDark={isDark}
      darkOpacity={0.14}
      lightOpacity={0.08}
    />
  </div>
);

const DecorativeBackground = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
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
