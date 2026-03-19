import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, MapPin, Building2, User, CheckCircle2, Clock, AlertCircle,
  Users, TrendingUp, BarChart3, PieChart
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/contexts/ThemeContext";
import ornament3 from "@/assets/egyptian-ornament-3.png";
import egyptianCobra from "@/assets/egyptian-cobra.png";
import egyptianAnkh from "@/assets/egyptian-ankh.png";
import egyptianBorder from "@/assets/egyptian-border.png";

interface MPProfile {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  constituency: string | null;
  governorate: string | null;
  center: string | null;
}

interface IssueStats {
  total: number;
  resolved: number;
  inProgress: number;
  received: number;
  collective: number;
  confirmed: number;
  categories: Record<string, number>;
}

const MPProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<MPProfile | null>(null);
  const [stats, setStats] = useState<IssueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!id) return;
      setLoading(true);

      // Fetch MP profile
      // Only select public-safe fields (no phone/contact_phone for public view)
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, constituency, governorate, center")
        .eq("user_id", id)
        .single();

      if (!profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // Fetch issues assigned to or handled by this MP
      const { data: issues } = await supabase
        .from("issues")
        .select("status, issue_type, citizen_confirmed, category")
        .eq("assigned_mp_id", id);

      if (issues) {
        const categories: Record<string, number> = {};
        issues.forEach((i: any) => {
          categories[i.category] = (categories[i.category] || 0) + 1;
        });

        setStats({
          total: issues.length,
          resolved: issues.filter((i: any) => i.status === "resolved").length,
          inProgress: issues.filter((i: any) => i.status === "in-progress").length,
          received: issues.filter((i: any) => i.status === "received").length,
          collective: issues.filter((i: any) => i.issue_type === "collective").length,
          confirmed: issues.filter((i: any) => i.citizen_confirmed).length,
          categories,
        });
      } else {
        setStats({ total: 0, resolved: 0, inProgress: 0, received: 0, collective: 0, confirmed: 0, categories: {} });
      }

      setLoading(false);
    };
    fetchProfile();
  }, [id]);

  const resolutionRate = stats && stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;
  const topCategories = stats
    ? Object.entries(stats.categories).sort((a, b) => b[1] - a[1]).slice(0, 5)
    : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container py-20 text-center">
          <User className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">لم يتم العثور على النائب</h1>
          <p className="text-sm text-muted-foreground">تأكد من الرابط وحاول مرة أخرى</p>
        </div>
      </div>
    );
  }

  const { theme } = useTheme();
  const isDark = theme === "dark";
  const decoStyle = (op: [number, number]) => ({
    opacity: isDark ? op[0] : op[1],
    filter: isDark
      ? "brightness(1.08) drop-shadow(0 0 34px rgba(200,149,60,0.38))"
      : "drop-shadow(0 14px 28px rgba(200,149,60,0.18))",
  });

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <AppHeader />

      {/* Egyptian decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* الجعران المجنح — أعلى يمين */}
        <img src={ornament3} alt="" className="absolute top-12 right-4 w-[180px] md:w-[260px] lg:w-[320px] select-none" style={decoStyle([0.2, 0.12])} draggable={false} />
        {/* قناع الفرعون — أسفل يسار */}
        <img src={egyptianCobra} alt="" className="absolute bottom-10 left-6 w-[130px] md:w-[180px] lg:w-[230px] select-none" style={decoStyle([0.18, 0.1])} draggable={false} />
        {/* العنخ — أعلى يسار */}
        <img src={egyptianAnkh} alt="" className="absolute top-24 left-8 w-[65px] md:w-[95px] lg:w-[120px] select-none" style={decoStyle([0.16, 0.09])} draggable={false} />
        {/* بوردر فرعوني — أسفل */}
        <img src={egyptianBorder} alt="" className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] md:w-[600px] select-none" style={decoStyle([0.14, 0.08])} draggable={false} />
        {/* Ambient glow */}
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full blur-3xl" style={{ background: `radial-gradient(circle, hsl(var(--warning) / ${isDark ? 0.07 : 0.04}), transparent 70%)` }} />
      </div>

      <div className="container py-8 px-4 max-w-4xl relative z-10">

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="civic-card mb-6"
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Avatar */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shrink-0 shadow-lg">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full rounded-2xl object-cover" />
              ) : (
                <span className="text-3xl sm:text-4xl font-bold text-white">
                  {profile.full_name.charAt(0)}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="text-center sm:text-right flex-1">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">{profile.full_name}</h1>
                <Badge className="bg-accent/10 text-accent border-accent/20 text-xs">نائب</Badge>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-sm text-muted-foreground mt-3">
                {profile.governorate && (
                  <span className="flex items-center gap-1.5 bg-secondary px-3 py-1.5 rounded-lg">
                    <Building2 className="w-3.5 h-3.5" />
                    {profile.governorate}
                  </span>
                )}
                {profile.constituency && (
                  <span className="flex items-center gap-1.5 bg-secondary px-3 py-1.5 rounded-lg">
                    <MapPin className="w-3.5 h-3.5" />
                    {profile.constituency}
                  </span>
                )}
                {profile.center && (
                  <span className="flex items-center gap-1.5 bg-secondary px-3 py-1.5 rounded-lg">
                    <Building2 className="w-3.5 h-3.5" />
                    {profile.center}
                  </span>
                )}
              </div>

              {/* Resolution Rate Bar */}
              {stats && stats.total > 0 && (
                <div className="mt-4 max-w-xs mx-auto sm:mx-0">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-muted-foreground">نسبة الحل</span>
                    <span className="text-sm font-bold text-foreground">{resolutionRate}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${resolutionRate}%` }}
                      transition={{ duration: 1, delay: 0.3 }}
                      className="h-full rounded-full bg-gradient-to-l from-success to-success/70"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Stats Cards — Strategic Colors */}
        <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
          {[
            {
              label: "تم الحل",
              value: stats?.resolved || 0,
              icon: CheckCircle2,
              bgClass: "bg-success/10",
              textClass: "text-success",
              borderClass: "border-success/20",
            },
            {
              label: "قيد المعالجة",
              value: stats?.inProgress || 0,
              icon: Clock,
              bgClass: "bg-warning/10",
              textClass: "text-warning",
              borderClass: "border-warning/20",
            },
            {
              label: "مفتوحة",
              value: stats?.received || 0,
              icon: AlertCircle,
              bgClass: "bg-destructive/10",
              textClass: "text-destructive",
              borderClass: "border-destructive/20",
            },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className={`rounded-2xl border ${stat.borderClass} ${stat.bgClass} p-4 md:p-5 text-center`}
            >
              <stat.icon className={`w-7 h-7 md:w-8 md:h-8 mx-auto mb-2 ${stat.textClass}`} />
              <div className={`text-2xl md:text-3xl font-bold ${stat.textClass} mb-1`}>{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Detailed Analytics */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {/* Summary */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="civic-card"
          >
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-accent" />
              ملخص الأداء
            </h3>
            <div className="space-y-3">
              {[
                { label: "إجمالي المشاكل", value: stats?.total || 0, icon: BarChart3 },
                { label: "مشاكل جماعية", value: stats?.collective || 0, icon: Users },
                { label: "مؤكدة من المواطنين", value: stats?.confirmed || 0, icon: CheckCircle2 },
                { label: "نسبة الحل", value: `${resolutionRate}%`, icon: TrendingUp },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <item.icon className="w-3.5 h-3.5" />
                    {item.label}
                  </span>
                  <span className="font-semibold text-foreground text-sm">{item.value}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Top Categories */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="civic-card"
          >
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-accent" />
              أكثر التصنيفات
            </h3>
            {topCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات بعد</p>
            ) : (
              <div className="space-y-3">
                {topCategories.map(([cat, count], i) => {
                  const pct = stats && stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                  return (
                    <div key={cat}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-foreground">{cat}</span>
                        <span className="text-xs text-muted-foreground">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.7 + i * 0.1 }}
                          className="h-full rounded-full bg-accent/70"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>

      </div>
    </div>
  );
};

export default MPProfilePage;
