import { useMemo, useState } from "react";
import { BookOpen, MessageCircle, Scale } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const suggestions = [
  "كيف أقدم شكوى؟",
  "ما هي حقوقي كمواطن؟",
  "كم تستغرق معالجة الطلب؟",
];

const knowledgeBase = [
  {
    keywords: ["كيف", "شكوى", "أقدم"],
    answer:
      "لتقديم شكوى: اختر الفئة المناسبة، اكتب العنوان والوصف بشكل واضح، أرفق الأدلة إن وجدت، ثم أرسل الطلب لمتابعته من حسابك.",
    references: ["دليل تقديم الشكاوى", "سياسة المتابعة والرد"],
  },
  {
    keywords: ["حقوق", "مواطن"],
    answer:
      "من حقك تقديم الطلب، متابعة حالته، معرفة آخر التحديثات، والاعتراض أو إعادة التوضيح إذا كانت البيانات غير كافية.",
    references: ["سياسة حماية البيانات", "سياسة الاستخدام"],
  },
  {
    keywords: ["كم", "مدة", "تستغرق"],
    answer:
      "تختلف المدة حسب نوع الطلب وأولويته، لكن المنصة تعرض لك كل مرحلة بوضوح بمجرد تحديث الحالة من الجهة المختصة.",
    references: ["إجراءات معالجة الطلبات"],
  },
];

export const AILegalBot = () => {
  const [question, setQuestion] = useState("");

  const result = useMemo(() => {
    if (!question.trim()) {
      return {
        answer: "اكتب سؤالك أو اختر أحد الاقتراحات السريعة لعرض الإجابة.",
        references: [] as string[],
      };
    }

    const match = knowledgeBase.find((item) =>
      item.keywords.some((keyword) => question.includes(keyword)),
    );

    return (
      match || {
        answer:
          "يمكنني مساعدتك في فهم خطوات التقديم، الحقوق الأساسية، ومدة المتابعة العامة داخل المنصة.",
        references: ["مركز المساعدة"],
      }
    );
  }, [question]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          المساعد القانوني الذكي
        </CardTitle>
        <CardDescription>
          إجابات إرشادية سريعة لمساعدة المواطنين على فهم إجراءات التقديم والمتابعة.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {suggestions.map((item) => (
            <Button key={item} type="button" variant="outline" size="sm" onClick={() => setQuestion(item)}>
              {item}
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="اكتب سؤالك هنا..."
          />
          <Button type="button">إرسال</Button>
        </div>

        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="mb-3 flex items-center gap-2 font-medium text-foreground">
            <Scale className="h-4 w-4 text-primary" />
            الرد
          </div>
          <p className="text-sm leading-7 text-muted-foreground">{result.answer}</p>
        </div>

        {result.references.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <BookOpen className="h-4 w-4 text-primary" />
              مراجع مرتبطة
            </div>
            <div className="flex flex-wrap gap-2">
              {result.references.map((reference) => (
                <Badge key={reference} variant="secondary">
                  {reference}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AILegalBot;
