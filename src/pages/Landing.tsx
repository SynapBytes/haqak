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
  Rocket, Target, Heart, Sparkles
} from "lucide-react";
import { useRef, useState, useEffect, useCallback } from "react";
import TurnstileCaptcha from "@/components/TurnstileCaptcha";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

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
      // Verify captcha
      const { data: captchaData, error: captchaError } = await supabase.functions.invoke("verify-captcha", {
        body: JSON.stringify({ token: captchaToken }),
      });

      if (captchaError || !captchaData || !captchaData.success) {
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
      window.location.href = `mailto:support@haqak.app?subject=${encodeURIComponent(`${t("support.contact_us")}: ${name}`)}&body=${encodeURIComponent(message)}`;
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
        className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90 h-12 text-base font-semibold rounded-xl shadow-lg shadow-accent/20"
      >
        {sending ? (
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
            <Send className="w-4 h-4" />
          </motion.div>
        ) : (
          <Send className="w-4 h-4" />
        )}
        {sending ? t("support.sending") : t("support.send")}
      </Button>
    </form>
  );
};


const Landing = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  /* ─── Data ─── */
  const features = [
    { icon: MessageSquare, title: t("features.easy_report"), description: t("features.easy_report_desc"), gradient: "from-accent/20 to-accent/5" },
    { icon: Shield, title: t("features.privacy"), description: t("features.privacy_desc"), gradient: "from-primary/20 to-primary/5" },
    { icon: BarChart3, title: t("features.analytics"), description: t("features.analytics_desc"), gradient: "from-info/20 to-info/5" },
    { icon: Zap, title: t("features.realtime"), description: t("features.realtime_desc"), gradient: "from-warning/20 to-warning/5" },
    { icon: Globe, title: t("features.coverage"), description: t("features.coverage_desc"), gradient: "from-success/20 to-success/5" },
    { icon: ClipboardCheck, title: t("features.review"), description: t("features.review_desc"), gradient: "from-accent/20 to-primary/5" },
  ];

  const visionPoints = [
    { icon: Target, title: t("vision.our_vision"), description: t("vision.our_vision_desc"), color: "text-accent" },
    { icon: Rocket, title: t("vision.our_mission"), description: t("vision.our_mission_desc"), color: "text-primary" },
    { icon: Heart, title: t("vision.our_values"), description: t("vision.our_values_desc"), color: "text-success" },
    { icon: Sparkles, title: t("vision.smart_management"), description: t("vision.smart_management_desc"), color: "text-warning" },
  ];

  const steps = [
    { num: "١", title: t("steps.step1"), desc: t("steps.step1_desc"), icon: FileCheck, color: "from-accent to-accent/70" },
    { num: "٢", title: t("steps.step2"), desc: t("steps.step2_desc"), icon: MessageSquare, color: "from-info to-info/70" },
    { num: "٣", title: t("steps.step3"), desc: t("steps.step3_desc"), icon: ClipboardCheck, color: "from-warning to-warning/70" },
    { num: "٤", title: t("steps.step4"), desc: t("steps.step4_desc"), icon: Eye, color: "from-success to-success/70" },
  ];

  const partners = [
    { name: t("partners.mps"), icon: Building2 },
    { name: t("partners.civil_society"), icon: Users },
    { name: t("partners.citizens"), icon: Heart },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <DecorativeBackground />
      <AppHeader />

      {/* ═══════════ HERO ═══════════ */}
      <section ref={heroRef} className="relative min-h-[90vh] flex flex-col overflow-hidden">
        {/* Video Background */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeIn" }}
          className="absolute inset-0"
          style={{ backgroundColor: isDark ? "#000" : "#fff" }}
        >
          <video
            key={isDark ? "dark" : "light"}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="absolute inset-0 w-full h-full object-cover"
            aria-hidden="true"
          >
            {/* Provide both MIME types for maximum browser compatibility with .mov files */}
            <source src={isDark ? "/video-black.mov" : "/video-white.mov"} type="video/quicktime" />
            <source src={isDark ? "/video-black.mov" : "/video-white.mov"} type="video/mp4" />
          </video>
          {/* Gradient overlay — transparent at top, darkens/lightens toward bottom for button readability */}
          <div className={`absolute inset-0 pointer-events-none ${isDark ? "bg-gradient-to-b from-black/10 via-transparent to-black/65" : "bg-gradient-to-b from-white/10 via-transparent to-white/65"}`} />
        </motion.div>

        {/* Spacer — lets video breathe while pushing CTA to the bottom */}
        <div className="flex-1" />

        {/* CTA content anchored at the bottom of the hero */}
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 container px-4 pb-16 md:pb-20"
        >
          <div className="max-w-2xl mx-auto flex flex-col items-center text-center gap-6">
            {/* Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <MagneticButton>
                <Link to="/auth">
                  <Button size="lg" className="gap-2.5 bg-accent text-accent-foreground hover:bg-accent/90 px-10 w-full sm:w-auto h-14 text-base font-semibold shadow-2xl shadow-accent/30 hover:shadow-accent/40 transition-all duration-300 rounded-2xl">
                    {t("hero.cta_citizen")}
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                </Link>
              </MagneticButton>
              <Link to="/auth">
                <Button size="lg" variant="outline" className={`gap-2.5 px-10 w-full sm:w-auto h-14 text-base font-medium border-2 transition-all rounded-2xl backdrop-blur-sm hover:bg-accent/10 hover:border-accent/60 ${isDark ? "border-white/30 text-white" : "border-black/30 text-foreground"}`}>
                  {t("hero.cta_mp")}
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </Link>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.6 }}
              className={`flex items-center gap-5 text-sm ${isDark ? "text-white/70" : "text-black/70"}`}
            >
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>{t("hero.encrypted")}</span>
              </div>
              <div className={`w-px h-4 ${isDark ? "bg-white/20" : "bg-black/20"}`} />
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-accent" />
                <span>{t("hero.free")}</span>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className={`w-6 h-10 rounded-full border-2 ${isDark ? "border-white/30" : "border-black/30"} flex items-start justify-center p-1.5`}
          >
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-1.5 h-1.5 rounded-full bg-accent"
            />
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════════ VISION SECTION ═══════════ */}
      <section className="relative z-10 py-16 md:py-20">
        <VisionDecorations isDark={isDark} />
        <div className="container px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-4xl font-bold text-foreground tracking-tight">
              {t("vision.title")}
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {visionPoints.map((point, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                whileHover={{ y: -4 }}
                className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-6 text-center hover:shadow-xl transition-all duration-300 group cursor-default"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-card to-muted flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 border border-border/50">
                  <point.icon className={`w-7 h-7 ${point.color}`} />
                </div>
                <h3 className={`text-lg font-bold mb-2 ${point.color}`}>{point.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{point.description}</p>
              </motion.div>
            ))}
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
            {/* Connecting line */}
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
                    {/* Icon container */}
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

      {/* ═══════════ FEATURES - BENTO GRID ═══════════ */}
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
                {/* Gradient hover overlay */}
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

                {/* Corner decoration */}
                <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-accent/[0.04] group-hover:bg-accent/[0.08] transition-colors duration-500" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CONTACT / SUPPORT ═══════════ */}
      <section id="support" className="relative py-24 md:py-32 overflow-hidden">
        <SupportDecorations isDark={isDark} />
        <div className="absolute inset-0 pointer-events-none">
          <GradientOrb className="w-[400px] h-[400px] bg-accent/[0.04] top-20 -right-40" />
        </div>

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

      {/* ═══════════ PARTNERS / TRUST ═══════════ */}
      <section className="relative py-16 border-y border-border bg-card/30">
        <PartnersDecorations isDark={isDark} />
        <div className="container px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <p className="text-sm text-muted-foreground font-medium">{t("partners.title")}</p>
          </motion.div>
          <div className="flex items-center justify-center gap-8 md:gap-16 flex-wrap">
            {partners.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.05 }}
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
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-accent via-info to-primary opacity-90" />
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }} />
          <GradientOrb className="w-[300px] h-[300px] bg-white/10 -top-20 -right-20" />
          <GradientOrb className="w-[200px] h-[200px] bg-white/10 -bottom-10 -left-10" />

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

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="relative border-t border-border py-12 bg-card/30">
        <FooterDecorations isDark={isDark} />
        <div className="container px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
              <div className="flex items-center gap-3">
                <img src="/logo-haqak.webp" alt={t("app_name")} className="w-10 h-10 rounded-2xl shadow-md object-contain" />
                <div>
                  <span className="font-bold text-lg text-foreground block">{t("app_name")}</span>
                  <span className="text-xs text-muted-foreground">{t("tagline")}</span>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap justify-center md:justify-end">
                <Link to="/auth" className="hover:text-foreground transition-colors">{t("footer.login")}</Link>
                <span className="w-1 h-1 rounded-full bg-border hidden sm:block" />
                <Link to="/auth" className="hover:text-foreground transition-colors">{t("footer.register")}</Link>
                <span className="w-1 h-1 rounded-full bg-border hidden sm:block" />
                <button onClick={() => document.getElementById('support')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-foreground transition-colors cursor-pointer bg-transparent border-none p-0 text-sm text-muted-foreground">{t("footer.support")}</button>
                <span className="w-1 h-1 rounded-full bg-border hidden sm:block" />
                <Link to="/privacy" className="hover:text-foreground transition-colors">{t("footer.privacy")}</Link>
                <span className="w-1 h-1 rounded-full bg-border hidden sm:block" />
                <Link to="/terms" className="hover:text-foreground transition-colors">{t("footer.terms")}</Link>
              </div>
            </div>
            <div className="pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">{t("footer.rights")}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                {t("footer.status")}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
