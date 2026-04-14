import { motion, useScroll, useTransform, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/AppHeader";
import DecorativeBackground, {
  HeroDecorations,
  VisionDecorations,
  StepsDecorations,
  FeaturesDecorations,
  SupportDecorations,
  PartnersDecorations,
  CTADecorations,
  FooterDecorations,
} from "@/components/DecorativeBackground";
import { useTheme } from "@/contexts/ThemeContext";
import { 
  MessageSquare, Shield, BarChart3, Zap, Users, ArrowLeft, 
  CheckCircle2, Globe, ClipboardCheck, Eye, 
  FileCheck, Headphones, Star, ChevronLeft, ArrowUpLeft,
  Phone, MapPin, Building2, Award, TrendingUp, Mail, Send,
  Rocket, Target, Heart, Sparkles, Scale, FileText
} from "lucide-react";
import { useRef, useState, useEffect, useCallback } from "react";
import TurnstileCaptcha from "@/components/TurnstileCaptcha";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { APP_CONFIG } from "@/lib/config";
import { parseCaptchaResponse } from "@/lib/boundaryAdapters";
import { handleClientError } from "@/lib/errors";
import { analytics } from "@/lib/analytics";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type SocialLink = {
  id: string;
  name: string;
  href: string;
  color: string;
  iconPath: string;
  iconViewBox: string;
};

const SOCIAL_LINKS: readonly SocialLink[] = [
  {
    id: "x",
    name: "X (Twitter)",
    href: "https://x.com/HaqakOfficial",
    color: "#000000",
    iconPath:
      "M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8l164.9-188.5L26.2 48H172.8l100.5 132.9L389.2 48Zm-24.8 373.8h39.1L151.6 88h-42l254.8 333.8Z",
    iconViewBox: "0 0 512 512",
  },
  {
    id: "facebook",
    name: "Facebook",
    href: "https://www.facebook.com/HaqakOfficial",
    color: "#1877F2",
    iconPath:
      "M504 256C504 119 393 8 256 8S8 119 8 256c0 123.8 90.7 226.4 209.3 245V327.7h-63V256h63v-54.6c0-62.2 37-96.6 93.7-96.6 27.1 0 55.4 4.8 55.4 4.8v61h-31.2c-30.8 0-40.4 19.1-40.4 38.7V256h68.8l-11 71.7h-57.8V501C413.3 482.4 504 379.8 504 256z",
    iconViewBox: "0 0 512 512",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    href: "https://www.linkedin.com/company/haqakofficial",
    color: "#0A66C2",
    iconPath:
      "M416 32H96C60.7 32 32 60.7 32 96v320c0 35.3 28.7 64 64 64h320c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64zM181.8 416h-62.3V215.4h62.3V416zm-31.1-228c-20 0-36.1-16.1-36.1-36.1s16.1-36.1 36.1-36.1 36.1 16.1 36.1 36.1-16.2 36.1-36.1 36.1zM416 416h-62.2V318c0-23.4-.5-53.5-32.6-53.5-32.7 0-37.7 25.5-37.7 51.8V416h-62.2V215.4h59.7v27.4h.8c8.3-15.7 28.7-32.3 59.1-32.3 63.2 0 74.9 41.6 74.9 95.7V416z",
    iconViewBox: "0 0 448 512",
  },
] as const;

const socialIconClassName =
  "group relative inline-flex h-12 w-12 items-center justify-center rounded-xl border border-border/60 bg-background/85 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:scale-105 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40";

/* ─── Floating Particle Component ─── */
const FloatingParticle = ({ delay, x, y, size, color }: { delay: number; x: string; y: string; size: number; color: string }) => (
  <motion.div
    className={`absolute rounded-full ${color}`}
    style={{ left: x, top: y, width: size, height: size }}
    animate={{
      y: [0, -30, 0],
      opacity: [0.2, 0.6, 0.2],
      scale: [1, 1.3, 1],
    }}
    transition={{
      duration: 4 + Math.random() * 2,
      delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);


/* ─── Magnetic Button Wrapper ─── */
const MagneticButton = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 15 });
  const springY = useSpring(y, { stiffness: 150, damping: 15 });

  const handleMouse = useCallback((e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left - rect.width / 2) * 0.15);
    y.set((e.clientY - rect.top - rect.height / 2) * 0.15);
  }, [x, y]);

  return (
    <motion.div
      ref={ref}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouse}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* ─── Gradient Orb ─── */
