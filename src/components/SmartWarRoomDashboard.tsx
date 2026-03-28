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
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Zap, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  Users, 
  CheckCircle2, 
  MapPin, 
  Activity,
  Bell,
  Eye,
  Settings,
  Info,
  RefreshCcw,
  Download,
  Share2,
  Maximize2
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface RealTimeMetric {
  name: string;
  value: number;
  trend: number;
  status: 'critical' | 'warning' | 'normal';
}

export const SmartWarRoomDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<RealTimeMetric[]>([
    { name: 'الشكاوى النشطة', value: 47, trend: 12, status: 'warning' },
    { name: 'الأزمات المتوقعة', value: 8, trend: 3, status: 'critical' },
    { name: 'المشاريع قيد التنفيذ', value: 23, trend: 5, status: 'normal' },
    { name: 'معدل الرضا', value: 78, trend: 8, status: 'normal' },
  ]);

  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        setMetrics(prev => prev.map(m => ({
          ...m,
          value: m.value + Math.floor(Math.random() * 5 - 2),
          trend: Math.floor(Math.random() * 10 - 5)
        })));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const crisisData = [
    { time: '12:00', predicted: 2, actual: 1 },
    { time: '13:00', predicted: 3, actual: 2 },
    { time: '14:00', predicted: 5, actual: 4 },
    { time: '15:00', predicted: 8, actual: 7 },
    { time: '16:00', predicted: 6, actual: 5 },
    { time: '17:00', predicted: 4, actual: 3 },
  ];

  const complaintsByCategory = [
    { name: 'الطرق', value: 18, fill: '#f97316' },
    { name: 'المياه', value: 12, fill: '#3b82f6' },
    { name: 'الكهرباء', value: 10, fill: '#fbbf24' },
    { name: 'الصرف', value: 7, fill: '#ef4444' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-amber-600 bg-amber-50';
      case 'normal': return 'text-emerald-600 bg-emerald-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-purple-600 animate-pulse" />
            غرفة العمليات الذكية (Smart War Room)
          </h2>
          <p className="text-muted-foreground">لوحة تحكم لحظية للنائب لمراقبة الدائرة والتنبؤ بالأزمات</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={autoRefresh ? "default" : "outline"} 
            size="sm" 
            className="gap-2"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCcw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'تحديث مباشر' : 'تحديث يدوي'}
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Maximize2 className="w-4 h-4" />
            ملء الشاشة
          </Button>
        </div>
      </div>

      {/* Real-time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {metrics.map((metric, idx) => (
          <motion.div
            key={metric.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className={`border-2 ${metric.status === 'critical' ? 'border-red-200 bg-red-50/30' : metric.status === 'warning' ? 'border-amber-200 bg-amber-50/30' : 'border-emerald-200 bg-emerald-50/30'}`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-xs text-muted-foreground font-bold uppercase">{metric.name}</p>
                    <p className={`text-3xl font-bold mt-1 ${getStatusColor(metric.status)}`}>{metric.value}</p>
                  </div>
                  <div className={`text-sm font-bold ${metric.trend > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {metric.trend > 0 ? '↑' : '↓'} {Math.abs(metric.trend)}
                  </div>
                </div>
                <Badge className={getStatusColor(metric.status)}>
                  {metric.status === 'critical' ? '🔴 حرج' : metric.status === 'warning' ? '🟠 تحذير' : '🟢 طبيعي'}
                </Badge>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="predictions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="predictions">التنبؤات</TabsTrigger>
          <TabsTrigger value="analytics">التحليلات</TabsTrigger>
          <TabsTrigger value="alerts">التنبيهات</TabsTrigger>
        </TabsList>

        <TabsContent value="predictions" className="space-y-4 mt-4">
          <Card className="border-purple-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                التنبؤ بالأزمات (الـ 6 ساعات القادمة)
              </CardTitle>
              <CardDescription>مقارنة بين الأزمات المتنبأ بها والفعلية</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={crisisData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="predicted" name="المتنبأ بها" stroke="#a78bfa" strokeWidth={2} dot={{ fill: '#a78bfa' }} />
                    <Line type="monotone" dataKey="actual" name="الفعلية" stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">الشكاوى حسب الفئة</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-6">
              <div className="h-[250px] w-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={complaintsByCategory}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {complaintsByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3 flex flex-col justify-center">
                {complaintsByCategory.map((cat) => (
                  <div key={cat.name} className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: cat.fill }}></div>
                    <span className="text-sm font-bold">{cat.name}</span>
                    <span className="text-sm text-muted-foreground ml-auto">{cat.value} شكوى</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4 mt-4">
          <Card className="border-blue-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                مؤشرات الأداء الرئيسية (KPIs)
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs text-muted-foreground mb-1">متوسط وقت الحل</p>
                <p className="text-2xl font-bold text-blue-600">3.2 أيام</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                <p className="text-xs text-muted-foreground mb-1">نسبة الحل</p>
                <p className="text-2xl font-bold text-emerald-600">89%</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-xs text-muted-foreground mb-1">الشكاوى المعلقة</p>
                <p className="text-2xl font-bold text-amber-600">11</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                <p className="text-xs text-muted-foreground mb-1">معدل الرضا</p>
                <p className="text-2xl font-bold text-purple-600">78%</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4 mt-4">
          <Card className="border-red-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="w-5 h-5 text-red-600" />
                التنبيهات الحرجة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { type: 'حرجة', title: 'انقطاع مياه متوقع في الحي الثالث', time: 'الآن' },
                { type: 'تحذير', title: 'ازدحام مروري في شارع النيل', time: 'قبل 5 دقائق' },
                { type: 'معلومة', title: 'تم حل 3 شكاوى جديدة', time: 'قبل 15 دقيقة' },
              ].map((alert, idx) => (
                <div key={idx} className={`p-3 rounded-lg border-l-4 ${
                  alert.type === 'حرجة' ? 'bg-red-50 border-l-red-600' :
                  alert.type === 'تحذير' ? 'bg-amber-50 border-l-amber-600' :
                  'bg-blue-50 border-l-blue-600'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold">{alert.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                    </div>
                    <Badge className={
                      alert.type === 'حرجة' ? 'bg-red-100 text-red-700' :
                      alert.type === 'تحذير' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }>
                      {alert.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 flex gap-3 items-start">
        <Info className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-purple-700 leading-relaxed">
          <strong>غرفة العمليات الذكية:</strong> لوحة تحكم مركزية للنائب تجمع كل المعلومات الحية عن الدائرة (الشكاوى، الأزمات المتوقعة، المشاريع، معدل الرضا). النائب يرى كل شيء في "شاشة واحدة" ويستطيع اتخاذ قرارات فورية بناءً على بيانات حقيقية.
        </p>
      </div>
    </div>
  );
};
