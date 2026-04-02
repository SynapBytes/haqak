import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Brain, Layers, ShieldCheck, Sparkles, TrendingUp, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BusinessCategorySelector } from "@/components/BusinessCategorySelector";

const sections = [
  {
    id: "predictive",
    label: "التنبؤ",
    icon: TrendingUp,
    title: "محرك التنبؤ المبكر",
    description: "لوحة مختصرة تعرض كيف يمكن تحليل أنماط الشكاوى قبل تحولها لأزمات أوسع.",
  },
  {
    id: "voting",
    label: "التصويت",
    icon: Vote,
    title: "التصويت التشاوري",
    description: "آلية سريعة لالتقاط نبض المواطنين حول القرارات المحلية والمقترحات البرلمانية.",
  },
  {
    id: "twin",
    label: "التوأم الرقمي",
    icon: Layers,
    title: "التوأم الرقمي للدائرة",
    description: "تصور مرئي لاحتياجات المناطق والخدمات والمشروعات في واجهة واحدة مبسطة.",
  },
  {
    id: "security",
    label: "الحوكمة",
    icon: ShieldCheck,
    title: "الحوكمة والثقة",
    description: "تركيز على الشفافية، التتبع، وسهولة الوصول للمعلومة داخل تجربة أكثر استقرارًا.",
  },
];

const GeniusEnhancements = () => {
  const [activeTab, setActiveTab] = useState("predictive");

  return (
    <div className="min-h-screen bg-background pb-16" dir="rtl">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight">التحسينات العبقرية <span className="text-primary">Haqak</span></h1>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Genius Enhancements v1.0</p>
            </div>
          </div>
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowRight className="h-4 w-4" />
              العودة للرئيسية
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Welcome Card */}
          <Card className="mb-8 border-none bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <CardHeader className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-primary hover:bg-primary text-white border-none">جديد</Badge>
                <span className="text-slate-400 text-sm">7 تحسينات ثورية لمستقبل العمل البرلماني</span>
              </div>
              <CardTitle className="text-3xl md:text-4xl font-black leading-tight">
                تحويل <span className="text-primary">Haqak</span> إلى العقل المفكر للدائرة
              </CardTitle>
              <CardDescription className="text-slate-300 text-lg max-w-2xl mt-2">
                لقد قمنا بدمج أحدث تقنيات الذكاء الاصطناعي، النمذجة الإحصائية، وأنظمة المكافآت لتقديم تجربة ديمقراطية تشاركية فريدة من نوعها.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10 flex gap-4 pt-0">
               <div className="flex -space-x-reverse space-x-2">
                 {sections.map((e) => (
                   <div key={e.id} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20 backdrop-blur-sm">
                     <e.icon className="h-4 w-4 text-primary" />
                   </div>
                 ))}
               </div>
               <div className="text-sm text-slate-400 self-center">تم تفعيل كافة الأنظمة الذكية</div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 gap-2 md:grid-cols-4">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <TabsTrigger key={section.id} value={section.id} className="gap-2">
                    <Icon className="h-4 w-4" />
                    {section.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <TabsContent key={section.id} value={section.id}>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start">
                        <div className="rounded-2xl bg-primary/10 p-4">
                          <Icon className="h-8 w-8 text-primary" />
                        </div>
                        <div className="space-y-3">
                          <h2 className="text-xl font-bold text-foreground">{section.title}</h2>
                          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">{section.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>

          <div className="mt-10">
            <BusinessCategorySelector />
          </div>
        </div>
      </main>
    </div>
  );
};

export default GeniusEnhancements;
