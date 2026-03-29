import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wand2, 
  FileText, 
  Sparkles, 
  Copy, 
  Download, 
  Send, 
  RefreshCcw,
  Lightbulb,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Info,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface DraftedDocument {
  id: string;
  type: 'parliamentary_inquiry' | 'bill_proposal' | 'urgent_motion' | 'written_question';
  title: string;
  content: string;
  sourceComplaints: number;
  confidence: number;
  generatedAt: string;
  status: 'draft' | 'reviewed' | 'submitted';
}

export const AILegislativeDrafter: React.FC = () => {
  const [drafts, setDrafts] = useState<DraftedDocument[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<DraftedDocument | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);

  const generateDraft = async () => {
    setIsGenerating(true);
    toast.info("جاري تحليل الشكاوى وصياغة المسودة القانونية...");
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const newDraft: DraftedDocument = {
      id: `draft-${Date.now()}`,
      type: 'parliamentary_inquiry',
      title: 'طلب إحاطة بشأن أزمة المياه المتكررة في الحي الثالث والرابع',
      content: `السيد الأستاذ/ رئيس مجلس النواب
تحية طيبة وبعد،،

يتقدم النائب عن دائرة [الدائرة] بطلب إحاطة بشأن الأزمة المتكررة لانقطاع المياه في الحي الثالث والرابع، والتي تؤثر على حياة أكثر من 50,000 مواطن.

وقد تبين من تحليل الشكاوى المسجلة في تطبيق Haqak أن:
1. تكرار الأزمة بمعدل مرة كل أسبوعين بمتوسط انقطاع 36 ساعة
2. عدم وجود إنذار مسبق للمواطنين
3. غياب خطة صيانة دورية واضحة من الشركة المسؤولة

لذا يطلب النائب من الحكومة:
أ) توضيح الأسباب الحقيقية لتكرار الأزمة
ب) تقديم خطة زمنية لحل المشكلة جذرياً
ج) تعويض المواطنين المتضررين

وتفضلوا بقبول فائق الاحترام والتقدير،،`,
      sourceComplaints: 127,
      confidence: 94,
      generatedAt: new Date().toISOString(),
      status: 'draft'
    };

    setDrafts([newDraft, ...drafts]);
    setSelectedDraft(newDraft);
    setIsGenerating(false);
    toast.success("تم صياغة المسودة بنجاح!");
  };

  const copyContent = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("تم نسخ المسودة للحافظة");
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'parliamentary_inquiry': return 'طلب إحاطة';
      case 'bill_proposal': return 'مشروع قانون';
      case 'urgent_motion': return 'طلب عاجل';
      case 'written_question': return 'سؤال كتابي';
      default: return 'مسودة';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'parliamentary_inquiry': return '📋';
      case 'bill_proposal': return '⚖️';
      case 'urgent_motion': return '🚨';
      case 'written_question': return '❓';
      default: return '📄';
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wand2 className="w-6 h-6 text-indigo-600" />
            محرك الصياغة التشريعية (AI Legislative Drafter)
          </h2>
          <p className="text-muted-foreground">تحويل آلاف الشكاوى إلى مسودات قوانين وطلبات إحاطة محكمة</p>
        </div>
        <Badge variant="outline" className="px-3 py-1 gap-1 border-indigo-200 text-indigo-700 bg-indigo-50">
          <Sparkles className="w-4 h-4" />
          مدعوم بـ GPT-4
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-indigo-600 font-bold uppercase">المسودات المُنشأة</p>
                <p className="text-2xl font-bold text-indigo-900 mt-1">{drafts.length}</p>
              </div>
              <div className="w-10 h-10 bg-indigo-200 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-600 font-bold uppercase">معدل الثقة</p>
                <p className="text-2xl font-bold text-emerald-900 mt-1">94%</p>
              </div>
              <div className="w-10 h-10 bg-emerald-200 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-600 font-bold uppercase">الشكاوى المحللة</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">2,847</p>
              </div>
              <div className="w-10 h-10 bg-purple-200 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-indigo-100 shadow-sm overflow-hidden">
        <CardHeader className="bg-indigo-50/30">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">مولد المسودات الذكي</CardTitle>
              <CardDescription>اضغط لتحويل أحدث الشكاوى إلى مسودة قانونية محكمة</CardDescription>
            </div>
            <Button 
              onClick={() => setShowGenerator(!showGenerator)}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700"
            >
              <Sparkles className="w-4 h-4" />
              إنشاء مسودة جديدة
            </Button>
          </div>
        </CardHeader>

        {showGenerator && (
          <CardContent className="pt-6 pb-0 border-b">
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4 pb-6"
            >
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-indigo-900">
                  <Lightbulb className="w-4 h-4" />
                  خيارات الصياغة
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Button variant="outline" className="justify-start gap-2 h-10">
                    <span className="text-lg">📋</span> طلب إحاطة
                  </Button>
                  <Button variant="outline" className="justify-start gap-2 h-10">
                    <span className="text-lg">⚖️</span> مشروع قانون
                  </Button>
                  <Button variant="outline" className="justify-start gap-2 h-10">
                    <span className="text-lg">🚨</span> طلب عاجل
                  </Button>
                  <Button variant="outline" className="justify-start gap-2 h-10">
                    <span className="text-lg">❓</span> سؤال كتابي
                  </Button>
                </div>
              </div>

              <Button 
                onClick={generateDraft}
                className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 h-12"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> جاري الصياغة...</>
                ) : (
                  <><Wand2 className="w-4 h-4" /> ابدأ الصياغة الآلية</>
                )}
              </Button>
            </motion.div>
          </CardContent>
        )}
      </Card>

      {drafts.length > 0 && (
        <Card className="border-indigo-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              المسودات المُنتجة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {drafts.map((draft, idx) => (
              <motion.div
                key={draft.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="border rounded-xl p-4 hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedDraft(draft)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-2xl">{getTypeIcon(draft.type)}</span>
                    <div className="flex-1">
                      <h4 className="font-bold text-sm mb-1">{draft.title}</h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="text-[10px] bg-indigo-100 text-indigo-700 border-indigo-200">
                          {getTypeLabel(draft.type)}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {draft.sourceComplaints} شكوى
                        </Badge>
                        <Badge variant="outline" className="text-[10px] text-emerald-700">
                          {draft.confidence}% ثقة
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Badge className={draft.status === 'draft' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-700'}>
                    {draft.status === 'draft' ? 'مسودة' : 'موثق'}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}

      {selectedDraft && (
        <Card className="border-indigo-100 bg-indigo-50/30 shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{selectedDraft.title}</CardTitle>
                <CardDescription className="mt-2">
                  مسودة من {selectedDraft.sourceComplaints} شكوى | معدل ثقة: {selectedDraft.confidence}%
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => copyContent(selectedDraft.content)}>
                  <Copy className="w-4 h-4" />
                  نسخ
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  تحميل
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-white border rounded-lg p-6 mb-4 whitespace-pre-wrap font-serif text-sm leading-relaxed text-slate-800 max-h-96 overflow-y-auto">
              {selectedDraft.content}
            </div>
          </CardContent>
          <CardFooter className="bg-indigo-50/50 border-t gap-2">
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 flex-1">
              <Send className="w-4 h-4" />
              إرسال للبرلمان
            </Button>
            <Button variant="outline" className="gap-2">
              <RefreshCcw className="w-4 h-4" />
              إعادة الصياغة
            </Button>
          </CardFooter>
        </Card>
      )}

      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex gap-3 items-start">
        <Info className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-indigo-700 leading-relaxed">
          <strong>كيف يعمل محرك الصياغة:</strong> يحلل النظام آلاف الشكاوى المتشابهة، يستخرج الأنماط والمشاكل المتكررة، ثم يصيغها في "لغة برلمانية" رسمية. النائب يحصل على مسودة جاهزة للإرسال للبرلمان دون الحاجة لمستشارين قانونيين.
        </p>
      </div>
    </div>
  );
};
