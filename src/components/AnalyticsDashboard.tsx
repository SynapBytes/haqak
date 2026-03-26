import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend 
} from "recharts";
import { Loader2, MapPin, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

const COLORS = ["#D4AF37", "#8B4513", "#2F4F4F", "#556B2F", "#A0522D", "#6B8E23"];

const AnalyticsDashboard = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      
      // Fetch issues with governorate info
      const { data: issues } = await supabase.from("issues").select("status, governorate, created_at");
      
      if (issues) {
        // 1. Issues by Governorate
        const govData: Record<string, number> = {};
        issues.forEach(i => {
          const gov = i.governorate || t("common.unknown");
          govData[gov] = (govData[gov] || 0) + 1;
        });
        const govChartData = Object.entries(govData).map(([name, value]) => ({ name, value }));

        // 2. Issues by Status
        const statusData: Record<string, number> = {};
        issues.forEach(i => {
          statusData[i.status] = (statusData[i.status] || 0) + 1;
        });
        const statusChartData = Object.entries(statusData).map(([name, value]) => ({ 
          name: t(`issues.status_${name}`), 
          value 
        }));

        // 3. Issues over time (last 7 days)
        const last7Days: Record<string, number> = {};
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          last7Days[d.toLocaleDateString("ar-EG", { weekday: "short" })] = 0;
        }
        
        issues.forEach(i => {
          const date = new Date(i.created_at);
          const dayKey = date.toLocaleDateString("ar-EG", { weekday: "short" });
          if (last7Days[dayKey] !== undefined) {
            last7Days[dayKey]++;
          }
        });
        const timeChartData = Object.entries(last7Days).map(([name, value]) => ({ name, value }));

        setStats({ govChartData, statusChartData, timeChartData });
      }
      setLoading(false);
    };

    fetchAnalytics();
  }, [t]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-accent" />
        <span className="text-sm text-muted-foreground">{t("common.loading")}</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Issues by Governorate */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-6">
          <MapPin className="w-5 h-5 text-accent" />
          <h3 className="font-bold text-foreground">{t("admin_dashboard.issues_by_gov")}</h3>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats?.govChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "12px", border: "1px solid hsl(var(--border))" }}
                itemStyle={{ color: "hsl(var(--accent))" }}
              />
              <Bar dataKey="value" fill="#D4AF37" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Issues by Status */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-6">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">{t("admin_dashboard.issues_by_status")}</h3>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={stats?.statusChartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {stats?.statusChartData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "12px", border: "1px solid hsl(var(--border))" }}
              />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Issues Trend */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-sm md:col-span-2"
      >
        <div className="flex items-center gap-2 mb-6">
          <Clock className="w-5 h-5 text-success" />
          <h3 className="font-bold text-foreground">{t("admin_dashboard.issues_trend")}</h3>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats?.timeChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "12px", border: "1px solid hsl(var(--border))" }}
              />
              <Line type="monotone" dataKey="value" stroke="#D4AF37" strokeWidth={3} dot={{ r: 4, fill: "#D4AF37" }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
};

export default AnalyticsDashboard;
