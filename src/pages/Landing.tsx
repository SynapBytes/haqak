import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/AppHeader";
import { MessageSquare, Shield, BarChart3, Zap, Users, ArrowLeft, CheckCircle2, Sparkles, Globe } from "lucide-react";

const features = [
  { icon: MessageSquare, title: "إبلاغ سهل وسريع", description: "قدّم مشكلتك في أقل من 30 ثانية مع دعم رفع الصور والتصنيف التلقائي بالذكاء الاصطناعي." },
  { icon: Shield, title: "خصوصية وأمان كامل", description: "بياناتك محمية بتشفير متقدم. لا نشر عام ولا مشاركة بدون إذنك." },
  { icon: BarChart3, title: "تحليلات ذكية", description: "تصنيف وتلخيص تلقائي للمشاكل لمساعدة النواب في اتخاذ قرارات أسرع وأدق." },
  { icon: Zap, title: "متابعة لحظية", description: "تابع حالة مشكلتك لحظة بلحظة مع إشعارات فورية عند كل تحديث." },
  { icon: Globe, title: "تغطية شاملة", description: "ربط المواطنين بالنواب في كل المحافظات والدوائر الانتخابية." },
  { icon: Sparkles, title: "ذكاء اصطناعي متقدم", description: "فلترة تلقائية للمحتوى غير اللائق وإعادة صياغة المشاكل باحترافية." },
];

const stats = [
  { value: "٢,٤٥٠+", label: "مشكلة تم حلها", color: "text-success" },
  { value: "١٥٠+", label: "نائب مشارك", color: "text-accent" },
  { value: "٩٨%", label: "نسبة رضا المواطنين", color: "text-primary" },
];

const steps = [
  { num: "١", title: "سجّل حسابك", desc: "أنشئ حساب مواطن مجاناً في ثوانٍ معدودة", color: "from-accent to-accent/70" },
  { num: "٢", title: "قدّم مشكلتك", desc: "اكتب المشكلة وارفق حتى 5 صور أو ملفات", color: "from-primary to-primary/70" },
  { num: "٣", title: "تصنيف ذكي", desc: "الذكاء الاصطناعي يصنّف ويلخّص المشكلة تلقائياً", color: "from-warning to-warning/70" },
  { num: "٤", title: "تابع الحل", desc: "استلم إشعارات فورية وأكّد الحل", color: "from-success to-success/70" },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* Hero */}
      <section className="container py-16 md:py-28 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6 border border-accent/20">
              <Sparkles className="w-4 h-4" />
              منصة التواصل المدني الأذكى في مصر
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              صوتك يوصل.
              <br />
              <span className="bg-gradient-to-l from-accent to-primary bg-clip-text text-transparent">مشكلتك تُحل.</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              منصة "صوتك" تربط المواطنين بأعضاء مجلس النواب مباشرة.
              قدّم مشكلتك بسهولة، تابع حلها لحظة بلحظة، وأكّد النتيجة.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/auth">
                <Button size="lg" className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 px-8 w-full sm:w-auto h-12 text-base shadow-lg shadow-accent/20">
                  قدّم مشكلتك الآن
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="gap-2 px-8 w-full sm:w-auto h-12 text-base border-border hover:bg-secondary">
                  دخول النواب
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-card/50">
        <div className="container py-10 px-4">
          <div className="grid grid-cols-3 gap-4 md:gap-8">
            {stats.map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }} className="text-center">
                <div className={`text-2xl sm:text-3xl md:text-4xl font-bold mb-1 ${stat.color}`}>{stat.value}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container py-16 md:py-24 px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">كيف يعمل "صوتك"؟</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">أربع خطوات بسيطة تحوّل مشكلتك إلى حل فعلي</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20 max-w-4xl mx-auto">
          {steps.map((step, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
              className="civic-card text-center group hover:shadow-md transition-all">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${step.color} text-white flex items-center justify-center mx-auto mb-3 text-lg font-bold shadow-sm`}>
                {step.num}
              </div>
              <h3 className="font-semibold text-foreground text-sm mb-1">{step.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Features */}
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">لماذا صوتك؟</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">مميزات تجعل التواصل المدني أسهل وأكثر فعالية</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {features.map((feature, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.08 }}
              className="civic-card-hover flex gap-4 group">
              <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/20 transition-colors">
                <feature.icon className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1 text-sm md:text-base">{feature.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container py-16 px-4">
        <div className="relative overflow-hidden civic-card text-center max-w-2xl mx-auto bg-gradient-to-br from-accent/5 to-primary/5 border-accent/20">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
          <div className="relative">
            <CheckCircle2 className="w-14 h-14 text-accent mx-auto mb-4" />
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">ابدأ الآن مجاناً</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">سجّل حسابك وقدّم مشكلتك الأولى في أقل من دقيقة. صوتك يستحق أن يُسمع.</p>
            <Link to="/auth">
              <Button size="lg" className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 px-8 h-12 shadow-lg shadow-accent/20">
                سجّل حسابك الآن <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-card/30">
        <div className="container text-center px-4">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center">
              <span className="text-white font-bold text-xs">ص</span>
            </div>
            <span className="font-bold text-foreground">صوتك</span>
          </div>
          <p className="text-sm text-muted-foreground">© ٢٠٢٦ صوتك — منصة التواصل المدني. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
