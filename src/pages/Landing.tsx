import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/AppHeader";
import { 
  MessageSquare, Shield, BarChart3, Zap, Users, ArrowLeft, 
  CheckCircle2, Globe, ClipboardCheck, Eye, TrendingUp, 
  FileCheck, Headphones, Star, ChevronLeft
} from "lucide-react";
import { useRef } from "react";

const features = [
  { icon: MessageSquare, title: "إبلاغ سهل وسريع", description: "قدّم مشكلتك في أقل من 30 ثانية مع دعم رفع الصور والتصنيف الفوري." },
  { icon: Shield, title: "خصوصية وأمان كامل", description: "بياناتك محمية بتشفير متقدم. لا نشر عام ولا مشاركة بدون إذنك." },
  { icon: BarChart3, title: "تحليلات وتقارير دقيقة", description: "تقارير مفصلة وإحصائيات شاملة لمساعدة النواب في اتخاذ قرارات أسرع وأدق." },
  { icon: Zap, title: "متابعة لحظية", description: "تابع حالة مشكلتك لحظة بلحظة مع إشعارات فورية عند كل تحديث." },
  { icon: Globe, title: "تغطية شاملة", description: "ربط المواطنين بالنواب في كل المحافظات والدوائر الانتخابية." },
  { icon: ClipboardCheck, title: "مراجعة دقيقة ومهنية", description: "فريق متخصص يراجع ويصنّف كل مشكلة ويعيد صياغتها باحترافية قبل عرضها." },
];

const stats = [
  { value: "٢,٤٥٠+", label: "مشكلة تم حلها", icon: CheckCircle2 },
  { value: "١٥٠+", label: "نائب مشارك", icon: Users },
  { value: "٩٨%", label: "نسبة رضا المواطنين", icon: Star },
];

const steps = [
  { num: "١", title: "سجّل حسابك", desc: "أنشئ حساب مواطن مجاناً في ثوانٍ معدودة", icon: FileCheck },
  { num: "٢", title: "قدّم مشكلتك", desc: "اكتب المشكلة وارفق حتى 5 صور أو ملفات", icon: MessageSquare },
  { num: "٣", title: "مراجعة وتصنيف", desc: "فريق الإدارة يراجع ويصنّف المشكلة ويوجهها للنائب المختص", icon: ClipboardCheck },
  { num: "٤", title: "تابع الحل", desc: "استلم إشعارات فورية وأكّد الحل", icon: Eye },
];

