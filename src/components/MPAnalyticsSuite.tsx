import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { TrendingUp, Users, Clock, CheckCircle2, Map as MapIcon, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AnalyticsProps {
  issues: any[];
  mpName: string;
}

const MPAnalyticsSuite: React.FC<AnalyticsProps> = ({ issues, mpName }) => {
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    issues.forEach((i) => {
      counts[i.category] = (counts[i.category] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [issues]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = { "received": 0, "in-progress": 0, "resolved": 0 };
    issues.forEach((i) => {
      if (counts[i.status] !== undefined) counts[i.status]++;
    });
    return [
      { name: "قيد الانتظار", value: counts["received"], color: "#f59e0b" },
      { name: "جاري العمل", value: counts["in-progress"], color: "#3b82f6" },
      { name: "تم الحل", value: counts["resolved"], color: "#10b981" },
    ];
  }, [issues]);

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  const handleExportPDF = () => {
    toast.info("جاري تجهيز تقرير الإنجاز الاحترافي...");
    // Logic for PDF generation would go here
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">لوحة التحليلات الذكية</h2>
        <Button onClick={handleExportPDF} className="gap-2 bg-accent hover:bg-accent/90">
          <FileDown className="w-4 h-4" />
          تصدير تقرير الإنجاز (PDF)
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-accent/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-info" />
              متوسط سرعة الاستجابة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.2 ساعة</div>
            <p className="text-xs text-success flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              أسرع بنسبة 15% من المتوسط
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-accent/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              معدل حل المشكلات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">88%</div>
            <div className="w-full bg-muted rounded-full h-1.5 mt-2">
              <div className="bg-success h-1.5 rounded-full" style={{ width: "88%" }}></div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-accent/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-accent" />
              رضا المواطنين
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.8/5</div>
            <p className="text-xs text-muted-foreground mt-1">بناءً على 120 تقييم</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-accent/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MapIcon className="w-4 h-4 text-primary" />
              تغطية الدائرة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">92%</div>
            <p className="text-xs text-muted-foreground mt-1">نشاط في 12 منطقة</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card/50 backdrop-blur-sm border-accent/20">
          <CardHeader>
            <CardTitle>توزيع الشكاوى حسب القطاع</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.1)" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} tick={{ fill: "currentColor", fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: "8px" }}
                  itemStyle={{ color: "#fff" }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-accent/20">
          <CardHeader>
            <CardTitle>حالة الإنجاز الكلية</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: "8px" }}
                   itemStyle={{ color: "#fff" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 ml-4">
              {statusData.map((s) => (
                <div key={s.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }}></div>
                  <span className="text-xs">{s.name}: {s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MPAnalyticsSuite;
