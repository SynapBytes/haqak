import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, AreaChart, Area
} from "recharts";
import {
  TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Clock,
  Zap, Users, MessageSquare, MapPin, Filter, Download, Share2,
  BarChart3, PieChart as PieChartIcon, Activity, Flame
} from "lucide-react";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface IssueData {
  id: string;
  title: string;
  category: string;
  district: string;
  sentiment: "positive" | "negative" | "neutral";
  urgency: "low" | "medium" | "high" | "critical";
  status: "new" | "in-progress" | "resolved" | "rejected";
  createdAt: Date;
  resolvedAt?: Date;
  views: number;
  sentiment_score: number; // -1 to 1
}

interface AnalyticsMetrics {
  totalIssues: number;
  resolvedIssues: number;
  avgResolutionTime: number;
  satisfactionRate: number;
  criticalIssues: number;
  sentimentScore: number;
}

// Mock data generator
const generateMockIssues = (): IssueData[] => {
  const categories = ["صحة", "تعليم", "طرق", "كهرباء", "مياه", "أمن"];
  const districts = ["وسط القاهرة", "الجيزة", "الإسكندرية", "المنصورة", "طنطا", "الزقازيق"];
  const sentiments = ["positive", "negative", "neutral"] as const;
  const urgencies = ["low", "medium", "high", "critical"] as const;
  const statuses = ["new", "in-progress", "resolved", "rejected"] as const;

  return Array.from({ length: 50 }, (_, i) => ({
    id: `issue-${i}`,
    title: `مشكلة ${i + 1}`,
    category: categories[Math.floor(Math.random() * categories.length)],
    district: districts[Math.floor(Math.random() * districts.length)],
    sentiment: sentiments[Math.floor(Math.random() * sentiments.length)],
    urgency: urgencies[Math.floor(Math.random() * urgencies.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    resolvedAt: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000) : undefined,
    views: Math.floor(Math.random() * 500),
    sentiment_score: Math.random() * 2 - 1,
  }));
};

const AdvancedAnalyticsDashboard = () => {
  const [issues] = useState<IssueData[]>(generateMockIssues());
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  // Calculate metrics
  const metrics = useMemo((): AnalyticsMetrics => {
    const filtered = issues.filter(issue => {
      if (selectedCategory !== "all" && issue.category !== selectedCategory) return false;
      if (selectedDistrict !== "all" && issue.district !== selectedDistrict) return false;
      return true;
    });

    const resolved = filtered.filter(i => i.status === "resolved");
    const avgResolutionTime = resolved.length > 0
      ? resolved.reduce((acc, i) => acc + (i.resolvedAt ? (i.resolvedAt.getTime() - i.createdAt.getTime()) / (24 * 60 * 60 * 1000) : 0), 0) / resolved.length
      : 0;

    const sentimentScore = filtered.length > 0
      ? filtered.reduce((acc, i) => acc + i.sentiment_score, 0) / filtered.length
      : 0;

    return {
      totalIssues: filtered.length,
      resolvedIssues: resolved.length,
      avgResolutionTime: Math.round(avgResolutionTime),
      satisfactionRate: Math.round((resolved.length / filtered.length) * 100) || 0,
      criticalIssues: filtered.filter(i => i.urgency === "critical").length,
      sentimentScore: Math.round(sentimentScore * 100),
    };
  }, [issues, selectedCategory, selectedDistrict]);

  // Category distribution data
  const categoryData = useMemo(() => {
    const filtered = issues.filter(issue => {
      if (selectedDistrict !== "all" && issue.district !== selectedDistrict) return false;
      return true;
    });

    const categories = new Map<string, number>();
    filtered.forEach(issue => {
      categories.set(issue.category, (categories.get(issue.category) || 0) + 1);
    });

    return Array.from(categories.entries()).map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / filtered.length) * 100),
    }));
  }, [issues, selectedDistrict]);

  // Sentiment analysis data
  const sentimentData = useMemo(() => {
    const filtered = issues.filter(issue => {
      if (selectedCategory !== "all" && issue.category !== selectedCategory) return false;
      if (selectedDistrict !== "all" && issue.district !== selectedDistrict) return false;
      return true;
    });

    const sentiments = {
      positive: filtered.filter(i => i.sentiment === "positive").length,
      neutral: filtered.filter(i => i.sentiment === "neutral").length,
      negative: filtered.filter(i => i.sentiment === "negative").length,
    };

    return [
      { name: "إيجابي", value: sentiments.positive, color: "#10b981" },
      { name: "محايد", value: sentiments.neutral, color: "#6b7280" },
      { name: "سلبي", value: sentiments.negative, color: "#ef4444" },
    ];
  }, [issues, selectedCategory, selectedDistrict]);

  // Status distribution
  const statusData = useMemo(() => {
    const filtered = issues.filter(issue => {
      if (selectedCategory !== "all" && issue.category !== selectedCategory) return false;
      if (selectedDistrict !== "all" && issue.district !== selectedDistrict) return false;
      return true;
    });

    const statuses = {
      new: filtered.filter(i => i.status === "new").length,
      "in-progress": filtered.filter(i => i.status === "in-progress").length,
      resolved: filtered.filter(i => i.status === "resolved").length,
      rejected: filtered.filter(i => i.status === "rejected").length,
    };

    return [
      { name: "جديد", value: statuses.new, color: "#3b82f6" },
      { name: "قيد المعالجة", value: statuses["in-progress"], color: "#f59e0b" },
      { name: "تم الحل", value: statuses.resolved, color: "#10b981" },
      { name: "مرفوض", value: statuses.rejected, color: "#ef4444" },
    ];
  }, [issues, selectedCategory, selectedDistrict]);

  // Urgency heatmap data
  const urgencyData = useMemo(() => {
    const filtered = issues.filter(issue => {
      if (selectedCategory !== "all" && issue.category !== selectedCategory) return false;
      if (selectedDistrict !== "all" && issue.district !== selectedDistrict) return false;
      return true;
    });

    return [
      { name: "منخفضة", value: filtered.filter(i => i.urgency === "low").length, color: "#10b981" },
      { name: "متوسطة", value: filtered.filter(i => i.urgency === "medium").length, color: "#f59e0b" },
      { name: "عالية", value: filtered.filter(i => i.urgency === "high").length, color: "#ef4444" },
      { name: "حرجة", value: filtered.filter(i => i.urgency === "critical").length, color: "#7c2d12" },
    ];
  }, [issues, selectedCategory, selectedDistrict]);

  // District heatmap
  const districtHeatmap = useMemo(() => {
    const filtered = issues.filter(issue => {
      if (selectedCategory !== "all" && issue.category !== selectedCategory) return false;
      return true;
    });

    const districts = new Map<string, { total: number; critical: number; resolved: number }>();
    filtered.forEach(issue => {
      const current = districts.get(issue.district) || { total: 0, critical: 0, resolved: 0 };
      current.total++;
      if (issue.urgency === "critical") current.critical++;
      if (issue.status === "resolved") current.resolved++;
      districts.set(issue.district, current);
    });

    return Array.from(districts.entries()).map(([name, data]) => ({
      name,
      total: data.total,
      critical: data.critical,
      resolved: data.resolved,
      intensity: (data.critical / data.total) * 100,
    }));
  }, [issues, selectedCategory]);

  // Time series data
  const timeSeriesData = useMemo(() => {
    const filtered = issues.filter(issue => {
      if (selectedCategory !== "all" && issue.category !== selectedCategory) return false;
      if (selectedDistrict !== "all" && issue.district !== selectedDistrict) return false;
      return true;
    });

    const days = 30;
    const data = [];
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayIssues = filtered.filter(issue => {
        const issueDate = new Date(issue.createdAt);
        return issueDate.toDateString() === date.toDateString();
      });

      data.push({
        date: date.toLocaleDateString("ar-EG", { month: "short", day: "numeric" }),
        issues: dayIssues.length,
        resolved: dayIssues.filter(i => i.status === "resolved").length,
        critical: dayIssues.filter(i => i.urgency === "critical").length,
      });
    }
    return data;
  }, [issues, selectedCategory, selectedDistrict]);

  const COLORS = ["#10b981", "#6b7280", "#ef4444"];

  return (
    <div className="w-full space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">لوحة التحكم المتقدمة للمؤشرات</h2>
          <p className="text-sm text-muted-foreground mt-1">
            تحليل شامل للمشاكل والطلبات مع رؤى ذكية وتنبيهات فورية
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="اختر الفئة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الفئات</SelectItem>
              <SelectItem value="صحة">صحة</SelectItem>
              <SelectItem value="تعليم">تعليم</SelectItem>
              <SelectItem value="طرق">طرق</SelectItem>
              <SelectItem value="كهرباء">كهرباء</SelectItem>
              <SelectItem value="مياه">مياه</SelectItem>
              <SelectItem value="أمن">أمن</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="اختر المنطقة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المناطق</SelectItem>
              <SelectItem value="وسط القاهرة">وسط القاهرة</SelectItem>
              <SelectItem value="الجيزة">الجيزة</SelectItem>
              <SelectItem value="الإسكندرية">الإسكندرية</SelectItem>
              <SelectItem value="المنصورة">المنصورة</SelectItem>
              <SelectItem value="طنطا">طنطا</SelectItem>
              <SelectItem value="الزقازيق">الزقازيق</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">تحميل</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">مشاركة</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-accent/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-semibold">إجمالي الطلبات</p>
                <p className="text-2xl font-bold text-foreground mt-1">{metrics.totalIssues}</p>
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-success/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-semibold">معدل الحل</p>
                <p className="text-2xl font-bold text-foreground mt-1">{metrics.satisfactionRate}%</p>
                <p className="text-xs text-success mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +5% من الشهر الماضي
                </p>
              </div>
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-warning/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-semibold">وقت الحل المتوسط</p>
                <p className="text-2xl font-bold text-foreground mt-1">{metrics.avgResolutionTime}</p>
                <p className="text-xs text-muted-foreground mt-1">يوم</p>
              </div>
              <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-destructive/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-semibold">قضايا حرجة</p>
                <p className="text-2xl font-bold text-foreground mt-1">{metrics.criticalIssues}</p>
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  تحتاج متابعة فورية
                </p>
              </div>
              <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                <Flame className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Series Chart */}
        <Card className="bg-card/50 backdrop-blur-sm border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-accent" />
              الاتجاهات الزمنية
            </CardTitle>
            <CardDescription>عدد الطلبات والحالات الحرجة على مدار الشهر</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip
                  contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.2)" }}
                />
                <Legend />
                <Area type="monotone" dataKey="issues" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} name="إجمالي الطلبات" />
                <Area type="monotone" dataKey="critical" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} name="حالات حرجة" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sentiment Analysis */}
        <Card className="bg-card/50 backdrop-blur-sm border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-accent" />
              تحليل المشاعر
            </CardTitle>
            <CardDescription>توزيع المشاعر في الطلبات والشكاوى</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card className="bg-card/50 backdrop-blur-sm border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-accent" />
              توزيع الفئات
            </CardTitle>
            <CardDescription>الطلبات حسب نوع المشكلة</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip
                  contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.2)" }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="bg-card/50 backdrop-blur-sm border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-accent" />
              توزيع الحالات
            </CardTitle>
            <CardDescription>حالة الطلبات والشكاوى</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* District Heatmap */}
      <Card className="bg-card/50 backdrop-blur-sm border-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-accent" />
            خريطة المشاكل الجغرافية
          </CardTitle>
          <CardDescription>توزيع المشاكل والحالات الحرجة حسب المناطق الجغرافية</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {districtHeatmap.map((district) => (
              <div key={district.name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{district.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {district.total} طلب
                    </Badge>
                    <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
                      {district.critical} حرج
                    </Badge>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-success via-warning to-destructive transition-all"
                    style={{ width: `${Math.min(district.intensity, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Urgency Heatmap */}
      <Card className="bg-card/50 backdrop-blur-sm border-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-accent" />
            توزيع مستويات الأولوية
          </CardTitle>
          <CardDescription>تصنيف الطلبات حسب درجة الاستعجالية</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={urgencyData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis type="number" stroke="rgba(255,255,255,0.5)" />
              <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.5)" />
              <Tooltip
                contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.2)" }}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedAnalyticsDashboard;
