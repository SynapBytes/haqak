import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Users, ShieldCheck, BarChart3, Search, CheckCircle2, XCircle,
  Loader2, AlertCircle, TrendingUp, Clock, FileText, MapPin
} from "lucide-react";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  registration_number: string | null;
  is_approved: boolean;
  created_at: string;
  constituency: string | null;
  governorate: string | null;
}

interface UserWithRole extends UserProfile {
  role: "citizen" | "mp" | "admin";
}

const AdminDashboard = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"users" | "issues" | "analytics">("users");
  const [filterRole, setFilterRole] = useState<"all" | "citizen" | "mp">("all");
  const [approving, setApproving] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [profilesRes, rolesRes, issuesRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
      supabase.from("issues").select("*").order("created_at", { ascending: false }),
    ]);
    if (profilesRes.data && rolesRes.data) {
      const roleMap = new Map(rolesRes.data.map((r: any) => [r.user_id, r.role]));
      setUsers(profilesRes.data.map((p: any) => ({ ...p, role: roleMap.get(p.user_id) || "citizen" })));
    }
    if (issuesRes.data) setIssues(issuesRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleApproveMP = async (userId: string, approve: boolean) => {
    setApproving(userId);
    const { error } = await supabase.from("profiles").update({ is_approved: approve }).eq("user_id", userId);
    if (error) {
      toast.error("حدث خطأ");
    } else {
      toast.success(approve ? "تم تفعيل حساب النائب ✅" : "تم رفض حساب النائب");
      fetchData();
    }
    setApproving(null);
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = !searchQuery || u.full_name.includes(searchQuery) || u.phone.includes(searchQuery);
    const matchesRole = filterRole === "all" || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const totalCitizens = users.filter((u) => u.role === "citizen").length;
  const totalMPs = users.filter((u) => u.role === "mp").length;
  const pendingMPs = users.filter((u) => u.role === "mp" && !u.is_approved).length;
  const totalIssues = issues.length;
  const resolvedIssues = issues.filter((i) => i.status === "resolved").length;
  const resolutionRate = totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 0;

  const roleLabels: Record<string, string> = { citizen: "مواطن", mp: "نائب", admin: "مسؤول" };

  const tabs = [
    { key: "users" as const, label: "المستخدمين", icon: Users },
    { key: "issues" as const, label: "المشاكل", icon: FileText },
    { key: "analytics" as const, label: "التحليلات", icon: BarChart3 },
  ];

  const statCards = [
    { label: "مواطنين", value: totalCitizens, icon: Users, color: "text-accent", bg: "from-accent/10 to-accent/5" },
    { label: "نواب", value: totalMPs, icon: ShieldCheck, color: "text-primary", bg: "from-primary/10 to-primary/5" },
    { label: "بانتظار الموافقة", value: pendingMPs, icon: AlertCircle, color: "text-warning", bg: "from-warning/10 to-warning/5" },
    { label: "نسبة الحل", value: `${resolutionRate}%`, icon: TrendingUp, color: "text-success", bg: "from-success/10 to-success/5" },
  ];

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-accent/[0.04] blur-3xl" />
        <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.3, 0.15] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-primary/[0.04] blur-3xl" />
      </div>

      <AppHeader />
      <div className="container py-6 md:py-8 px-4 relative z-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1 tracking-tight">لوحة تحكم الإدارة</h1>
          <p className="text-muted-foreground text-sm">إدارة المستخدمين والمشاكل والتحليلات</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          {statCards.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -3, scale: 1.02 }}
              className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 md:p-5 group hover:shadow-xl transition-all duration-300 cursor-default"
            >
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${stat.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground font-medium">{stat.label}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-6 bg-card/60 backdrop-blur-sm border border-border/30 rounded-2xl p-1.5 w-fit">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab(tab.key)}
              className={`gap-2 text-xs rounded-xl transition-all ${activeTab === tab.key ? "shadow-sm" : ""}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-accent" />
            <span className="text-sm text-muted-foreground">جاري التحميل...</span>
          </div>
        ) : activeTab === "users" ? (
          <>
            {/* Search & Filter */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-5 mb-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث بالاسم أو رقم التليفون..." className="pr-11 text-right h-11 rounded-xl border-border/50 bg-background/50" />
                </div>
                <div className="flex gap-2">
                  {(["all", "citizen", "mp"] as const).map((r) => (
                    <Button key={r} variant={filterRole === r ? "secondary" : "ghost"} size="sm" onClick={() => setFilterRole(r)} className="text-xs rounded-lg">
                      {r === "all" ? "الكل" : roleLabels[r]}
                    </Button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Users List */}
            <div className="space-y-3">
              {filteredUsers.map((user, i) => (
                <motion.div key={user.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                  className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:shadow-lg hover:border-border transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-accent/10 to-primary/10 flex items-center justify-center shrink-0 border border-accent/10">
                      <span className="text-sm font-bold text-accent">{user.full_name.charAt(0)}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground text-sm">{user.full_name}</span>
                        <Badge variant={user.role === "mp" ? "default" : "secondary"} className="text-[10px] rounded-lg">
                          {roleLabels[user.role]}
                        </Badge>
                        {user.role === "mp" && (
                          <Badge
                            variant={user.is_approved ? "default" : "destructive"}
                            className={`text-[10px] rounded-lg ${user.is_approved ? "bg-success/10 text-success border-success/20" : ""}`}
                          >
                            {user.is_approved ? "مفعّل" : "قيد المراجعة"}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">{user.phone}</span>
                        {user.registration_number && (
                          <span className="text-xs text-muted-foreground">القيد: {user.registration_number}</span>
                        )}
                        {user.governorate && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{user.governorate}</span>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(user.created_at).toLocaleDateString("ar-EG")}
                        </span>
                      </div>
                    </div>
                  </div>
                  {user.role === "mp" && !user.is_approved && (
                    <div className="flex gap-2">
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button size="sm" className="gap-1.5 bg-gradient-to-l from-success to-primary text-white hover:opacity-90 text-xs h-9 rounded-xl shadow-md"
                          disabled={approving === user.user_id}
                          onClick={() => handleApproveMP(user.user_id, true)}>
                          {approving === user.user_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          موافقة
                        </Button>
                      </motion.div>
                      <Button size="sm" variant="outline" className="gap-1.5 text-destructive border-destructive/20 text-xs h-9 rounded-xl hover:bg-destructive/5"
                        disabled={approving === user.user_id}
                        onClick={() => handleApproveMP(user.user_id, false)}>
                        <XCircle className="w-3.5 h-3.5" /> رفض
                      </Button>
                    </div>
                  )}
                </motion.div>
              ))}
              {filteredUsers.length === 0 && (
                <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl text-center py-16">
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <Search className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium text-sm">لا يوجد مستخدمين مطابقين</p>
                </div>
              )}
            </div>
          </>
        ) : activeTab === "issues" ? (
          <div className="space-y-3">
            {issues.map((issue, i) => (
              <motion.div key={issue.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 md:p-5 hover:shadow-lg transition-all duration-300">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground text-sm truncate">{issue.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{issue.description}</p>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <Badge
                        className={`text-[10px] rounded-lg border ${
                          issue.status === "resolved" ? "bg-success/10 text-success border-success/20" :
                          issue.status === "in-progress" ? "bg-warning/10 text-warning border-warning/20" :
                          "bg-accent/10 text-accent border-accent/20"
                        }`}
                      >
                        {issue.status === "resolved" ? "تم الحل" : issue.status === "in-progress" ? "قيد المعالجة" : "تم الاستلام"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground bg-muted rounded-lg px-2 py-0.5">{issue.category}</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{issue.location}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 bg-muted rounded-lg px-2 py-1">
                    {new Date(issue.created_at).toLocaleDateString("ar-EG")}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* Analytics Tab */
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: "إجمالي المشاكل", value: totalIssues, icon: FileText, color: "text-accent", bg: "from-accent/10 to-accent/5" },
              { label: "تم الحل", value: resolvedIssues, icon: CheckCircle2, color: "text-success", bg: "from-success/10 to-success/5" },
              { label: "قيد المعالجة", value: issues.filter((i) => i.status === "in-progress").length, icon: Clock, color: "text-warning", bg: "from-warning/10 to-warning/5" },
              { label: "مشاكل مفتوحة", value: issues.filter((i) => i.status === "received").length, icon: AlertCircle, color: "text-info", bg: "from-info/10 to-info/5" },
              { label: "مشاكل جماعية", value: issues.filter((i) => i.issue_type === "collective").length, icon: Users, color: "text-accent", bg: "from-accent/10 to-primary/5" },
              { label: "مؤكدة من المواطنين", value: issues.filter((i) => i.citizen_confirmed).length, icon: CheckCircle2, color: "text-primary", bg: "from-primary/10 to-primary/5" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4, scale: 1.02 }}
                className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 text-center hover:shadow-xl transition-all duration-300 cursor-default group"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.bg} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <item.icon className={`w-7 h-7 ${item.color}`} />
                </div>
                <div className={`text-3xl font-bold mb-1 ${item.color}`}>{item.value}</div>
                <div className="text-xs text-muted-foreground font-medium">{item.label}</div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
