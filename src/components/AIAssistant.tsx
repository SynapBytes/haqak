import { useMemo, useState } from "react";
import { Brain, FileText, MessageSquare, Sparkles, Wand2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const draftTemplates = [
  {
    title: "سؤال برلماني رسمي",
    tone: "رسمي",
    template: (topic: string) => `السيد رئيس المجلس،\n\nأتقدم بهذا السؤال البرلماني بشأن ${topic}.\n\nنلتمس إفادة واضحة حول الإجراءات الحالية، والجدول الزمني المقترح، وآلية المتابعة مع المواطنين.\n\nوتفضلوا بقبول فائق الاحترام.`,
  },
  {
    title: "طلب إحاطة عاجل",
    tone: "عاجل",
    template: (topic: string) => `السيد رئيس المجلس،\n\nأطلب إحاطة عاجلة بشأن ${topic} لما له من أثر مباشر على المواطنين.\n\nبرجاء عرض الموقف التنفيذي والإجراءات المقترحة للحل بصورة عاجلة.`,
  },
  {
    title: "خطاب تنسيقي",
    tone: "تعاوني",
    template: (topic: string) => `تحية طيبة وبعد،\n\nنخاطبكم بخصوص ${topic}.\n\nنأمل التنسيق بين الجهات المعنية لسرعة الدراسة والتنفيذ، مع موافاتنا بخطة العمل والمتابعة.`,
  },
];

const botReplies = [
  {
    keywords: ["مواعيد", "مكتب", "النائب"],
    answer: "يمكن متابعة مكتب النائب خلال مواعيد العمل الرسمية، أو عبر قنوات التواصل الظاهرة داخل المنصة لكل دائرة.",
  },
  {
    keywords: ["شكوى", "تقديم"],
    answer: "لتقديم شكوى: اختر الفئة، اكتب الوصف بوضوح، أرفق المستندات إن وجدت، ثم أرسل الطلب لمتابعته من داخل حسابك.",
  },
  {
    keywords: ["متابعة", "حالة"],
    answer: "يمكنك متابعة حالة الطلب من لوحة التحكم، وستظهر لك مراحل الاستلام والمراجعة والإغلاق فور تحديثها.",
  },
];

export const AIAssistant = () => {
  const [activeTab, setActiveTab] = useState<"drafting" | "bot">("drafting");
  const [topic, setTopic] = useState("");
  const [question, setQuestion] = useState("");

  const generatedDrafts = useMemo(() => {
    if (!topic.trim()) return [];
    return draftTemplates.map((item) => ({
      ...item,
      content: item.template(topic.trim()),
    }));
  }, [topic]);

  const botAnswer = useMemo(() => {
    if (!question.trim()) return "اكتب سؤالك للحصول على رد إرشادي سريع.";
    const match = botReplies.find((item) =>
      item.keywords.some((keyword) => question.includes(keyword)),
    );
    return (
      match?.answer ||
      "يمكنني مساعدتك في صياغة الطلبات، فهم خطوات التقديم، ومتابعة الحالة العامة للطلبات داخل المنصة."
    );
  }, [question]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            مساعد الذكاء الاصطناعي
          </CardTitle>
          <CardDescription>
            مساحة مساعدة سريعة لصياغة الطلبات الرسمية والإجابة على الأسئلة الشائعة.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "drafting" | "bot")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="drafting" className="gap-2">
            <Wand2 className="h-4 w-4" />
            الصياغة
          </TabsTrigger>
          <TabsTrigger value="bot" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            الأسئلة السريعة
          </TabsTrigger>
        </TabsList>

        <TabsContent value="drafting" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">أنشئ مسودة أولية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="اكتب المشكلة أو الموضوع المطلوب صياغته..."
                className="min-h-28"
              />
              <div className="grid gap-4 md:grid-cols-3">
                {generatedDrafts.length > 0 ? (
                  generatedDrafts.map((draft) => (
                    <Card key={draft.title} className="border-border/60">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-base">{draft.title}</CardTitle>
                          <Badge variant="secondary">{draft.tone}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{draft.content}</p>
                        <Button type="button" variant="outline" className="w-full gap-2">
                          <FileText className="h-4 w-4" />
                          جاهز للنسخ
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="md:col-span-3 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    اكتب موضوعًا بالأعلى لعرض مسودات جاهزة.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bot" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ردود إرشادية سريعة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="مثال: كيف أقدم شكوى؟"
                className="min-h-24"
              />
              <div className="rounded-lg border bg-muted/30 p-4 text-sm leading-7 text-foreground">
                <div className="mb-2 flex items-center gap-2 font-medium">
                  <Sparkles className="h-4 w-4 text-primary" />
                  الرد المقترح
                </div>
                {botAnswer}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIAssistant;