const GradientOrb = ({ className }: { className: string }) => (
  <motion.div
    className={`absolute rounded-full blur-3xl pointer-events-none ${className}`}
    animate={{
      scale: [1, 1.2, 1],
      opacity: [0.3, 0.5, 0.3],
    }}
    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
  />
);

/* ─── Hero Stats Card (real data) ─── */
const HeroStatsCard = () => {
  const { t } = useTranslation();
  const [weeklyCount, setWeeklyCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const { count } = await supabase
        .from("issues")
        .select("*", { count: "exact", head: true })
        .gte("created_at", oneWeekAgo.toISOString());
      setWeeklyCount(count ?? 0);
    };
    fetchStats();
  }, []);

  if (weeklyCount === null || weeklyCount === 0) return null;

  const arabicNum = weeklyCount.toLocaleString("ar-EG");

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, x: -30 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ delay: 1.5, duration: 0.5 }}
      whileHover={{ scale: 1.05 }}
      className="absolute -bottom-4 -right-6 bg-card backdrop-blur-xl border border-accent/20 rounded-2xl p-3 shadow-lg"
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-accent" />
        </div>
        <div>
          <div className="text-xs font-bold text-foreground">+{arabicNum} {t("hero.weekly_issues")}</div>
          <div className="text-[10px] text-muted-foreground">{t("hero.this_week")}</div>
        </div>
      </div>
    </motion.div>
  );
};

/* ─── Hero Info Window — static particle data ─── */
const CARD_PARTICLES = [
  { id: 0,  x: "8%",  y: "14%", size: 3, color: "rgba(90,165,180,0.25)",   duration: 2.8, delay: 0.0 },
  { id: 1,  x: "18%", y: "36%", size: 2, color: "rgba(212,175,55,0.25)",   duration: 3.4, delay: 0.5 },
  { id: 2,  x: "32%", y: "60%", size: 2, color: "rgba(176,212,208,0.30)",  duration: 4.0, delay: 1.0 },
  { id: 3,  x: "48%", y: "22%", size: 4, color: "rgba(90,165,180,0.20)",   duration: 3.1, delay: 1.5 },
  { id: 4,  x: "63%", y: "76%", size: 2, color: "rgba(212,175,55,0.25)",   duration: 3.6, delay: 0.8 },
  { id: 5,  x: "78%", y: "44%", size: 3, color: "rgba(176,212,208,0.25)",  duration: 2.5, delay: 1.3 },
  { id: 6,  x: "88%", y: "18%", size: 2, color: "rgba(90,165,180,0.25)",   duration: 4.2, delay: 0.3 },
  { id: 7,  x: "12%", y: "66%", size: 3, color: "rgba(212,175,55,0.20)",   duration: 3.0, delay: 1.8 },
  { id: 8,  x: "27%", y: "82%", size: 2, color: "rgba(176,212,208,0.30)",  duration: 2.7, delay: 0.7 },
  { id: 9,  x: "55%", y: "10%", size: 4, color: "rgba(90,165,180,0.15)",   duration: 3.8, delay: 1.1 },
] as const;

