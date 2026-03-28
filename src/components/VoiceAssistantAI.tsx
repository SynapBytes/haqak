import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  Square, 
  Play, 
  FileText, 
  MapPin, 
  Tag, 
  Send, 
  RefreshCcw, 
  CheckCircle2, 
  Loader2, 
  Wand2, 
  AlertCircle,
  Volume2,
  Trash2,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface AIAction {
  category: string;
  location: string;
  urgency: 'high' | 'medium' | 'low';
  summary: string;
  draftLetter: string;
}

export const VoiceAssistantAI: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AIAction | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = () => {
    setIsRecording(true);
    setTranscription(null);
    setAiResult(null);
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
    toast.info("جاري التسجيل... تحدث بوضوح عن المشكلة والموقع");
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    processVoice();
  };

  const processVoice = async () => {
    setIsProcessing(true);
    // Simulate Voice-to-Text and AI Analysis
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    const mockTranscription = "أنا الآن في شارع العشرين بفيصل، هناك تجمع كبير للقمامة بجوار مدرسة الشهيد، الرائحة لا تطاق والوضع يهدد صحة الطلاب، يجب مخاطبة رئيس الحي فوراً لرفع هذه المخلفات وتوفير صناديق إضافية.";
    setTranscription(mockTranscription);
    
    // AI Classification and Draft Generation
    const mockAIResult: AIAction = {
      category: "نظافة وبيئة",
      location: "شارع العشرين، فيصل - مدرسة الشهيد",
      urgency: "high",
      summary: "تراكم نفايات خطير بجوار مدرسة الشهيد بفيصل يتطلب تدخل عاجل من الحي.",
      draftLetter: `السيد الأستاذ/ رئيس حي بولاق الدكرور
تحية طيبة وبعد،،

بصفتي نائباً عن الدائرة، أحيط سيادتكم علماً بوجود شكوى ملحة من أهالي منطقة شارع العشرين بفيصل، حيث تتراكم كميات كبيرة من النفايات بجوار سور مدرسة الشهيد، مما يمثل خطراً بيئياً وصحياً داهماً على أبنائنا الطلاب والمواطنين.

لذا، نرجو من سيادتكم التوجيه بسرعة رفع هذه التراكمات، وتوفير صناديق قمامة إضافية في المنطقة لضمان عدم تكرار المشكلة.

وتفضلوا بقبول فائق الاحترام والتقدير،،`
    };
    
    setAiResult(mockAIResult);
    setIsProcessing(false);
    toast.success("تم تحليل الصوت وصياغة الخطاب بنجاح");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const copyDraft = () => {
    if (aiResult) {
      navigator.clipboard.writeText(aiResult.draftLetter);
      toast.success("تم نسخ الخطاب للحافظة");
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Mic className="w-6 h-6 text-rose-600" />
            مساعد النائب الصوتي (Voice-to-Action)
          </h2>
          <p className="text-muted-foreground">حول جولاتك الميدانية إلى إجراءات رسمية فورية</p>
        </div>
        <Badge variant="outline" className="px-3 py-1 gap-1 border-rose-200 text-rose-700">
          <Wand2 className="w-4 h-4" />
          مدعوم بالذكاء الاصطناعي
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recording Interface */}
        <Card className="border-rose-100 shadow-sm overflow-hidden">
          <CardHeader className="bg-rose-50/30">
            <CardTitle className="text-lg">مركز التحكم الصوتي</CardTitle>
            <CardDescription>سجل ملاحظاتك الصوتية وسيتولى النظام الباقي</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-10 space-y-6">
            <div className="relative">
              <AnimatePresence>
                {isRecording && (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1.2, opacity: 0.2 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute inset-0 bg-rose-500 rounded-full"
                  />
                )}
              </AnimatePresence>
              <Button
                size="icon"
                variant={isRecording ? "destructive" : "default"}
                className={`w-24 h-24 rounded-full shadow-lg relative z-10 transition-all ${isRecording ? 'bg-rose-600' : 'bg-rose-500 hover:bg-rose-600'}`}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
              >
                {isRecording ? (
                  <Square className="w-10 h-10 fill-white" />
                ) : (
                  <Mic className="w-10 h-10" />
                )}
              </Button>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-mono font-bold text-rose-600 mb-1">
                {formatTime(recordingTime)}
              </div>
              <p className="text-sm text-muted-foreground">
                {isRecording ? "جاري الاستماع..." : isProcessing ? "جاري معالجة الصوت وتحليل البيانات..." : "اضغط للبدء بالتسجيل"}
              </p>
            </div>

            {isProcessing && (
              <div className="w-full max-w-xs space-y-2">
                <div className="flex justify-between text-xs text-rose-600 font-medium">
                  <span>تحليل الأنماط الجغرافية...</span>
                  <span>75%</span>
                </div>
                <div className="w-full bg-rose-100 rounded-full h-1.5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "75%" }}
                    className="bg-rose-500 h-1.5 rounded-full"
                  />
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-muted/10 border-t flex justify-between">
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => {setTranscription(null); setAiResult(null);}}>
              <Trash2 className="w-4 h-4" />
              مسح
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Volume2 className="w-4 h-4" />
                معاينة الصوت
              </Button>
            </div>
          </CardFooter>
        </Card>

        {/* AI Result Card */}
        <AnimatePresence mode="wait">
          {aiResult ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="h-full border-emerald-100 shadow-sm">
                <CardHeader className="bg-emerald-50/30 flex-row justify-between items-start space-y-0">
                  <div>
                    <CardTitle className="text-lg">التحليل التلقائي والخطاب</CardTitle>
                    <CardDescription>تم تصنيف المشكلة وصياغة خطاب رسمي</CardDescription>
                  </div>
                  <Badge className={aiResult.urgency === 'high' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-amber-100 text-amber-700'}>
                    {aiResult.urgency === 'high' ? 'عاجل جداً' : 'متوسط'}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/30 p-2 rounded-lg">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <Tag className="w-3 h-3" /> التصنيف
                      </div>
                      <div className="text-sm font-semibold">{aiResult.category}</div>
                    </div>
                    <div className="bg-muted/30 p-2 rounded-lg">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <MapPin className="w-3 h-3" /> الموقع
                      </div>
                      <div className="text-sm font-semibold truncate">{aiResult.location}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                      <FileText className="w-4 h-4" />
                      مسودة الخطاب الرسمي
                    </div>
                    <div className="bg-slate-50 border rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap font-serif text-slate-800 relative group">
                      {aiResult.draftLetter}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={copyDraft}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t bg-muted/5 gap-2">
                  <Button className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700">
                    <Send className="w-4 h-4" />
                    إرسال للجهة المختصة
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <RefreshCcw className="w-4 h-4" />
                    إعادة الصياغة
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ) : (
            <Card className="h-full border-dashed border-2 flex items-center justify-center text-muted-foreground p-10 text-center">
              <div className="space-y-3">
                <AlertCircle className="w-12 h-12 mx-auto opacity-20" />
                <p>سجل ملاحظتك الصوتية لرؤية التحليل والخطابات المقترحة هنا</p>
              </div>
            </Card>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
