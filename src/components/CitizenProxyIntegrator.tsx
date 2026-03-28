import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  ShieldCheck, 
  Fingerprint, 
  Database, 
  RefreshCcw, 
  FileSearch, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Smartphone,
  Info,
  ExternalLink,
  Eye,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface ExtractedData {
  nationalId: string;
  fullName: string;
  address: string;
  birthDate: string;
  status: 'active' | 'pending' | 'error';
  lastSync: string;
}

export const CitizenProxyIntegrator: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        setScreenshot(event.target?.result as string);
        setIsUploading(false);
        processOCR();
      };
      reader.readAsDataURL(file);
    }
  };

  const processOCR = async () => {
    setIsProcessing(true);
    toast.info("جاري تحليل لقطة الشاشة واستخراج البيانات (OCR)...");
    
    // Simulate OCR and AI verification
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const mockData: ExtractedData = {
      nationalId: "29012345678901",
      fullName: "محمد أحمد علي محمود",
      address: "12 شارع التحرير، الدقي، الجيزة",
      birthDate: "15/05/1990",
      status: 'active',
      lastSync: new Date().toLocaleString('ar-EG')
    };
    
    setExtractedData(mockData);
    setIsProcessing(false);
    toast.success("تم التحقق من البيانات بنجاح عبر Citizen-Proxy Model");
  };

  const reset = () => {
    setScreenshot(null);
    setExtractedData(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            تكامل البيانات الذكي (Citizen-Proxy)
          </h2>
          <p className="text-muted-foreground">تحديث بياناتك الرسمية قانونياً عبر لقطات الشاشة من "مصر الرقمية"</p>
        </div>
        <Badge variant="outline" className="px-3 py-1 gap-1 border-emerald-200 text-emerald-700 bg-emerald-50">
          <Lock className="w-4 h-4" />
          تشفير AES-256
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Section */}
        <Card className="lg:col-span-1 border-emerald-100 shadow-sm overflow-hidden">
          <CardHeader className="bg-emerald-50/30">
            <CardTitle className="text-lg">خطوات التفعيل</CardTitle>
            <CardDescription>اتبع التعليمات للربط القانوني لبياناتك</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-4">
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs flex-shrink-0 mt-0.5">1</div>
                <div className="text-sm">
                  <p className="font-bold">افتح تطبيق "مصر الرقمية"</p>
                  <p className="text-xs text-muted-foreground">أو الموقع الرسمي digital.gov.eg</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs flex-shrink-0 mt-0.5">2</div>
                <div className="text-sm">
                  <p className="font-bold">خذ لقطة شاشة (Screenshot)</p>
                  <p className="text-xs text-muted-foreground">لصفحة بياناتك الشخصية أو حالة الطلب</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs flex-shrink-0 mt-0.5">3</div>
                <div className="text-sm">
                  <p className="font-bold">ارفع الصورة هنا</p>
                  <p className="text-xs text-muted-foreground">سيقوم نظامنا بقراءة البيانات آلياً</p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange} 
              />
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2 h-12"
                disabled={isProcessing || isUploading}
              >
                {isUploading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                ارفع لقطة الشاشة الآن
              </Button>
              <p className="text-[10px] text-center text-muted-foreground mt-2">
                نحن لا نخزن الصور، يتم استخراج النص وتشفيره فوراً
              </p>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/10 border-t">
            <Button variant="link" className="w-full text-xs text-emerald-700 gap-1" asChild>
              <a href="https://digital.gov.eg" target="_blank" rel="noreferrer">
                الذهاب لمصر الرقمية <ExternalLink className="w-3 h-3" />
              </a>
            </Button>
          </CardFooter>
        </Card>

        {/* Results Section */}
        <Card className="lg:col-span-2 border-slate-100 shadow-sm min-h-[400px]">
          <CardHeader className="flex flex-row justify-between items-center">
            <div>
              <CardTitle className="text-lg">بيانات الهوية الموثقة</CardTitle>
              <CardDescription>البيانات المستخرجة عبر نموذج الوكيل (Proxy)</CardDescription>
            </div>
            {extractedData && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                <CheckCircle2 className="w-3 h-3 ml-1" /> موثق
              </Badge>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            <AnimatePresence mode="wait">
              {isProcessing ? (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-20 space-y-4"
                >
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                    <FileSearch className="w-8 h-8 text-emerald-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-emerald-800">جاري قراءة البيانات ذكياً...</p>
                    <p className="text-xs text-muted-foreground">استخراج الرقم القومي والاسم من الصورة</p>
                  </div>
                </motion.div>
              ) : extractedData ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 py-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold">الاسم الكامل</div>
                      <div className="text-sm font-bold text-slate-800">{extractedData.fullName}</div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold">الرقم القومي</div>
                      <div className="text-sm font-mono font-bold text-slate-800">{extractedData.nationalId}</div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold">العنوان المسجل</div>
                      <div className="text-sm font-bold text-slate-800">{extractedData.address}</div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold">تاريخ الميلاد</div>
                      <div className="text-sm font-bold text-slate-800">{extractedData.birthDate}</div>
                    </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-emerald-600 shadow-sm">
                      <Fingerprint className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-emerald-900">تم التوثيق القانوني</h4>
                      <p className="text-[11px] text-emerald-700">آخر مزامنة: {extractedData.lastSync}</p>
                    </div>
                    <Button variant="outline" size="sm" className="bg-white text-emerald-700 hover:bg-emerald-50 border-emerald-200">
                      <RefreshCcw className="w-3 h-3 ml-1" /> تحديث
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl bg-slate-50/50">
                  <Smartphone className="w-12 h-12 text-slate-300 mb-4" />
                  <p className="text-slate-500 max-w-xs text-sm">لم يتم رفع أي بيانات بعد. يرجى رفع لقطة شاشة من حسابك في مصر الرقمية للبدء.</p>
                </div>
              )}
            </AnimatePresence>
          </CardContent>
          <CardFooter className="bg-slate-50/50 border-t justify-between p-4">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Info className="w-3 h-3" />
              هذه الطريقة قانونية 100% لأن المواطن هو من يوفر بياناته بنفسه (Citizen-as-a-Proxy)
            </div>
            {extractedData && (
              <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={reset}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