/* ─── Hero Info Window ─── */
const HeroInfoWindow = ({ opened, ropeDropped }: { opened: boolean; ropeDropped: boolean }) => {
  const { t } = useTranslation();

  const modernCardStyle = {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    backgroundImage: `
      linear-gradient(135deg, rgba(90, 165, 180, 0.03) 0%, transparent 100%),
      radial-gradient(circle at top right, rgba(212, 175, 55, 0.03), transparent 40%)
    `,
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(90, 165, 180, 0.15)",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.1), inset 0 0 20px rgba(255, 255, 255, 0.5)",
  };

  const infoSteps = [
    { text: t("hero.step1"), icon: FileText, accent: "#5BA3B0", border: "rgba(90,165,180,0.25)", glow: "rgba(90,165,180,0.12)" },
    { text: t("hero.step2"), icon: Shield, accent: "#2A6E7E", border: "rgba(42,110,126,0.25)", glow: "rgba(42,110,126,0.12)" },
    { text: t("hero.step3"), icon: Zap, accent: "#d4af37", border: "rgba(212,175,55,0.25)", glow: "rgba(212,175,55,0.12)" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.8 }}
      className="relative flex flex-col items-center w-full max-w-[580px] mx-auto z-10 mt-10 md:mt-16"
    >
      {/* ── Rope and seal ── */}
      <motion.div
        className="relative flex flex-col items-center z-20"
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.9 }}
      >
        <motion.div
          className="w-0.5 h-24 md:h-32 origin-top"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 1, delay: 0.95 }}
          style={{ background: "linear-gradient(to bottom, rgba(75,148,165,0.55), rgba(192,138,60,0.75), rgba(212,175,55,0.85))" }}
        />
        <motion.div
          initial={{ rotate: -10, scale: 0.8 }}
          animate={{ rotate: ropeDropped ? 0 : -10, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 11, delay: 0.35 }}
          className="relative w-12 h-12 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #A8D4DA 0%, #6BAAB8 40%, #4A8A98 70%, #C08A3C 100%)",
            boxShadow: "0 8px 24px rgba(75,160,175,0.45), 0 2px 8px rgba(0,0,0,0.18)",
            border: "1.5px solid rgba(255,255,255,0.35)",
          }}
        >
          <Sparkles className="w-5 h-5 text-white/90" />
          <div className="absolute inset-0 rounded-full animate-ping opacity-45" style={{ border: "1.5px solid rgba(107,170,184,0.6)" }} />
        </motion.div>
      </motion.div>

      {/* ── Main Card ── */}
      <motion.div
        initial={{ height: 120, opacity: 0, y: -30 }}
        animate={{
          height: opened ? "auto" : 120,
          opacity: 1,
          y: 0,
        }}
        transition={{ duration: 1.15, delay: 0.55, ease: [0.2, 0.9, 0.3, 1] }}
        className="relative overflow-hidden rounded-[2.5rem] w-full"
        style={modernCardStyle}
      >
        {/* Geometric pattern overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, rgba(90, 165, 180, 0.15) 1px, transparent 0)", backgroundSize: "24px 24px" }} />

        {/* Particle field */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          {CARD_PARTICLES.map(p => (
            <motion.div
              key={p.id}
              className="absolute rounded-full"
              style={{ left: p.x, top: p.y, width: p.size, height: p.size, background: p.color }}
              animate={{ y: [-6, 7, -6], opacity: [0.1, 0.4, 0.1], scale: [1, 1.4, 1] }}
              transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative h-full flex flex-col z-[3] p-8 md:p-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: opened ? 1 : 0, y: opened ? 0 : 20 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="flex items-center gap-5 mb-8"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center bg-accent/10 border border-accent/20 shadow-sm"
            >
              <Scale className="w-8 h-8 text-accent" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground tracking-tight">
                {t("hero.welcome_title")}
              </h3>
              <p className="text-muted-foreground mt-1">
                {t("hero.welcome_sub")}
              </p>
            </div>
          </motion.div>

          {/* Steps */}
          <div className="space-y-4 mb-8">
            {infoSteps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: opened ? 1 : 0, x: opened ? 0 : 20 }}
                transition={{ delay: 1.2 + i * 0.1, duration: 0.5 }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-card/50 border border-border/50 hover:border-accent/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-accent/5 flex items-center justify-center border border-accent/10">
                  <step.icon className="w-5 h-5 text-accent" />
                </div>
                <span className="font-semibold text-foreground">
                  {step.text}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Footer tagline */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: opened ? 1 : 0 }}
            transition={{ delay: 1.6, duration: 0.5 }}
            className="text-center p-4 rounded-2xl bg-accent/[0.03] border border-accent/10"
          >
            <p className="text-sm font-bold text-accent flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              {t("hero.from_citizen")}
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            </p>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ─── Support Form ─── */
const SupportForm = () => {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error(t("support.fill_all"));
      return;
    }
    if (!captchaToken) {
      toast.error(t("support.fill_all_captcha"));
      return;
    }
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: captchaData, error: captchaError } = await supabase.functions.invoke("verify-captcha", {
        body: JSON.stringify({ token: captchaToken }),
      });

      if (captchaError) {
        handleClientError(
          { code: "support.captcha.invoke_failed", message: t("support.captcha_failed"), retryable: true },
          captchaError,
          { showToast: false, extras: { boundary: "landing.support.verify-captcha" } },
        );
        toast.error(t("support.captcha_failed"));
        setSending(false);
        return;
      }

      let parsedCaptcha: { valid: boolean; error?: string; score?: number };
      try {
        parsedCaptcha = parseCaptchaResponse(captchaData);
      } catch (parseError) {
        handleClientError(
          { code: "support.captcha.invalid_response", message: t("support.captcha_failed"), retryable: true },
          parseError,
          { showToast: false, extras: { boundary: "landing.support.verify-captcha.parse" } },
        );
        toast.error(t("support.captcha_failed"));
        setSending(false);
        return;
      }
      if (!parsedCaptcha.valid) {
        toast.error(t("support.captcha_failed"));
        setSending(false);
        return;
      }

      if (session?.user) {
        await supabase.from("notifications").insert({
          user_id: session.user.id,
          title: `${t("support.contact_us")}: ${name}`,
          message: `${t("support.name")}: ${name} (${email})\n\n${message}`,
        });
      }
      toast.success(t("support.sent_success"));
      setName("");
      setEmail("");
      setMessage("");
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    } catch {
      window.location.href = `mailto:${APP_CONFIG.SUPPORT_EMAIL}?subject=${encodeURIComponent(`${t("support.contact_us")}: ${name}`)}&body=${encodeURIComponent(message)}`;
      toast.success(t("support.opening_email"));
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-success/30 rounded-3xl p-10 shadow-xl text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
          className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-5"
        >
          <CheckCircle2 className="w-10 h-10 text-success" />
        </motion.div>
        <h3 className="text-xl font-bold text-foreground mb-2">{t("support.success")}</h3>
        <p className="text-muted-foreground text-sm mb-6">{t("support.success_sub")}</p>
        <Button
          variant="outline"
          onClick={() => setSent(false)}
          className="rounded-xl"
        >
          {t("support.send_another")}
        </Button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-3xl p-8 space-y-5 shadow-xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("support.name")}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("support.name_placeholder")}
            className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("support.email")}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("support.email_placeholder")}
            dir="ltr"
            className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">{t("support.message")}</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("support.message_placeholder")}
          rows={4}
          className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all resize-none"
        />
      </div>
      <TurnstileCaptcha onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />
      <Button
        type="submit"
        disabled={sending || !captchaToken}
        className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90 h-12 text-base font-semibold rounded-xl shadow-lg shadow-accent"
      >
        {sending ? t("support.sending") : t("support.send")}
        <Send className="w-4 h-4" />
      </Button>
    </form>
  );
};

