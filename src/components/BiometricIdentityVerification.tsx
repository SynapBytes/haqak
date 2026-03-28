import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Fingerprint, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  Shield, 
  Lock, 
  Zap,
  Eye,
  RotateCcw,
  Info,
  Smartphone,
  Scan,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface VerificationStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  icon: React.ReactNode;
}

export const BiometricIdentityVerification: React.FC = () => {
  const [verificationSteps, setVerificationSteps] = useState<VerificationStep[]>([
    { id: '1', name: 'التحقق من الهوية الرقمية', description: 'مطابقة البيانات مع قاعدة بيانات وزارة الداخلية', status: 'pending', icon: <Shield className="w-5 h-5" /> },
    { id: '2', name: 'مسح الوجه (Face Recognition)', description: 'التقاط صورة وجهك للتحقق من الهوية', status: 'pending', icon: <Camera className="w-5 h-5" /> },
    { id: '3', name: 'بصمة الإصبع (Fingerprint)', description: 'قراءة بصمتك الحيوية للتحقق النهائي', status: 'pending', icon: <Fingerprint className="w-5 h-5" /> },
    { id: '4', name: 'التحقق من الموقع الجغرافي', description: 'التأكد من أنك داخل الدائرة الانتخابية', status: 'pending', icon: <Scan className="w-5 h-5" /> },
  ]);

  const [currentStep, setCurrentStep] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [trustScore, setTrustScore] = useState(0);
  const cameraRef = useRef<HTMLVideoElement>(null);

  const startVerification = async () => {
    setIsVerifying(true);
    
    // Simulate step-by-step verification
    for (let i = 0; i < verificationSteps.length; i++) {
      setCurrentStep(i);
      setVerificationSteps(prev => {
        const updated = [...prev];
        updated[i].status = 'in_progress';
        return updated;
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      setVerificationSteps(prev => {
        const updated = [...prev];
        updated[i].status = 'completed';
        return updated;
      });

      setTrustScore(Math.round(((i + 1) / verificationSteps.length) * 100));
    }

    setIsVerifying(false);
    setVerificationComplete(true);
    toast.success('تم التحقق من هويتك بنجاح! أنت الآن مسجل للتصويت الآمن.');
  };

  const resetVerification = () => {
    setVerificationSteps(verificationSteps.map(step => ({ ...step, status: 'pending' })));
    setCurrentStep(0);
    setIsVerifying(false);
    setVerificationComplete(false);
    setTrustScore(0);
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-emerald-600';
      case 'in_progress': return 'text-amber-600 animate-pulse';
      case 'failed': return 'text-rose-600';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Fingerprint className="w-6 h-6 text-emerald-600" />
            الهوية الرقمية البيومترية (Biometric Verification)
          </h2>
          <p className="text-muted-foreground">تحقق من هويتك بنسبة 100% لضمان نزاهة التصويت والمشاركة</p>
        </div>
        <Badge variant="outline" className="px-3 py-1 gap-1 border-emerald-200 text-emerald-700 bg-emerald-50">
          <Lock className="w-4 h-4" />
          تشفير عسكري
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-600 font-bold uppercase">معدل الأمان</p>
                <p className="text-2xl font-bold text-emerald-900 mt-1">{trustScore}%</p>
              </div>
              <div className="w-10 h-10 bg-emerald-200 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-bold uppercase">المستخدمون المتحققون</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">12,847</p>
              </div>
              <div className="w-10 h-10 bg-blue-200 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-600 font-bold uppercase">معدل النزاهة</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">99.8%</p>
              </div>
              <div className="w-10 h-10 bg-purple-200 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-emerald-100 shadow-sm overflow-hidden">
        <CardHeader className="bg-emerald-50/30">
          <CardTitle className="text-lg">خطوات التحقق البيومتري</CardTitle>
          <CardDescription>اتبع الخطوات التالية لتأكيد هويتك بنسبة 100%</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {verificationSteps.map((step, idx) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`border rounded-xl p-4 transition-all ${
                step.status === 'completed' ? 'bg-emerald-50 border-emerald-200' :
                step.status === 'in_progress' ? 'bg-amber-50 border-amber-200' :
                'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  step.status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
                  step.status === 'in_progress' ? 'bg-amber-100 text-amber-600 animate-pulse' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {step.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : step.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm mb-1">{step.name}</h4>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
                <Badge className={`${
                  step.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                  step.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {step.status === 'completed' ? 'تم' : step.status === 'in_progress' ? 'جاري' : 'قريباً'}
                </Badge>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-emerald-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">محاكاة التحقق</CardTitle>
          <CardDescription>اضغط الزر أدناه لبدء عملية التحقق البيومتري</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {verificationComplete ? (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-8 text-center space-y-4"
            >
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-emerald-900">تم التحقق بنجاح!</h3>
                <p className="text-sm text-emerald-700 mt-1">هويتك موثقة بنسبة 100% وأنت مسجل للتصويت الآمن</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center mt-4">
                <div className="bg-white p-2 rounded border border-emerald-200">
                  <p className="text-xs text-muted-foreground">مسح الوجه</p>
                  <p className="font-bold text-emerald-600">99.9%</p>
                </div>
                <div className="bg-white p-2 rounded border border-emerald-200">
                  <p className="text-xs text-muted-foreground">البصمة</p>
                  <p className="font-bold text-emerald-600">99.8%</p>
                </div>
                <div className="bg-white p-2 rounded border border-emerald-200">
                  <p className="text-xs text-muted-foreground">الموقع</p>
                  <p className="font-bold text-emerald-600">100%</p>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-50 border rounded-lg p-6 flex flex-col items-center justify-center gap-4 min-h-[200px]">
                <Camera className="w-12 h-12 text-slate-300" />
                <p className="text-center text-muted-foreground">
                  {isVerifying 
                    ? `جاري التحقق من الخطوة ${currentStep + 1}/${verificationSteps.length}...` 
                    : 'اضغط الزر أدناه لبدء عملية التحقق'}
                </p>
                {isVerifying && (
                  <div className="w-full max-w-xs">
                    <Progress value={trustScore} className="h-2 bg-emerald-100" />
                    <p className="text-xs text-center text-muted-foreground mt-2">{trustScore}% مكتمل</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="bg-slate-50/50 border-t gap-2">
          {verificationComplete ? (
            <>
              <Button className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                ابدأ التصويت الآمن
              </Button>
              <Button variant="outline" className="gap-2" onClick={resetVerification}>
                <RotateCcw className="w-4 h-4" />
                إعادة التحقق
              </Button>
            </>
          ) : (
            <Button 
              onClick={startVerification}
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 h-11"
              disabled={isVerifying}
            >
              {isVerifying ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> جاري التحقق...</>
              ) : (
                <><Fingerprint className="w-4 h-4" /> ابدأ التحقق البيومتري</>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>

      <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex gap-3 items-start">
        <Info className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-emerald-700 leading-relaxed">
          <strong>التحقق البيومتري الذكي:</strong> يجمع النظام بين 4 طبقات من التحقق (الهوية الرقمية + مسح الوجه + البصمة + الموقع الجغرافي) لضمان أن كل صوت هو من مواطن حقيقي واحد فقط. هذا يجعل التصويت والمشاركة <strong>آمنة 100%</strong> وخالية من التلاعب.
        </p>
      </div>
    </div>
  );
};
