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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

/* ─── Data ─── */
const features = [
  { icon: MessageSquare, title: "إبلاغ سهل وسريع", description: "قدّم مشكلتك في أقل من 30 ثانية مع دعم رفع الصور والتصنيف الفوري.", gradient: "from-accent/20 to-accent/5" },
  { icon: Shield, title: "خصوصية وأمان كامل", description: "بياناتك محمية بتشفير متقدم. لا نشر عام ولا مشاركة بدون إذنك.", gradient: "from-primary/20 to-primary/5" },
  { icon: BarChart3, title: "تحليلات وتقارير دقيقة", description: "تقارير مفصلة وإحصائيات شاملة لمساعدة النواب في اتخاذ قرارات أسرع وأدق.", gradient: "from-info/20 to-info/5" },
  { icon: Zap, title: "متابعة لحظية", description: "تابع حالة مشكلتك لحظة بلحظة مع إشعارات فورية عند كل تحديث.", gradient: "from-warning/20 to-warning/5" },
  { icon: Globe, title: "تغطية شاملة", description: "ربط المواطنين بالنواب في كل المحافظات والدوائر الانتخابية.", gradient: "from-success/20 to-success/5" },
  { icon: ClipboardCheck, title: "مراجعة دقيقة ومهنية", description: "فريق متخصص يراجع ويصنّف كل مشكلة ويعيد صياغتها باحترافية قبل عرضها.", gradient: "from-accent/20 to-primary/5" },
];

const visionPoints = [
  { icon: Target, title: "رؤيتنا", description: "ربط كل مواطن مصري بنائبه مباشرة، لخلق قناة تواصل حقيقية وفعّالة.", color: "text-accent" },
  { icon: Rocket, title: "مهمتنا", description: "تمكين المواطنين من إيصال صوتهم بسهولة ومتابعة حل مشاكلهم خطوة بخطوة.", color: "text-primary" },
  { icon: Heart, title: "قيمنا", description: "الشفافية، المصداقية، وحماية خصوصية المواطنين هي أساس كل ما نبنيه.", color: "text-success" },
  { icon: Sparkles, title: "الإدارة الذكية", description: "فريق الإدارة يصنّف المشاكل ويوجّهها للنائب المختص تلقائياً بدقة واحترافية.", color: "text-warning" },
];

const steps = [
  { num: "١", title: "سجّل حسابك", desc: "أنشئ حساب مواطن مجاناً في ثوانٍ معدودة", icon: FileCheck, color: "from-accent to-accent/70" },
  { num: "٢", title: "قدّم مشكلتك", desc: "اكتب المشكلة وارفق حتى 5 صور أو ملفات", icon: MessageSquare, color: "from-info to-info/70" },
  { num: "٣", title: "مراجعة وتصنيف", desc: "فريق الإدارة يراجع ويصنّف المشكلة ويوجهها للنائب المختص", icon: ClipboardCheck, color: "from-warning to-warning/70" },
  { num: "٤", title: "تابع الحل", desc: "استلم إشعارات فورية وأكّد الحل", icon: Eye, color: "from-success to-success/70" },
];

const partners = [
  { name: "أعضاء مجلس النواب", icon: Building2 },
  { name: "المجتمع المدني", icon: Users },
  { name: "المواطنون", icon: Heart },
];

/* ─── Hero Stats Card (real data) ─── */
const HeroStatsCard = () => {
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
          <div className="text-xs font-bold text-foreground">+{arabicNum} مشكلة</div>
          <div className="text-[10px] text-muted-foreground">هذا الأسبوع</div>
        </div>
      </div>
    </motion.div>
  );
};

/* ─── Support Form ─── */
const SupportForm = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }
    setSending(true);
    try {
      // Store in a simple way - could be enhanced with a support_tickets table later
      const { error } = await supabase.from("notifications").insert({
        user_id: "00000000-0000-0000-0000-000000000000",
        title: `دعم فني: ${name}`,
        message: `من: ${name} (${email})\n\n${message}`,
      });
      if (error) throw error;
      toast.success("تم إرسال رسالتك بنجاح! سنرد عليك قريباً.");
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      // Fallback: open mailto
      window.location.href = `mailto:support@sotak.app?subject=${encodeURIComponent(`دعم فني: ${name}`)}&body=${encodeURIComponent(message)}`;
      toast.success("جاري فتح البريد الإلكتروني...");
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-3xl p-8 space-y-5 shadow-xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">الاسم</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسمك الكريم"
            className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">البريد الإلكتروني</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            dir="ltr"
            className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">رسالتك</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="اكتب استفسارك أو ملاحظاتك هنا..."
          rows={4}
          className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all resize-none"
        />
      </div>
      <Button
        type="submit"
        disabled={sending}
        className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90 h-12 text-base font-semibold rounded-xl shadow-lg shadow-accent/20"
      >
        {sending ? (
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
            <Send className="w-4 h-4" />
          </motion.div>
        ) : (
          <Send className="w-4 h-4" />
        )}
        {sending ? "جاري الإرسال..." : "إرسال"}
      </Button>
    </form>
  );
};


