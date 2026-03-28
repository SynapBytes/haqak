import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  TrendingDown, 
  Building2, 
  GraduationCap, 
  Stethoscope, 
  FileText, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  Info,
  Maximize2,
  Share2,
  FileBarChart
} from 'lucide-react';
import { toast } from 'sonner';

interface GapMetric {
  name: string;
  actual: number;
  standard: number;
  unit: string;
  gap: number;
  status: 'critical' | 'warning' | 'optimal';
}

export const ServiceGapAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'health' | 'education' | 'infrastructure'>('health');

  const healthMetrics: GapMetric[] = [
    { name: 'أسرة المستشفيات', actual: 1.2, standard: 3.5, unit: 'سرير/1000 مواطن', gap: -65, status: 'critical' },
    { name: 'أطباء الرعاية الأولية', actual: 0.8, standard: 1.5, unit: 'طبيب/1000 مواطن', gap: -46, status: 'warning' },
    { name: 'سيارات الإسعاف', actual: 2, standard: 5, unit: 'سيارة/50000 مواطن', gap: -60, status: 'critical' },
    { name: 'مراكز التطعيم', actual: 4, standard: 4, unit: 'مركز/حي', gap: 0, status: 'optimal' },
  ];

  const educationMetrics: GapMetric[] = [
    { name: 'كثافة الفصول', actual: 55, standard: 35, unit: 'طالب/فصل', gap: 57, status: 'critical' },
    { name: 'مساحة الملاعب', actual: 2.5, standard: 5, unit: 'م²/طالب', gap: -50, status: 'warning' },
    { name: 'معامل الحاسب', actual: 1, standard: 2, unit: 'معمل/مدرسة', gap: -50, status: 'warning' },
    { name: 'المكتبات المدرسية', actual: 0.9, standard: 1, unit: 'مكتبة/مدرسة', gap: -10, status: 'optimal' },
  ];

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'warning': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'optimal': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const currentMetrics = activeCategory === 'health' ? healthMetrics : educationMetrics;

  const exportReport = () => {
    toast.success("جاري تجهيز التقرير العلمي للفجوة الخدمية بصيغة PDF...");
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-indigo-600" />
            تحليل الفجوة الخدمية (Gap Analysis)
          </h2>
          <p className="text-muted-foreground">تقارير علمية تقارن المتاح بالمعايير القياسية العالمية والمحلية</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={exportReport}>
            <Download className="w-4 h-4" />
            تصدير التقرير
          </Button>
          <Button variant="default" size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Share2 className="w-4 h-4" />
            مشاركة في البرلمان
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Filters */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-slate-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">قطاعات التحليل</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="space-y-1">
                <Button 
                  variant={activeCategory === 'health' ? 'default' : 'ghost'} 
                  className={`w-full justify-start gap-3 h-11 ${activeCategory === 'health' ? 'bg-indigo-600' : ''}`}
                  onClick={() => setActiveCategory('health')}
                >
                  <Stethoscope className="w-4 h-4" />
                  الصحة العامة
                </Button>
                <Button 
                  variant={activeCategory === 'education' ? 'default' : 'ghost'} 
                  className={`w-full justify-start gap-3 h-11 ${activeCategory === 'education' ? 'bg-indigo-600' : ''}`}
                  onClick={() => setActiveCategory('education')}
                >
                  <GraduationCap className="w-4 h-4" />
                  التعليم والبحث
                </Button>
                <Button 
                  variant={activeCategory === 'infrastructure' ? 'default' : 'ghost'} 
                  className={`w-full justify-start gap-3 h-11 ${activeCategory === 'infrastructure' ? 'bg-indigo-600' : ''}`}
                  disabled
                >
                  <Building2 className="w-4 h-4" />
                  البنية التحتية
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-indigo-50 border-indigo-100">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                <Info className="w-4 h-4" />
                قوة الحجة البرلمانية
              </div>
              <p className="text-[11px] text-indigo-600 leading-relaxed">
                استخدم هذه البيانات في "طلبات الإحاطة" البرلمانية. الأرقام المستندة لمعايير قياسية تعزز موقفك الرقابي.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Analysis Area */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-slate-100 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>مقارنة المؤشرات بالمعايير القياسية</span>
                <Badge variant="outline" className="text-[10px] border-slate-200">دائرة: الحي السابع</Badge>
              </CardTitle>
              <CardDescription>تحليل رقمي دقيق للفجوة بين الواقع والمستهدف</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={currentMetrics} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      cursor={{ fill: '#f8fafc' }}
                    />
                    <Legend verticalAlign="top" align="right" iconType="circle" />
                    <Bar dataKey="actual" name="الوضع الحالي" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30} />
                    <Bar dataKey="standard" name="المعيار القياسي" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-8 space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-rose-500" />
                  تفاصيل الفجوة الخدمية
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentMetrics.map((metric) => (
                    <div key={metric.name} className="p-3 border rounded-xl bg-slate-50/50 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-slate-700">{metric.name}</div>
                        <div className="text-[10px] text-muted-foreground">{metric.unit}</div>
                      </div>
                      <div className="text-left">
                        <Badge className={`${getStatusColor(metric.status)} text-[10px] px-2`}>
                          {metric.gap > 0 ? `+${metric.gap}%` : `${metric.gap}%`}
                        </Badge>
                        <div className="text-xs font-bold mt-1">{metric.actual} / {metric.standard}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 border-t flex justify-between p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertCircle className="w-3 h-3 text-rose-500" />
                تحذير: فجوة حرجة في قطاع "أسرة المستشفيات"
              </div>
              <Button variant="ghost" size="sm" className="text-indigo-600 text-xs gap-1">
                عرض التوصيات العلمية <Maximize2 className="w-3 h-3" />
              </Button>
            </CardFooter>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-rose-100 bg-rose-50/20">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center text-rose-600">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] text-rose-600 font-bold uppercase">أعلى فجوة</div>
                  <div className="text-sm font-bold">المستشفيات (-65%)</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-emerald-100 bg-emerald-50/20">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] text-emerald-600 font-bold uppercase">أفضل أداء</div>
                  <div className="text-sm font-bold">التطعيمات (100%)</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-indigo-100 bg-indigo-50/20">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] text-indigo-600 font-bold uppercase">توصيات مقترحة</div>
                  <div className="text-sm font-bold">5 مذكرات جاهزة</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
