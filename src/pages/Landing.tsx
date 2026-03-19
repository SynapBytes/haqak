import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/AppHeader";
import { MessageSquare, Shield, BarChart3, Zap, Users, ArrowLeft, CheckCircle2 } from "lucide-react";

const features = [
  { icon: MessageSquare, title: "إبلاغ سهل وسريع", description: "قدّم مشكلتك في أقل من 30 ثانية مع دعم رفع الصور والتصنيف التلقائي." },
  { icon: Shield, title: "خصوصية كاملة", description: "بياناتك محمية بالكامل. لا نشر عام ولا مشاركة بدون إذنك." },
  { icon: BarChart3, title: "تحليل ذكي بالذكاء الاصطناعي", description: "تصنيف تلقائي وتلخيص للمشاكل لمساعدة النواب في اتخاذ قرارات أسرع." },
  { icon: Zap, title: "متابعة لحظية", description: "تابع حالة مشكلتك لحظة بلحظة من الاستلام حتى الحل." },
];

const stats = [
  { value: "٢,٤٥٠", label: "مشكلة تم حلها" },
  { value: "١٥٠+", label: "نائب مشارك" },
  { value: "٩٨%", label: "نسبة الرضا" },
];

const steps = [
  { num: "١", title: "سجّل حسابك", desc: "أنشئ حساب مواطن في ثوانٍ معدودة" },
  { num: "٢", title: "قدّم مشكلتك", desc: "اكتب المشكلة وارفق الصور والملفات" },
  { num: "٣", title: "تصنيف تلقائي", desc: "الذكاء الاصطناعي يصنّف ويلخص المشكلة" },
  { num: "٤", title: "تابع الحل", desc: "استلم إشعارات فورية عند كل تحديث" },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* Hero */}
      <section className="container py-16 md:py-28 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
              <Users className="w-4 h-4" />
              منصة التواصل المدني الأولى
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              صوتك يصل.
              <br />
              <span className="text-accent">مشكلتك تُحل.</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              منصة "صوت" تربط المواطنين بأعضاء مجلس النواب مباشرة.
              قدّم مشكلتك بسهولة، وتابع حلها خطوة بخطوة.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/auth">
                <Button size="lg" className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 px-8 w-full sm:w-auto h-12 text-base">
                  قدّم مشكلتك الآن
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="gap-2 px-8 w-full sm:w-auto h-12 text-base">
                  دخول النواب
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-card">
        <div className="container py-10 px-4">
          <div className="grid grid-cols-3 gap-4 md:gap-8">
            {stats.map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }} className="text-center">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-1">{stat.value}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container py-16 md:py-20 px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">كيف يعمل "صوت"؟</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">نظام بسيط وآمن يحول شكاوى المواطنين إلى إجراءات فعلية</p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16 max-w-4xl mx-auto">
          {steps.map((step, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
              className="civic-card text-center relative">
              <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                {step.num}
              </div>
              <h3 className="font-semibold text-foreground text-sm mb-1">{step.title}</h3>
              <p className="text-xs text-muted-foreground">{step.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Features */}
        <div className="grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {features.map((feature, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
              className="civic-card flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <feature.icon className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1 text-sm md:text-base">{feature.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container py-16 px-4">
        <div className="civic-card text-center max-w-2xl mx-auto bg-accent/5 border-accent/20">
          <CheckCircle2 className="w-12 h-12 text-accent mx-auto mb-4" />
          <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">ابدأ الآن مجاناً</h3>
          <p className="text-muted-foreground text-sm mb-6">سجّل حسابك وقدّم مشكلتك الأولى في أقل من دقيقة</p>
          <Link to="/auth">
            <Button size="lg" className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 px-8 h-12">
              سجّل حسابك الآن <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container text-center text-sm text-muted-foreground px-4">
          © ٢٠٢٦ صوت — منصة التواصل المدني. جميع الحقوق محفوظة.
        </div>
      </footer>
    </div>
  );
};

export default Landing;
