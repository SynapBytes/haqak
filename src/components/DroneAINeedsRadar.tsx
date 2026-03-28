import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Radar, 
  Drone, 
  AlertTriangle, 
  MapPin, 
  Eye, 
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
  Info,
  Satellite,
  Activity,
  TrendingUp,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface DetectedIssue {
  id: string;
  type: string;
  location: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  detectionTime: string;
  confidence: number;
  image: string;
  status: 'auto_detected' | 'verified' | 'assigned' | 'resolved';
}

export const DroneAINeedsRadar: React.FC = () => {
  const [detectedIssues, setDetectedIssues] = useState<DetectedIssue[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  useEffect(() => {
    // Mock initial detected issues
    const mockIssues: DetectedIssue[] = [
      {
        id: 'drone-1',
        type: 'حفرة في الطريق',
        location: 'شارع النيل - الكيلو 5',
        severity: 'high',
        detectionTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        confidence: 97,
        image: '🕳️',
        status: 'auto_detected'
      },
      {
        id: 'drone-2',
        type: 'تراكم قمامة',
        location: 'ساحة الحي الثالث',
        severity: 'medium',
        detectionTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        confidence: 89,
        image: '🗑️',
        status: 'verified'
      },
      {
        id: 'drone-3',
        type: 'أعمدة إنارة معطلة',
        location: 'شارع الجمهورية - الحي الأول',
        severity: 'medium',
        detectionTime: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        confidence: 92,
        image: '💡',
        status: 'assigned'
      },
      {
        id: 'drone-4',
        type: 'تسريب مياه',
        location: 'شارع 26 يوليو',
        severity: 'critical',
        detectionTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        confidence: 95,
        image: '💧',
        status: 'auto_detected'
      }
    ];
    setDetectedIssues(mockIssues);
  }, []);

  const startDroneScan = async () => {
    setIsScanning(true);
    setScanProgress(0);
    toast.info("جاري إطلاق الدرونز لمسح الدائرة...");

    for (let i = 0; i <= 100; i += 10) {
      setScanProgress(i);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsScanning(false);
    toast.success("تم مسح الدائرة بنجاح! تم اكتشاف 4 مشاكل جديدة");
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'auto_detected': return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'verified': return <Eye className="w-5 h-5 text-blue-600" />;
      case 'assigned': return <Activity className="w-5 h-5 text-purple-600" />;
      case 'resolved': return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      default: return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'auto_detected': return 'مكتشفة تلقائياً';
      case 'verified': return 'موثقة';
      case 'assigned': return 'مسندة';
      case 'resolved': return 'محلولة';
      default: return status;
    }
  };

  const criticalCount = detectedIssues.filter(i => i.severity === 'critical').length;
  const highCount = detectedIssues.filter(i => i.severity === 'high').length;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Drone className="w-6 h-6 text-cyan-600" />
            رادار الاحتياجات بالدرونز والذكاء الاصطناعي
          </h2>
          <p className="text-muted-foreground">رصد تلقائي للمشاكل الميدانية قبل تقديم الشكاوى</p>
        </div>
        <Badge variant="outline" className="px-3 py-1 gap-1 border-cyan-200 text-cyan-700 bg-cyan-50">
          <Satellite className="w-4 h-4" />
          مراقبة لحظية
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-600 font-bold uppercase">حرجة</p>
                <p className="text-2xl font-bold text-red-900 mt-1">{criticalCount}</p>
              </div>
              <div className="w-10 h-10 bg-red-200 rounded-lg flex items-center justify-center text-lg">
                🚨
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-600 font-bold uppercase">عالية</p>
                <p className="text-2xl font-bold text-orange-900 mt-1">{highCount}</p>
              </div>
              <div className="w-10 h-10 bg-orange-200 rounded-lg flex items-center justify-center text-lg">
                ⚠️
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-cyan-600 font-bold uppercase">المشاكل المكتشفة</p>
                <p className="text-2xl font-bold text-cyan-900 mt-1">{detectedIssues.length}</p>
              </div>
              <div className="w-10 h-10 bg-cyan-200 rounded-lg flex items-center justify-center text-lg">
                📡
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-600 font-bold uppercase">متوسط الثقة</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">93%</p>
              </div>
              <div className="w-10 h-10 bg-purple-200 rounded-lg flex items-center justify-center text-lg">
                ✓
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-cyan-100 shadow-sm overflow-hidden">
        <CardHeader className="bg-cyan-50/30">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">مسح الدائرة بالدرونز</CardTitle>
              <CardDescription>اضغط لإطلاق الدرونز لمسح الدائرة الكاملة والكشف عن المشاكل الجديدة</CardDescription>
            </div>
            <Button 
              onClick={startDroneScan}
              className="gap-2 bg-cyan-600 hover:bg-cyan-700"
              disabled={isScanning}
            >
              {isScanning ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> جاري المسح...</>
              ) : (
                <><Drone className="w-4 h-4" /> ابدأ المسح</>
              )}
            </Button>
          </div>
        </CardHeader>
        {isScanning && (
          <CardContent className="pt-6 pb-0 border-b">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4 pb-6"
            >
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-bold">تقدم المسح</span>
                  <span className="text-cyan-600 font-bold">{scanProgress}%</span>
                </div>
                <div className="w-full bg-cyan-100 rounded-full h-3 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${scanProgress}%` }}
                    className="bg-cyan-600 h-full"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {scanProgress < 30 && "جاري إطلاق الدرونز..."}
                {scanProgress >= 30 && scanProgress < 60 && "جاري مسح المناطق السكنية..."}
                {scanProgress >= 60 && scanProgress < 90 && "جاري تحليل الصور بالذكاء الاصطناعي..."}
                {scanProgress >= 90 && "جاري إنهاء المسح..."}
              </p>
            </motion.div>
          </CardContent>
        )}
      </Card>

      <Card className="border-cyan-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Radar className="w-5 h-5 text-cyan-600" />
            المشاكل المكتشفة تلقائياً
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {detectedIssues.map((issue, idx) => (
            <motion.div
              key={issue.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="border rounded-xl p-4 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4 mb-3">
                <div className="text-3xl">{issue.image}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-sm">{issue.type}</h4>
                    <Badge className={`text-[10px] ${getSeverityColor(issue.severity)}`}>
                      {issue.severity === 'critical' ? 'حرجة' : issue.severity === 'high' ? 'عالية' : 'متوسطة'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <MapPin className="w-3 h-3" />
                    {issue.location}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {new Date(issue.detectionTime).toLocaleString('ar-EG')}
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1">
                    {getStatusIcon(issue.status)}
                    <span className="text-xs font-bold">{getStatusLabel(issue.status)}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {issue.confidence}% ثقة
                  </Badge>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" className="text-xs flex-1">
                  <Eye className="w-3 h-3 ml-1" />
                  عرض الصورة
                </Button>
                <Button variant="outline" size="sm" className="text-xs flex-1">
                  <CheckCircle2 className="w-3 h-3 ml-1" />
                  تأكيد
                </Button>
                <Button variant="outline" size="sm" className="text-xs flex-1">
                  <AlertTriangle className="w-3 h-3 ml-1" />
                  إسناد
                </Button>
              </div>
            </motion.div>
          ))}
        </CardContent>
        <CardFooter className="bg-slate-50/50 border-t">
          <Button variant="outline" className="w-full gap-2">
            <Download className="w-4 h-4" />
            تصدير تقرير الرصد
          </Button>
        </CardFooter>
      </Card>

      <div className="bg-cyan-50 border border-cyan-100 rounded-lg p-4 flex gap-3 items-start">
        <Info className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-cyan-700 leading-relaxed">
          <strong>رادار الاحتياجات الذكي:</strong> يستخدم النظام صور الأقمار الصناعية والدرونز المزودة بـ AI لرصد المشاكل تلقائياً (حفر، قمامة، إنارة معطلة، تسريبات). بدلاً من انتظار شكوى من المواطن، النظام يكتشف المشكلة أولاً ويفتح "تذكرة" (Ticket) للمسؤولين فوراً.
        </p>
      </div>
    </div>
  );
};
