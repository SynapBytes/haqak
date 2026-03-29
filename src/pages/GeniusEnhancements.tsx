import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Brain, Layers, ShieldCheck, Sparkles, TrendingUp, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
              <h1 className="text-lg font-bold text-foreground">التحسينات الذكية</h1>
              <p className="text-xs text-muted-foreground">رؤية مبسطة للمزايا المتقدمة في Haqak</p>
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
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Brain className="h-6 w-6 text-primary" />
              منصة أكثر استقرارًا ووضوحًا
            </CardTitle>
            <CardDescription>
              تم تبسيط هذه الصفحة مؤقتًا للحفاظ على عمل المعاينة والانتقال السليم بين أجزاء التطبيق.
            </CardDescription>
          </CardHeader>
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
      </main>
    </div>
  );
};

export default GeniusEnhancements;
