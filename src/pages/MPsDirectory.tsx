import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, MapPin, Building2, TrendingUp, CheckCircle2, Users,
  Loader2, ChevronLeft, Shield, BarChart3, Eye
} from "lucide-react";

interface MPItem {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  constituency: string | null;
  governorate: string | null;
  center: string | null;
  stats: { total: number; resolved: number; rate: number };
}

const MPsDirectory = () => {
  const navigate = useNavigate();
  const [mps, setMps] = useState<MPItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGovernorate, setFilterGovernorate] = useState("الكل");

  useEffect(() => {
    const fetchMPs = async () => {
      setLoading(true);

      // Get all approved MP profiles
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "mp");

      if (!roles || roles.length === 0) {
        setLoading(false);
        return;
      }

      const mpUserIds = roles.map(r => r.user_id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, constituency, governorate, center, is_approved")
        .in("user_id", mpUserIds)
        .eq("is_approved", true);

      if (!profiles) {
        setLoading(false);
        return;
      }

      // Get issue stats for all MPs
      const { data: issues } = await supabase
        .from("issues")
        .select("assigned_mp_id, status")
        .in("assigned_mp_id", mpUserIds);

      const statsMap: Record<string, { total: number; resolved: number }> = {};
      issues?.forEach(issue => {
        const mpId = issue.assigned_mp_id;
        if (!mpId) return;
        if (!statsMap[mpId]) statsMap[mpId] = { total: 0, resolved: 0 };
        statsMap[mpId].total++;
        if (issue.status === "resolved") statsMap[mpId].resolved++;
      });

      const mpItems: MPItem[] = profiles.map(p => {
        const s = statsMap[p.user_id] || { total: 0, resolved: 0 };
        return {
          ...p,
          stats: {
            total: s.total,
            resolved: s.resolved,
            rate: s.total > 0 ? Math.round((s.resolved / s.total) * 100) : 0,
          },
        };
      });

      // Sort by resolution rate descending
      mpItems.sort((a, b) => b.stats.rate - a.stats.rate || b.stats.resolved - a.stats.resolved);
      setMps(mpItems);
      setLoading(false);
    };
    fetchMPs();
  }, []);

  const governorates = ["الكل", ...Array.from(new Set(mps.map(m => m.governorate).filter(Boolean) as string[]))];

  const filtered = mps.filter(mp => {
    const matchesSearch = !searchQuery ||
      mp.full_name.includes(searchQuery) ||
      mp.constituency?.includes(searchQuery) ||
      mp.governorate?.includes(searchQuery);
    const matchesGov = filterGovernorate === "الكل" || mp.governorate === filterGovernorate;
    return matchesSearch && matchesGov;
  });

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-accent/[0.04] blur-3xl" />
        <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.3, 0.15] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-primary/[0.04] blur-3xl" />
      </div>

      <AppHeader />
      <div className="container py-6 md:py-8 px-4 relative z-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent to-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">دليل النواب</h1>
              <p className="text-muted-foreground text-sm">تصفّح النواب المسجلين واطّلع على أدائهم</p>
            </div>
          </div>
        </motion.div>

        {/* Search & Filter */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 md:p-5 mb-6"
        >
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم، الدائرة، أو المحافظة..."
                className="pr-11 text-right h-11 rounded-xl border-border/50 bg-background/50"
              />
            </div>
            {governorates.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {governorates.map(gov => (
                  <Button
                    key={gov}
                    variant={filterGovernorate === gov ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setFilterGovernorate(gov)}
                    className="text-xs h-8 rounded-lg gap-1"
                  >
                    {gov !== "الكل" && <MapPin className="w-3 h-3" />}
                    {gov}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        <div className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent" />
          {filtered.length} نائب مسجّل
        </div>

        {/* MPs Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-accent" />
            <span className="text-sm text-muted-foreground">جاري التحميل...</span>
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-3xl text-center py-16 px-6"
          >
            <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">لا يوجد نواب مطابقين</h3>
            <p className="text-sm text-muted-foreground">حاول تغيير كلمات البحث أو الفلتر</p>
          </motion.div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((mp, i) => (
              <motion.div
                key={mp.user_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ y: -4, scale: 1.01 }}
                className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-5 hover:shadow-xl hover:border-border transition-all duration-300 cursor-pointer group"
                onClick={() => navigate(`/mp-profile/${mp.user_id}`)}
              >
                {/* MP Header */}
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shrink-0 overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow">
                    {mp.avatar_url ? (
                      <img src={mp.avatar_url} alt={mp.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-white">{mp.full_name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-foreground text-sm truncate group-hover:text-accent transition-colors">
                      {mp.full_name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {mp.governorate && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 bg-muted rounded-md px-1.5 py-0.5">
                          <Building2 className="w-2.5 h-2.5" />
                          {mp.governorate}
                        </span>
                      )}
                      {mp.constituency && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 bg-muted rounded-md px-1.5 py-0.5">
                          <MapPin className="w-2.5 h-2.5" />
                          {mp.constituency}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-accent/[0.06] rounded-xl p-2 text-center">
                    <div className="text-lg font-bold text-accent">{mp.stats.total}</div>
                    <div className="text-[9px] text-muted-foreground">إجمالي</div>
                  </div>
                  <div className="bg-success/[0.06] rounded-xl p-2 text-center">
                    <div className="text-lg font-bold text-success">{mp.stats.resolved}</div>
                    <div className="text-[9px] text-muted-foreground">محلولة</div>
                  </div>
                  <div className="bg-primary/[0.06] rounded-xl p-2 text-center">
                    <div className="text-lg font-bold text-primary">{mp.stats.rate}%</div>
                    <div className="text-[9px] text-muted-foreground">نسبة الحل</div>
                  </div>
                </div>

                {/* Resolution Bar */}
                <div className="mb-3">
                  <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${mp.stats.rate}%` }}
                      transition={{ duration: 0.8, delay: 0.3 + i * 0.05 }}
                      className="h-full rounded-full bg-gradient-to-l from-success to-success/70"
                    />
                  </div>
                </div>

                {/* View Profile */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full gap-2 text-xs h-9 rounded-xl text-accent hover:bg-accent/5 group-hover:bg-accent/5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  عرض البروفايل
                  <ChevronLeft className="w-3 h-3 mr-auto group-hover:-translate-x-1 transition-transform" />
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MPsDirectory;
