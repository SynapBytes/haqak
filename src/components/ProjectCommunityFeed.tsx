import { useMemo, useState } from "react";
import { Heart, MessageSquare, Newspaper, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const updates = [
  {
    id: "1",
    type: "proposal",
    title: "بدء مراجعة مشروع تطوير الطريق الرئيسي",
    description: "تم تحويل المقترح للمرحلة التالية بعد استكمال المستندات المطلوبة ومراجعة الملاحظات.",
    likes: 24,
    comments: 6,
    time: "منذ ساعتين",
  },
  {
    id: "2",
    type: "funding",
    title: "فتح باب الدعم لمشروع صيانة الإنارة",
    description: "المشروع دخل مرحلة التمويل المجتمعي مع إتاحة المتابعة العامة لحالة التنفيذ.",
    likes: 18,
    comments: 4,
    time: "منذ 5 ساعات",
  },
  {
    id: "3",
    type: "completed",
    title: "الانتهاء من معالجة شكوى منطقة الخدمات",
    description: "تم تنفيذ المعالجة الميدانية وإغلاق الشكوى بعد توثيق النتيجة النهائية.",
    likes: 32,
    comments: 11,
    time: "أمس",
  },
];

export const ProjectCommunityFeed = () => {
  const [filter, setFilter] = useState<"all" | "proposal" | "funding" | "completed">("all");

  const filtered = useMemo(() => {
    if (filter === "all") return updates;
    return updates.filter((item) => item.type === filter);
  }, [filter]);

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            مجتمع المشاريع
          </CardTitle>
          <CardDescription>آخر المستجدات المجتمعية بصورة مبسطة وواضحة.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>الكل</Button>
          <Button variant={filter === "proposal" ? "default" : "outline"} size="sm" onClick={() => setFilter("proposal")}>مقترحات</Button>
          <Button variant={filter === "funding" ? "default" : "outline"} size="sm" onClick={() => setFilter("funding")}>تمويل</Button>
          <Button variant={filter === "completed" ? "default" : "outline"} size="sm" onClick={() => setFilter("completed")}>مكتمل</Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {filtered.map((update, index) => (
          <motion.div key={update.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{update.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{update.time}</p>
                  </div>
                  <Badge variant="secondary">{update.type}</Badge>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{update.description}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Heart className="h-4 w-4" /> {update.likes}</span>
                  <span className="flex items-center gap-1"><MessageSquare className="h-4 w-4" /> {update.comments}</span>
                  <Button type="button" variant="ghost" size="sm" className="ms-auto gap-2">
                    <Share2 className="h-4 w-4" />
                    مشاركة
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ProjectCommunityFeed;
