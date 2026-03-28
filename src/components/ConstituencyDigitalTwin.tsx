import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Map as MapIcon, 
  Users, 
  Layers, 
  Activity, 
  Building2, 
  Zap, 
  Droplets, 
  GraduationCap, 
  Stethoscope, 
  Info,
  Maximize2,
  Database
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  AreaChart,
  Area
} from 'recharts';

interface PopulationEstimate {
  district: string;
  official: number;
  estimated: number;
  growth: number;
}

interface ServiceMetric {
  subject: string;
  actual: number;
  required: number;
  fullMark: number;
}

export const ConstituencyDigitalTwin: React.FC = () => {
  const [activeLayer, setActiveLayer] = useState<'population' | 'services' | 'infrastructure'>('population');
  const [loading, setLoading] = useState(true);

  // Mock data for population estimation based on open data and app registration density
  const populationData: PopulationEstimate[] = [
    { district: 'الحي الأول', official: 45000, estimated: 52000, growth: 15.5 },
    { district: 'الحي الثاني', official: 38000, estimated: 41000, growth: 7.9 },
    { district: 'الحي الثالث', official: 62000, estimated: 78000, growth: 25.8 },
    { district: 'الحي الرابع', official: 29000, estimated: 31500, growth: 8.6 },
    { district: 'الحي الخامس', official: 51000, estimated: 59000, growth: 15.7 },
  ];

  // Service gap analysis metrics (Digital Twin vs Standards)
  const serviceMetrics: ServiceMetric[] = [
    { subject: 'التعليم', actual: 65, required: 90, fullMark: 100 },
    { subject: 'الصحة', actual: 45, required: 85, fullMark: 100 },
    { subject: 'الكهرباء', actual: 88, required: 95, fullMark: 100 },
    { subject: 'المياه', actual: 72, required: 92, fullMark: 100 },
    { subject: 'الصرف الصحي', actual: 58, required: 88, fullMark: 100 },
    { subject: 'المساحات الخضراء', actual: 30, required: 70, fullMark: 100 },
  ];

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-600" />
            التوأم الرقمي للدائرة (GIS Digital Twin)
          </h2>
          <p className="text-muted-foreground">نمذجة إحصائية وتقديرية للدائرة بناءً على البيانات المفتوحة</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Database className="w-4 h-4" />
            تحديث البيانات
          </Button>
          <Button variant="default" size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Maximize2 className="w-4 h-4" />
            خريطة تفاعلية
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Visualization Card */}
        <Card className="lg:col-span-2 overflow-hidden border-indigo-100 shadow-sm">
          <CardHeader className="bg-indigo-50/50 pb-3">
            <Tabs defaultValue="population" onValueChange={(v) => setActiveLayer(v as any)}>
              <div className="flex justify-between items-center">
                <TabsList>
                  <TabsTrigger value="population">السكان</TabsTrigger>
                  <TabsTrigger value="services">الخدمات</TabsTrigger>
                  <TabsTrigger value="infrastructure">البنية التحتية</TabsTrigger>
                </TabsList>
                <Badge variant="outline" className="bg-white/80 border-indigo-200 text-indigo-700">
                  <Activity className="w-3 h-3 ml-1 animate-pulse" />
                  مباشر (تقديري)
                </Badge>
              </div>
            </Tabs>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[400px] w-full">
              {activeLayer === 'population' && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={populationData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="district" type="category" width={80} tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      formatter={(value, name) => [value, name === 'official' ? 'رسمي' : 'تقديري']}
                    />
                    <Legend verticalAlign="top" align="right" iconType="circle" />
                    <Bar dataKey="official" name="الإحصاء الرسمي" fill="#cbd5e1" radius={[0, 4, 4, 0]} barSize={15} />
                    <Bar dataKey="estimated" name="التقدير الفعلي (AI)" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={25} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              {activeLayer === 'services' && (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={serviceMetrics}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} hide />
                    <Radar
                      name="الوضع الحالي"
                      dataKey="actual"
                      stroke="#6366f1"
                      fill="#6366f1"
                      fillOpacity={0.5}
                    />
                    <Radar
                      name="المعايير القياسية"
                      dataKey="required"
                      stroke="#ef4444"
                      fill="#ef4444"
                      fillOpacity={0.1}
                      strokeDasharray="4 4"
                    />
                    <Tooltip />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              )}
              {activeLayer === 'infrastructure' && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={populationData}>
                    <defs>
                      <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="district" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="growth" name="معدل ضغط البنية التحتية %" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorGrowth)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Side Info Cards */}
        <div className="space-y-4">
          <Card className="border-indigo-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                الفجوة السكانية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-700">+42,500</div>
              <p className="text-xs text-muted-foreground mt-1">نسمة زيادة تقديرية عن البيانات الرسمية (توسعات عمرانية غير مسجلة)</p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span>دقة التقدير</span>
                  <span className="font-medium">92%</span>
                </div>
                <Progress value={92} className="h-1 bg-indigo-100" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-indigo-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-rose-600" />
                تحليل الفجوة الخدمية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-rose-500" />
                  <span className="text-sm">الصحة</span>
                </div>
                <Badge variant="destructive" className="text-[10px] h-5">-40%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-amber-500" />
                  <span className="text-sm">التعليم</span>
                </div>
                <Badge variant="warning" className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] h-5">-25%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">الكهرباء</span>
                </div>
                <Badge variant="success" className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] h-5">-7%</Badge>
              </div>
              <Button variant="ghost" className="w-full text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 p-0 h-8 mt-2">
                عرض التقرير التفصيلي
              </Button>
            </CardContent>
          </Card>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 items-start">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              تعتمد هذه البيانات على تقنية <strong>Statistical Extrapolation</strong> التي تدمج البيانات المفتوحة (Open Data) مع كثافة المسجلين في تطبيق Sutak لتقدير الاحتياجات الفعلية.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
