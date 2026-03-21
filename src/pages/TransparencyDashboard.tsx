import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { BarChart3, CheckCircle2, Clock, TrendingUp, PieChart, AlertCircle, Loader2 } from "lucide-react";
import { PieChart as RechartsPie, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = [
  "hsl(217, 91%, 60%)", // accent
  "hsl(142, 76%, 36%)", // success
  "hsl(38, 92%, 50%)",  // warning
  "hsl(0, 72%, 51%)",   // destructive
  "hsl(262, 83%, 58%)", // purple
  "hsl(180, 70%, 45%)", // teal
  "hsl(330, 81%, 60%)", // pink
  "hsl(25, 95%, 53%)",  // orange
];

interface Stats {
  total: number;
  resolved: number;
  inProgress: number;
  received: number;
  byCategory: { name: string; value: number }[];
  byGovernorate: { name: string; value: number }[];
}

const TransparencyDashboard = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const { data, error } = await supabase.rpc("get_public_issue_stats");

      if (data && !error) {
        const d = data as any;
        setStats({
          total: d.total || 0,
          resolved: d.resolved || 0,
          inProgress: d.in_progress || 0,
          received: d.received || 0,
          byCategory: d.by_category || [],
          byGovernorate: d.by_location || [],
        });
      }
      setLoading(false);
    };
    fetchStats();
  }, []);

  const resolutionRate = stats ? (stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0) : 0;

  const statusData = stats
    ? [
        { name: t("transparency.received"), value: stats.received },
        { name: t("transparency.in_progress"), value: stats.inProgress },
        { name: t("transparency.resolved"), value: stats.resolved },
      ]
    : [];

  const summaryCards = stats
    ? [
        { label: t("transparency.total"), value: stats.total, icon: BarChart3, color: "text-accent", bg: "from-accent/10 to-accent/5" },
        { label: t("transparency.resolved"), value: stats.resolved, icon: CheckCircle2, color: "text-success", bg: "from-success/10 to-success/5" },
        { label: t("transparency.resolution_rate"), value: `${resolutionRate}%`, icon: TrendingUp, color: "text-primary", bg: "from-primary/10 to-primary/5" },
        { label: t("transparency.pending"), value: stats.received + stats.inProgress, icon: Clock, color: "text-warning", bg: "from-warning/10 to-warning/5" },
      ]
    : [];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container py-6 md:py-8 px-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1 tracking-tight">{t("transparency.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("transparency.subtitle")}</p>
        </motion.div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-accent" />
            <span className="text-sm text-muted-foreground">{t("common.loading")}</span>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
              {summaryCards.map((card, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 md:p-5 group hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${card.bg} flex items-center justify-center ${card.color}`}>
                      <card.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-2xl md:text-3xl font-bold text-foreground">{card.value}</div>
                      <div className="text-[10px] md:text-xs text-muted-foreground font-medium">{card.label}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* By Category - Bar Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-5"
              >
                <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-accent" />
                  {t("transparency.by_category")}
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={stats?.byCategory || []} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                    />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {(stats?.byCategory || []).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>

              {/* By Status - Pie Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-5"
              >
                <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-warning" />
                  {t("transparency.by_status")}
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <RechartsPie>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      <Cell fill="hsl(217, 91%, 60%)" />
                      <Cell fill="hsl(38, 92%, 50%)" />
                      <Cell fill="hsl(142, 76%, 36%)" />
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                    />
                    <Legend />
                  </RechartsPie>
                </ResponsiveContainer>
              </motion.div>
            </div>

            {/* By Governorate */}
            {stats && stats.byGovernorate.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-5"
              >
                <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  {t("transparency.by_governorate")}
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.byGovernorate} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                    />
                    <Bar dataKey="value" fill="hsl(217, 91%, 60%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TransparencyDashboard;