const testimonials = [
  { name: "أحمد محمد", location: "القاهرة", text: "قدّمت مشكلة المياه في منطقتنا وتم حلها خلال أسبوع. منصة ممتازة!", rating: 5 },
  { name: "فاطمة علي", location: "الإسكندرية", text: "أخيراً صوتنا بيوصل للنواب بشكل مباشر وبنتابع الحل خطوة بخطوة.", rating: 5 },
  { name: "محمود حسن", location: "الجيزة", text: "النائب تواصل معايا شخصياً وتم إصلاح الطريق في أقل من شهر.", rating: 5 },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const Landing = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <AppHeader />

      {/* Hero Section */}
      <section ref={heroRef} className="relative">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-[500px] h-[500px] rounded-full bg-accent/[0.04] blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-primary/[0.04] blur-3xl" />
          <div className="absolute top-40 right-10 w-2 h-2 rounded-full bg-accent/30 animate-pulse" />
          <div className="absolute top-60 left-20 w-1.5 h-1.5 rounded-full bg-primary/30 animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute bottom-40 right-1/3 w-1 h-1 rounded-full bg-warning/40 animate-pulse" style={{ animationDelay: "2s" }} />
        </div>

        <motion.div style={{ opacity: heroOpacity, scale: heroScale }} className="container py-20 md:py-32 px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                transition={{ delay: 0.2, duration: 0.5 }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent/[0.08] text-accent text-sm font-medium mb-8 border border-accent/15 backdrop-blur-sm"
              >
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                منصة التواصل المدني الأولى في مصر
              </motion.div>

              <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-foreground mb-8 leading-[1.15] tracking-tight">
                صوتك يوصل.
                <br />
                <span className="relative">
                  <span className="bg-gradient-to-l from-accent via-accent to-primary bg-clip-text text-transparent">
                    مشكلتك تُحل.
                  </span>
                  <motion.span
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
                    className="absolute -bottom-2 right-0 left-0 h-1 bg-gradient-to-l from-accent to-primary rounded-full origin-right"
                  />
                </span>
              </h1>

              <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed font-light">
                منصة <span className="text-foreground font-medium">"صوتك"</span> تربط المواطنين بأعضاء مجلس النواب مباشرة.
                <br className="hidden sm:block" />
                قدّم مشكلتك بسهولة، تابع حلها، وأكّد النتيجة.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/auth">
                  <Button size="lg" className="gap-2.5 bg-accent text-accent-foreground hover:bg-accent/90 px-10 w-full sm:w-auto h-14 text-base font-semibold shadow-xl shadow-accent/25 hover:shadow-accent/35 transition-all hover:-translate-y-0.5">
                    قدّم مشكلتك الآن
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="lg" variant="outline" className="gap-2.5 px-10 w-full sm:w-auto h-14 text-base font-medium border-2 border-border hover:border-accent/30 hover:bg-accent/5 transition-all">
                    دخول النواب
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Stats - Floating Cards */}
      <section className="relative -mt-4 z-10">
        <div className="container px-4">
          <motion.div 
            variants={containerVariants} 
            initial="hidden" 
            whileInView="visible" 
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-3 gap-3 md:gap-6 max-w-3xl mx-auto"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className="bg-card border border-border rounded-2xl p-4 md:p-6 text-center shadow-sm hover:shadow-md transition-all hover:-translate-y-1 group"
              >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-accent/[0.08] flex items-center justify-center mx-auto mb-3 group-hover:bg-accent/15 transition-colors">
                  <stat.icon className="w-5 h-5 md:w-6 md:h-6 text-accent" />
                </div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-1 tabular-nums">{stat.value}</div>
                <div className="text-xs sm:text-sm text-muted-foreground font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works - Timeline */}
      <section className="container py-20 md:py-28 px-4">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-14">
          <span className="text-accent text-sm font-semibold tracking-wide mb-3 block">كيف يعمل</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">أربع خطوات بسيطة</h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-base md:text-lg font-light">من تقديم المشكلة إلى حلها، كل شيء واضح وبسيط</p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-0 max-w-5xl mx-auto relative"
        >
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-16 right-[12.5%] left-[12.5%] h-px bg-gradient-to-l from-accent/20 via-primary/20 to-warning/20" />

          {steps.map((step, i) => (
            <motion.div key={i} variants={itemVariants} className="relative flex md:flex-col items-start md:items-center gap-4 md:gap-0 md:px-4">
              {/* Step number circle */}
              <div className="relative z-10 shrink-0">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-card border-2 border-accent/20 flex items-center justify-center shadow-sm md:mb-5 group hover:border-accent/40 transition-colors">
                  <step.icon className="w-6 h-6 md:w-7 md:h-7 text-accent" />
                </div>
                <span className="absolute -top-2 -right-2 w-7 h-7 rounded-lg bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold shadow-md">
                  {step.num}
                </span>
              </div>
              <div className="md:text-center">
                <h3 className="font-bold text-foreground text-base md:text-lg mb-1">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-[200px] md:max-w-none">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Features - Bento Grid */}
      <section className="bg-card/40 border-y border-border">
        <div className="container py-20 md:py-28 px-4">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-14">
            <span className="text-primary text-sm font-semibold tracking-wide mb-3 block">المميزات</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">لماذا صوتك؟</h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-base md:text-lg font-light">مميزات تجعل التواصل المدني أسهل وأكثر فعالية</p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 max-w-5xl mx-auto"
          >
            {features.map((feature, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className="bg-card border border-border rounded-2xl p-6 group hover:border-accent/25 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 flex items-center justify-center mb-4 group-hover:from-accent/20 group-hover:to-accent/10 transition-colors">
                  <feature.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-bold text-foreground mb-2 text-base md:text-lg">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container py-20 md:py-28 px-4">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-14">
          <span className="text-success text-sm font-semibold tracking-wide mb-3 block">آراء المستخدمين</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">ماذا يقول المواطنون؟</h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-base md:text-lg font-light">تجارب حقيقية من مستخدمي منصة صوتك</p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid sm:grid-cols-3 gap-4 md:gap-5 max-w-4xl mx-auto"
        >
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              className="bg-card border border-border rounded-2xl p-6 hover:shadow-md transition-all"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 text-warning fill-warning" />
                ))}
              </div>
              <p className="text-foreground text-sm leading-relaxed mb-5">"{t.text}"</p>
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-accent">{t.name.charAt(0)}</span>
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.location}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA */}
      <section className="container py-10 md:py-16 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent/[0.06] via-card to-primary/[0.06] border border-accent/15 text-center max-w-3xl mx-auto p-10 md:p-16"
        >
          {/* Decorative */}
          <div className="absolute top-0 left-0 w-40 h-40 rounded-full bg-accent/[0.06] blur-3xl" />
          <div className="absolute bottom-0 right-0 w-40 h-40 rounded-full bg-primary/[0.06] blur-3xl" />

          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-6">
              <Headphones className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">ابدأ الآن مجاناً</h3>
            <p className="text-muted-foreground text-base mb-8 max-w-md mx-auto leading-relaxed">
              سجّل حسابك وقدّم مشكلتك الأولى في أقل من دقيقة.
              <br />
              صوتك يستحق أن يُسمع.
            </p>
            <Link to="/auth">
              <Button size="lg" className="gap-2.5 bg-accent text-accent-foreground hover:bg-accent/90 px-10 h-14 text-base font-semibold shadow-xl shadow-accent/25 hover:shadow-accent/35 transition-all hover:-translate-y-0.5">
                سجّل حسابك الآن
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 bg-card/30">
        <div className="container text-center px-4">
          <div className="flex items-center justify-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">ص</span>
            </div>
            <span className="font-bold text-lg text-foreground">صوتك</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">منصة التواصل المدني — ربط المواطنين بالنواب لحل المشاكل</p>
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span>© ٢٠٢٦ صوتك</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>جميع الحقوق محفوظة</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
