import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/AppHeader";
import { MessageSquare, Shield, BarChart3, Zap, Users, ArrowLeft } from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "إبلاغ سهل وسريع",
    description: "قدّم مشكلتك في أقل من 30 ثانية مع دعم رفع الصور والتصنيف التلقائي.",
  },
  {
    icon: Shield,
    title: "خصوصية كاملة",
    description: "بياناتك محمية بالكامل. لا نشر عام ولا مشاركة بدون إذنك.",
  },
  {
    icon: BarChart3,
    title: "تحليل ذكي بالذكاء الاصطناعي",
    description: "تصنيف تلقائي وتلخيص للمشاكل لمساعدة النواب في اتخاذ قرارات أسرع.",
  },
  {
    icon: Zap,
    title: "متابعة لحظية",
    description: "تابع حالة مشكلتك لحظة بلحظة من الاستلام حتى الحل.",
  },
];

const stats = [
  { value: "٢,٤٥٠", label: "مشكلة تم حلها" },
  { value: "١٥٠+", label: "نائب مشارك" },
  { value: "٩٨%", label: "نسبة الرضا" },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* Hero */}
      <section className="container py-20 md:py-32">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-8">
              <Users className="w-4 h-4" />
              منصة التواصل المدني الأولى
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              صوتك يصل.
              <br />
              <span className="text-accent">مشكلتك تُحل.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              منصة "صوت" تربط المواطنين بأعضاء مجلس النواب مباشرة.
              قدّم مشكلتك بسهولة، وتابع حلها خطوة بخطوة.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/citizen">
                <Button size="lg" className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 px-8">
                  قدّم مشكلتك الآن
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/mp">
                <Button size="lg" variant="outline" className="gap-2 px-8">
                  دخول النواب
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-card">
        <div className="container py-12">
          <div className="grid grid-cols-3 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-4">كيف يعمل "صوت"؟</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            نظام بسيط وآمن يحول شكاوى المواطنين إلى إجراءات فعلية
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="civic-card flex gap-4"
            >
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <feature.icon className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © ٢٠٢٦ صوت — منصة التواصل المدني. جميع الحقوق محفوظة.
        </div>
      </footer>
    </div>
  );
};

export default Landing;
