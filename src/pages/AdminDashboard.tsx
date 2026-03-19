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
  Loader2, AlertCircle, TrendingUp, Clock, FileText
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
      setUsers(profilesRes.data.map((p: any) => ({
        ...p,
        role: roleMap.get(p.user_id) || "citizen",
      })));
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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container py-6 md:py-8 px-4">
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-foreground mb-1">لوحة تحكم الإدارة</h1>
          <p className="text-muted-foreground text-sm">إدارة المستخدمين والمشاكل والتحليلات</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          {[
            { label: "مواطنين", value: totalCitizens, icon: Users, color: "text-accent" },
            { label: "نواب", value: totalMPs, icon: ShieldCheck, color: "text-primary" },
            { label: "بانتظار الموافقة", value: pendingMPs, icon: AlertCircle, color: "text-warning" },
            { label: "نسبة الحل", value: `${resolutionRate}%`, icon: TrendingUp, color: "text-success" },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="civic-card">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-secondary flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xl md:text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-secondary/50 rounded-xl p-1 w-fit">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab(tab.key)}
              className="gap-2 text-xs"
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
        ) : activeTab === "users" ? (
          <>
            {/* Search & Filter */}
            <div className="civic-card mb-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث بالاسم أو رقم التليفون..." className="pr-10 text-right" />
                </div>
                <div className="flex gap-2">
                  {(["all", "citizen", "mp"] as const).map((r) => (
                    <Button key={r} variant={filterRole === r ? "secondary" : "ghost"} size="sm" onClick={() => setFilterRole(r)} className="text-xs">
                      {r === "all" ? "الكل" : roleLabels[r]}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="space-y-3">
              {filteredUsers.map((user, i) => (
                <motion.div key={user.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                  className="civic-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-accent">{user.full_name.charAt(0)}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">{user.full_name}</span>
                        <Badge variant={user.role === "mp" ? "default" : "secondary"} className="text-[10px]">
                          {roleLabels[user.role]}
                        </Badge>
                        {user.role === "mp" && (
                          <Badge variant={user.is_approved ? "default" : "destructive"} className="text-[10px]">
                            {user.is_approved ? "مفعّل" : "قيد المراجعة"}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground">{user.phone}</span>
                        {user.registration_number && (
                          <span className="text-xs text-muted-foreground">القيد: {user.registration_number}</span>
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
                      <Button size="sm" className="gap-1 bg-success text-success-foreground hover:bg-success/90 text-xs h-8"
                        disabled={approving === user.user_id}
                        onClick={() => handleApproveMP(user.user_id, true)}>
                        {approving === user.user_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                        موافقة
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 text-destructive border-destructive/30 text-xs h-8"
                        disabled={approving === user.user_id}
                        onClick={() => handleApproveMP(user.user_id, false)}>
                        <XCircle className="w-3 h-3" /> رفض
                      </Button>
                    </div>
                  )}
                </motion.div>
              ))}
              {filteredUsers.length === 0 && (
                <div className="civic-card text-center py-8">
                  <p className="text-muted-foreground text-sm">لا يوجد مستخدمين مطابقين</p>
                </div>
              )}
            </div>
          </>
        ) : activeTab === "issues" ? (
          <div className="space-y-3">
            {issues.map((issue, i) => (
              <motion.div key={issue.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                className="civic-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm truncate">{issue.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{issue.description}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant={issue.status === "resolved" ? "default" : issue.status === "in-progress" ? "secondary" : "outline"} className="text-[10px]">
                        {issue.status === "resolved" ? "تم الحل" : issue.status === "in-progress" ? "قيد المعالجة" : "تم الاستلام"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{issue.category}</span>
                      <span className="text-[10px] text-muted-foreground">{issue.location}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
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
              { label: "إجمالي المشاكل", value: totalIssues, icon: FileText },
              { label: "تم الحل", value: resolvedIssues, icon: CheckCircle2 },
              { label: "قيد المعالجة", value: issues.filter((i) => i.status === "in-progress").length, icon: Clock },
              { label: "مشاكل مفتوحة", value: issues.filter((i) => i.status === "received").length, icon: AlertCircle },
              { label: "مشاكل جماعية", value: issues.filter((i) => i.issue_type === "collective").length, icon: Users },
              { label: "مؤكدة من المواطنين", value: issues.filter((i) => i.citizen_confirmed).length, icon: CheckCircle2 },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="civic-card text-center">
                <item.icon className="w-8 h-8 text-accent mx-auto mb-3" />
                <div className="text-2xl font-bold text-foreground mb-1">{item.value}</div>
                <div className="text-xs text-muted-foreground">{item.label}</div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