const Landing = () => {
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

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <DecorativeBackground />
      <AppHeader />

      {/* ═══════════ HERO ═══════════ */}
      <section ref={heroRef} className="relative min-h-[90vh] flex items-center">
        <HeroDecorations isDark={isDark} />
        {/* Animated gradient mesh background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <GradientOrb className="w-[600px] h-[600px] bg-accent/[0.07] -top-40 -left-40" />
          <GradientOrb className="w-[500px] h-[500px] bg-primary/[0.06] -bottom-20 -right-20" />
          <GradientOrb className="w-[300px] h-[300px] bg-warning/[0.04] top-1/3 right-1/4" />
          
          {/* Grid pattern overlay */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />

          {/* Floating particles */}
          <FloatingParticle delay={0} x="10%" y="20%" size={6} color="bg-accent/30" />
          <FloatingParticle delay={0.5} x="85%" y="15%" size={4} color="bg-primary/25" />
          <FloatingParticle delay={1} x="70%" y="60%" size={5} color="bg-accent/20" />
          <FloatingParticle delay={1.5} x="20%" y="70%" size={3} color="bg-warning/25" />
          <FloatingParticle delay={2} x="50%" y="30%" size={4} color="bg-success/20" />
          <FloatingParticle delay={0.8} x="30%" y="85%" size={5} color="bg-info/20" />
          <FloatingParticle delay={1.2} x="90%" y="45%" size={3} color="bg-primary/20" />

          {/* Spotlight following mouse */}
          <motion.div
            className="absolute w-[800px] h-[800px] rounded-full bg-accent/[0.03] blur-3xl"
            animate={{
              x: mousePos.x * 200 - 100,
              y: mousePos.y * 200 - 100,
            }}
            transition={{ type: "spring", damping: 30, stiffness: 50 }}
            style={{ left: "30%", top: "10%" }}
          />
        </div>

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="container px-4 relative z-10">
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-[1fr,0.6fr] gap-12 items-center">
              {/* Text content */}
              <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-card/80 backdrop-blur-md text-accent text-sm font-medium mb-8 border border-accent/15 shadow-sm"
                >
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent/60" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
                  </span>
                  منصة التواصل المدني الأولى في مصر
                </motion.div>

                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-8 leading-[1.1] tracking-tight">
                  <motion.span
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.6 }}
                    className="block relative"
                  >
                    <span className="relative inline-block">
                      صوتك يوصل.
                      <motion.span
                        className="absolute inset-0 bg-gradient-to-l from-transparent via-[#e8c566]/40 to-transparent bg-[length:200%_100%] bg-clip-text"
                        style={{
                          WebkitTextStroke: "0.5px rgba(200,149,60,0.15)",
                        }}
                        animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
                      />
                    </span>
                  </motion.span>
                  <motion.span
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="block mt-2"
                  >
                    <span className="relative inline-block">
                      <span className="bg-gradient-to-l from-accent via-info to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradient-shift_4s_ease-in-out_infinite]">
                        مشكلتك تُحل.
                      </span>
                      <motion.span
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: 1.2, duration: 0.8, ease: "easeOut" }}
                        className="absolute -bottom-2 right-0 left-0 h-1.5 bg-gradient-to-l from-accent to-primary rounded-full origin-right"
                      />
                    </span>
                  </motion.span>
                </h1>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl leading-relaxed"
                >
                  منصة <span className="text-foreground font-semibold">"صوتك"</span> تربط المواطنين بأعضاء مجلس النواب مباشرة.
                  قدّم مشكلتك بسهولة، تابع حلها، وأكّد النتيجة.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <MagneticButton>
                    <Link to="/auth">
                      <Button size="lg" className="gap-2.5 bg-accent text-accent-foreground hover:bg-accent/90 px-10 w-full sm:w-auto h-14 text-base font-semibold shadow-2xl shadow-accent/30 hover:shadow-accent/40 transition-all duration-300 rounded-2xl">
                        قدّم مشكلتك الآن
                        <ArrowLeft className="w-5 h-5" />
                      </Button>
                    </Link>
                  </MagneticButton>
                  <Link to="/auth">
                    <Button size="lg" variant="outline" className="gap-2.5 px-10 w-full sm:w-auto h-14 text-base font-medium border-2 border-border hover:border-accent/30 hover:bg-accent/5 transition-all rounded-2xl backdrop-blur-sm">
                      دخول النواب
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                  </Link>
                </motion.div>

                {/* Trust indicators */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1, duration: 0.6 }}
                  className="flex items-center gap-5 mt-10 text-sm text-muted-foreground"
                >
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-success" />
                    <span>مشفّر بالكامل</span>
                  </div>
                  <div className="w-px h-4 bg-border" />
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-accent" />
                    <span>مجاني للمواطنين</span>
                  </div>
                </motion.div>
              </motion.div>

              {/* Welcome visual card */}
              <motion.div
                initial={{ opacity: 0, x: -40, rotateY: -10 }}
                animate={{ opacity: 1, x: 0, rotateY: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="hidden lg:block relative"
              >
                <motion.div
                  whileHover={{ y: -8, rotateZ: -1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-2xl overflow-hidden"
                >
                  {/* Decorative gradient blob */}
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-accent/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg shadow-accent/20">
                        <Heart className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="text-base font-bold text-foreground">أهلاً بيك في صوتك</div>
                        <div className="text-xs text-muted-foreground">صوتك مسموع.. ومشكلتك مهمة</div>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      {[
                        { icon: FileCheck, text: "سجّل مشكلتك في ثوانٍ", color: "text-accent" },
                        { icon: Shield, text: "بياناتك محمية بالكامل", color: "text-success" },
                        { icon: Eye, text: "تابع حالة مشكلتك لحظة بلحظة", color: "text-info" },
                      ].map((item, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 1 + i * 0.2, duration: 0.4 }}
                          className="flex items-center gap-3 bg-muted/30 rounded-xl px-4 py-2.5"
                        >
                          <item.icon className={`w-4 h-4 ${item.color} shrink-0`} />
                          <span className="text-sm text-foreground">{item.text}</span>
                        </motion.div>
                      ))}
                    </div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.8, duration: 0.5 }}
                      className="text-center text-xs text-muted-foreground border-t border-border/50 pt-4"
                    >
                      🇪🇬 من المواطن للنائب.. بدون وسيط
                    </motion.div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-1.5"
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
              لماذا نبني <span className="bg-gradient-to-l from-accent to-primary bg-clip-text text-transparent">صوتك</span>؟
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
              كيف يعمل
            </motion.span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-5 tracking-tight">
              أربع خطوات <span className="bg-gradient-to-l from-accent to-primary bg-clip-text text-transparent">بسيطة</span>
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-base md:text-lg">من تقديم المشكلة إلى حلها، كل شيء واضح ومنظم</p>
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
              المميزات
            </motion.span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-5 tracking-tight">
              لماذا <span className="bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">صوتك</span>؟
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-base md:text-lg">مميزات تجعل التواصل المدني أسهل وأكثر فعالية</p>
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
              تواصل معنا
            </motion.span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-5 tracking-tight">
              نحن هنا <span className="bg-gradient-to-l from-accent to-primary bg-clip-text text-transparent">لمساعدتك</span>
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-base md:text-lg">أرسل لنا استفسارك أو ملاحظاتك وسنرد عليك في أقرب وقت</p>
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
            <p className="text-sm text-muted-foreground font-medium">بالتعاون مع</p>
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
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">ابدأ الآن مجاناً</h3>
            <p className="text-white/80 text-lg mb-10 max-w-md mx-auto leading-relaxed">
              سجّل حسابك وقدّم مشكلتك الأولى في أقل من دقيقة.
              <br />
              صوتك يستحق أن يُسمع.
            </p>
            <MagneticButton className="inline-block">
              <Link to="/auth">
                <Button size="lg" className="gap-2.5 bg-white text-accent hover:bg-white/90 px-12 h-16 text-lg font-bold shadow-2xl shadow-black/20 rounded-2xl transition-all">
                  سجّل حسابك الآن
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
                <img src="/logo-sawtak.png" alt="صوتك" className="w-10 h-10 rounded-2xl shadow-md object-contain" />
                <div>
                  <span className="font-bold text-lg text-foreground block">صوتك</span>
                  <span className="text-xs text-muted-foreground">منصة التواصل المدني</span>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <Link to="/auth" className="hover:text-foreground transition-colors">تسجيل الدخول</Link>
                <span className="w-1 h-1 rounded-full bg-border" />
                <Link to="/auth" className="hover:text-foreground transition-colors">إنشاء حساب</Link>
                <span className="w-1 h-1 rounded-full bg-border" />
                <a href="#support" className="hover:text-foreground transition-colors cursor-pointer">الدعم الفني</a>
                <span className="w-1 h-1 rounded-full bg-border" />
                <Link to="/privacy" className="hover:text-foreground transition-colors">الخصوصية</Link>
                <span className="w-1 h-1 rounded-full bg-border" />
                <Link to="/terms" className="hover:text-foreground transition-colors">الشروط</Link>
              </div>
            </div>
            <div className="pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">© ٢٠٢٦ صوتك — جميع الحقوق محفوظة</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                جميع الخدمات تعمل بكفاءة
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