const Landing = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { scrollYProgress } = useScroll();
  const [opened, setOpened] = useState(false);
  const [ropeDropped, setRopeDropped] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setRopeDropped(true), 600);
    const timer2 = setTimeout(() => setOpened(true), 1600);
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, []);

  const features = [
    { title: t("features.easy_report"), description: t("features.easy_report_desc"), icon: MessageSquare, gradient: "from-accent/5 to-accent/10" },
    { title: t("features.privacy"), description: t("features.privacy_desc"), icon: Shield, gradient: "from-info/5 to-info/10" },
    { title: t("features.analytics"), description: t("features.analytics_desc"), icon: BarChart3, gradient: "from-primary/5 to-primary/10" },
    { title: t("features.realtime"), description: t("features.realtime_desc"), icon: Zap, gradient: "from-warning/5 to-warning/10" },
    { title: t("features.coverage"), description: t("features.coverage_desc"), icon: Globe, gradient: "from-success/5 to-success/10" },
    { title: t("features.review"), description: t("features.review_desc"), icon: ClipboardCheck, gradient: "from-accent/5 to-accent/10" },
  ];

  const steps = [
    { num: "١", title: t("steps.step1"), desc: t("steps.step1_desc"), icon: Users, color: "from-accent to-accent/80" },
    { num: "٢", title: t("steps.step2"), desc: t("steps.step2_desc"), icon: MessageSquare, color: "from-info to-info/80" },
    { num: "٣", title: t("steps.step3"), desc: t("steps.step3_desc"), icon: ClipboardCheck, color: "from-warning to-warning/80" },
    { num: "٤", title: t("steps.step4"), desc: t("steps.step4_desc"), icon: Eye, color: "from-success to-success/80" },
  ];

  const partners = [
    { name: t("partners.mps"), icon: Building2 },
    { name: t("partners.civil_society"), icon: Users },
    { name: t("partners.citizens"), icon: Heart },
  ];

  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden selection:bg-accent/20 selection:text-accent">
      <AppHeader />
      <DecorativeBackground />
      
      {/* ═══════════ HERO SECTION ═══════════ */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <HeroDecorations isDark={isDark} />
        
        {/* Animated Orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <GradientOrb className="w-[500px] h-[500px] bg-accent/[0.05] -top-20 -left-20" />
          <GradientOrb className="w-[400px] h-[400px] bg-primary/[0.05] bottom-20 -right-20" />
        </div>

        <div className="container px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/[0.08] text-accent text-xs font-bold tracking-wider mb-8 border border-accent/10"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {t("hero.badge")}
              </motion.span>
              
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-foreground mb-8 tracking-tight leading-[1.1]">
                <span className="block">{t("hero.title_1")}</span>
                <span className="bg-clip-text text-transparent bg-gradient-to-l from-accent via-primary to-accent animate-gradient-x">
                  {t("hero.title_2")}
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
                {t("hero.subtitle")}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
                <MagneticButton>
                  <Link to="/auth">
                    <Button size="lg" className="h-16 px-10 text-lg font-bold rounded-2xl bg-accent text-accent-foreground hover:bg-accent/90 shadow-2xl shadow-accent/20 gap-3 group">
                      {t("hero.cta_citizen")}
                      <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                    </Button>
                  </Link>
                </MagneticButton>
                
                <MagneticButton>
                  <Link to="/auth?type=mp">
                    <Button variant="outline" size="lg" className="h-16 px-10 text-lg font-bold rounded-2xl border-2 hover:bg-muted/50 gap-3">
                      {t("hero.cta_mp")}
                      <Building2 className="w-5 h-5" />
                    </Button>
                  </Link>
                </MagneticButton>
              </div>
            </motion.div>

            {/* Hero Interactive Window */}
            <HeroInfoWindow opened={opened} ropeDropped={ropeDropped} />
          </div>
        </div>
      </section>

      {/* ═══════════ VISION SECTION ═══════════ */}
      <section className="relative py-24 md:py-32 overflow-hidden bg-card/30">
        <VisionDecorations isDark={isDark} />
        <div className="container px-4">
          <div className="grid md:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute -inset-4 bg-accent/5 rounded-[2.5rem] blur-2xl" />
              <div className="relative bg-card border border-border rounded-[2.5rem] p-8 md:p-12 shadow-2xl">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8 tracking-tight">
                  {t("vision.title")}
                </h2>
                <div className="space-y-8">
                  {[
                    { title: t("vision.our_vision"), desc: t("vision.our_vision_desc"), icon: Target, color: "text-accent" },
                    { title: t("vision.our_mission"), desc: t("vision.our_mission_desc"), icon: Rocket, color: "text-primary" },
                    { title: t("vision.our_values"), desc: t("vision.our_values_desc"), icon: Heart, color: "text-warning" },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-5">
                      <div className={`shrink-0 w-12 h-12 rounded-2xl bg-muted flex items-center justify-center ${item.color}`}>
                        <item.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-foreground mb-1">{item.title}</h3>
                        <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <div className="p-8 rounded-[2rem] bg-accent/[0.03] border border-accent/10">
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
                  <Sparkles className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-4">{t("vision.smart_management")}</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {t("vision.smart_management_desc")}
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section className="relative py-24 md:py-32">
        <StepsDecorations isDark={isDark} />
        <div className="container px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/[0.08] text-accent text-xs font-bold tracking-wider mb-5 border border-accent/10"
            >
              {t("steps.badge")}
            </motion.span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-5 tracking-tight">
              {t("steps.title")}
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-base md:text-lg">{t("steps.subtitle")}</p>
          </motion.div>

          <div className="max-w-5xl mx-auto relative">
            <div className="hidden md:block absolute top-[4.5rem] right-[12%] left-[12%] z-0">
              <div className="h-[2px] bg-gradient-to-l from-accent/30 via-warning/30 to-success/30 rounded-full" />
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, duration: 1.5, ease: "easeOut" }}
                className="h-[2px] bg-gradient-to-l from-accent via-warning to-success rounded-full -mt-[2px] origin-right"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-4">
              {steps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.15, duration: 0.5 }}
                  className="relative group"
                >
                  <div className="flex md:flex-col items-start md:items-center gap-5 md:gap-0">
                    <div className="relative z-10 shrink-0">
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: -5 }}
                        className={`w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg md:mb-6 group-hover:shadow-xl transition-shadow duration-300`}
                      >
                        <step.icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
                      </motion.div>
                      <span className="absolute -top-2 -right-2 w-8 h-8 rounded-xl bg-card border-2 border-border flex items-center justify-center text-sm font-black text-foreground shadow-md">
                        {step.num}
                      </span>
                    </div>
                    <div className="md:text-center">
                      <h3 className="font-bold text-foreground text-lg mb-2">{step.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed max-w-[220px] md:max-w-[200px] mx-auto">{step.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES ═══════════ */}
      <section className="relative py-24 md:py-32 bg-gradient-to-b from-card/0 via-card/50 to-card/0">
        <FeaturesDecorations isDark={isDark} />
        <div className="container px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/[0.08] text-primary text-xs font-bold tracking-wider mb-5 border border-primary/10"
            >
              {t("features.badge")}
            </motion.span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-5 tracking-tight">
              {t("features.title")}
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-base md:text-lg">{t("features.subtitle")}</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                whileHover={{ y: -6 }}
                className={`relative bg-card border border-border rounded-3xl p-7 group hover:border-accent/20 hover:shadow-2xl transition-all duration-500 overflow-hidden ${i === 0 ? 'sm:col-span-2 lg:col-span-1' : ''}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl`} />
                
                <div className="relative z-10">
                  <motion.div
                    whileHover={{ rotate: -10, scale: 1.1 }}
                    className="w-14 h-14 rounded-2xl bg-gradient-to-br from-muted to-card border border-border/50 flex items-center justify-center mb-5 group-hover:border-accent/30 transition-colors duration-300 shadow-sm"
                  >
                    <feature.icon className="w-7 h-7 text-accent group-hover:text-accent transition-colors" />
                  </motion.div>
                  <h3 className="font-bold text-foreground mb-3 text-lg">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-[1.8]">{feature.description}</p>
                </div>
                <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-accent/[0.04] group-hover:bg-accent/[0.08] transition-colors duration-500" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CONTACT / SUPPORT ═══════════ */}
      <section id="support" className="relative py-24 md:py-32 overflow-hidden">
        <SupportDecorations isDark={isDark} />
        <div className="container px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/[0.08] text-accent text-xs font-bold tracking-wider mb-5 border border-accent/10"
            >
              {t("support.badge")}
            </motion.span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-5 tracking-tight">
              {t("support.title")}
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-base md:text-lg">{t("support.subtitle")}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-xl mx-auto"
          >
            <SupportForm />
          </motion.div>
        </div>
      </section>

      {/* ═══════════ PARTNERS ═══════════ */}
      <section className="relative py-16 border-y border-border bg-card/30">
        <PartnersDecorations isDark={isDark} />
        <div className="container px-4">
          <div className="flex items-center justify-center gap-8 md:gap-16 flex-wrap">
            {partners.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-2.5 text-muted-foreground hover:text-foreground transition-colors cursor-default"
              >
                <p.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{p.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CTA ═══════════ */}
      <section className="container py-20 md:py-28 px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-[2rem] max-w-4xl mx-auto"
        >
          <CTADecorations isDark={isDark} />
          <div className="absolute inset-0 bg-gradient-to-br from-accent via-info to-primary opacity-90" />
          <div className="relative z-10 p-10 md:p-16 text-center">
            <motion.div
              whileHover={{ rotate: -5, scale: 1.1 }}
              className="w-20 h-20 rounded-3xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-8 border border-white/20"
            >
              <Headphones className="w-10 h-10 text-white" />
            </motion.div>
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">{t("cta.title")}</h3>
            <p className="text-white/80 text-lg mb-10 max-w-md mx-auto leading-relaxed">
              {t("cta.subtitle")}
            </p>
            <MagneticButton className="inline-block">
              <Link to="/auth">
                <Button size="lg" className="gap-2.5 bg-white text-accent hover:bg-white/90 px-12 h-16 text-lg font-bold shadow-2xl shadow-black/20 rounded-2xl transition-all">
                  {t("cta.button")}
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
            </MagneticButton>
          </div>
        </motion.div>
      </section>

      <footer className="relative border-t border-border py-12 bg-card/30">
        <FooterDecorations isDark={isDark} />
        <div className="container px-4 text-center">
          <p className="text-sm text-muted-foreground">{t("footer.rights")}</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
