import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Users, ShieldCheck, BarChart3, Search, CheckCircle2, XCircle,
  Loader2, AlertCircle, TrendingUp, Clock, FileText, MapPin, Trash2, UserCog
} from "lucide-react";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import { AppRole, resolvePrimaryRole } from "@/constants/roles";
import { dispatchNotification } from "@/lib/notifications";
import { analytics } from "@/lib/analytics";

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
  banned_until: string | null;
}

interface UserWithRole extends UserProfile {
  role: AppRole;
}

const AdminDashboard = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [issueSearchQuery, setIssueSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"users" | "issues" | "analytics">("users");
  const [filterRole, setFilterRole] = useState<"all" | AppRole>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "banned">("all");
  const [filterGov, setFilterGov] = useState<string>("all");
  const [approving, setApproving] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [profilesRes, rolesRes, issuesRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
      supabase.from("issues").select("*").order("created_at", { ascending: false }),
    ]);
    if (profilesRes.data && rolesRes.data) {
      const rolesByUser = new Map<string, AppRole[]>();
      rolesRes.data.forEach((r: any) => {
        const existing = rolesByUser.get(r.user_id) ?? [];
        rolesByUser.set(r.user_id, [...existing, r.role]);
      });
      setUsers(
        profilesRes.data.map((p: any) => {
          const roles = rolesByUser.get(p.user_id) ?? [];
          return { ...p, role: resolvePrimaryRole(roles) };
        }),
      );
    }
    if (issuesRes.data) setIssues(issuesRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleApproveMP = async (userId: string, approve: boolean) => {
    setApproving(userId);
    const { error } = await supabase.from("profiles").update({ is_approved: approve }).eq("user_id", userId);
    if (error) {
      toast.error(t("admin_dashboard.error"));
    } else {
      toast.success(approve ? t("admin_dashboard.mp_approved") : t("admin_dashboard.mp_revoked"));
      analytics.track(approve ? "admin_approved_mp" : "admin_rejected_mp");
      await dispatchNotification({
        recipients: [userId],
        event: "admin_decision",
        reason: approve ? "approved" : "rejected",
      });
      fetchData();
    }
    setApproving(null);
  };

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    setUpdatingRole(userId);
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId);
      if (error) throw error;

      // If changing to mp, ensure is_approved is set; if changing away from mp, clear approval
      if (newRole === "mp") {
        await supabase.from("profiles").update({ is_approved: false }).eq("user_id", userId);
      }

      toast.success(t("admin_dashboard.role_updated"));
      fetchData();
    } catch {
      toast.error(t("admin_dashboard.role_update_error"));
    }
    setUpdatingRole(null);
  };

  const handleDeleteUser = async (userId: string) => {
    setDeletingUser(userId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { target_user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(t("admin_dashboard.account_deleted"));
      fetchData();
    } catch (err: any) {
      toast.error(err.message || t("admin_dashboard.delete_error"));
    }
    setDeletingUser(null);
  };

  // Gather unique governorates for filter
  const governorates = [...new Set(users.map((u) => u.governorate).filter(Boolean))] as string[];

  const filteredUsers = users.filter((u) => {
    const matchesSearch = !searchQuery || u.full_name.includes(searchQuery) || u.phone.includes(searchQuery);
    const matchesRole = filterRole === "all" || u.role === filterRole;
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && (!u.banned_until || new Date(u.banned_until) <= new Date())) ||
      (filterStatus === "banned" && u.banned_until && new Date(u.banned_until) > new Date());
    const matchesGov = filterGov === "all" || u.governorate === filterGov;
    return matchesSearch && matchesRole && matchesStatus && matchesGov;
  });

  const filteredIssues = issues.filter((issue) => {
    if (!issueSearchQuery) return true;
    return issue.title?.includes(issueSearchQuery) || issue.description?.includes(issueSearchQuery) || issue.location?.includes(issueSearchQuery);
  });

  const totalCitizens = users.filter((u) => u.role === "citizen").length;
  const totalMPs = users.filter((u) => u.role === "mp").length;
  const pendingMPs = users.filter((u) => u.role === "mp" && !u.is_approved).length;
  const totalIssues = issues.length;
  const resolvedIssues = issues.filter((i) => i.status === "resolved").length;
  const resolutionRate = totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 0;

  const roleLabels: Record<string, string> = {
    citizen: t("admin_dashboard.role_citizen"),
    mp: t("admin_dashboard.role_mp"),
    admin: t("admin_dashboard.role_admin"),
    moderator: t("admin_dashboard.role_moderator"),
  };

  const tabs = [
    { key: "users" as const, label: t("admin_dashboard.tab_users"), icon: Users },
    { key: "issues" as const, label: t("admin_dashboard.tab_issues"), icon: FileText },
    { key: "analytics" as const, label: t("admin_dashboard.tab_analytics"), icon: BarChart3 },
  ];

  const statCards = [
    { label: t("admin_dashboard.total_users"), value: totalCitizens, icon: Users, color: "text-accent", bg: "from-accent/10 to-accent/5" },
    { label: t("admin_dashboard.total_mps"), value: totalMPs, icon: ShieldCheck, color: "text-primary", bg: "from-primary/10 to-primary/5" },
    { label: t("admin_dashboard.pending_count"), value: pendingMPs, icon: AlertCircle, color: "text-warning", bg: "from-warning/10 to-warning/5" },
    { label: t("admin_dashboard.resolved_rate"), value: `${resolutionRate}%`, icon: TrendingUp, color: "text-success", bg: "from-success/10 to-success/5" },
  ];

  const isBanned = (u: UserWithRole) => u.banned_until && new Date(u.banned_until) > new Date();

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
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1 tracking-tight">{t("admin_dashboard.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("admin_dashboard.subtitle")}</p>
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
            <span className="text-sm text-muted-foreground">{t("common.loading")}</span>
          </div>
        ) : activeTab === "analytics" ? (
          <AnalyticsDashboard />
        ) : activeTab === "users" ? (
          <>
            {/* Search & Filter */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-5 mb-6">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t("admin_dashboard.search_users")} className="pr-11 text-right h-11 rounded-xl border-border/50 bg-background/50" />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {(["all", "citizen", "mp", "moderator", "admin"] as const).map((r) => (
                      <Button key={r} variant={filterRole === r ? "secondary" : "ghost"} size="sm" onClick={() => setFilterRole(r)} className="text-xs rounded-lg">
                        {r === "all" ? t("admin_dashboard.filter_all") : roleLabels[r]}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex gap-2">
                    {(["all", "active", "banned"] as const).map((s) => (
                      <Button key={s} variant={filterStatus === s ? "secondary" : "ghost"} size="sm" onClick={() => setFilterStatus(s)} className="text-xs rounded-lg">
                        {s === "all" ? t("admin_dashboard.filter_all") : s === "active" ? t("admin_dashboard.filter_active") : t("admin_dashboard.filter_banned")}
                      </Button>
                    ))}
                  </div>
                  {governorates.length > 0 && (
                    <Select value={filterGov} onValueChange={setFilterGov}>
                      <SelectTrigger className="w-[180px] h-9 rounded-lg text-xs border-border/50">
                        <SelectValue placeholder={t("admin_dashboard.filter_governorate")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("admin_dashboard.all_governorates")}</SelectItem>
                        {governorates.map((g) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Users List */}
            <div className="space-y-3">
              {filteredUsers.map((user, i) => (
                <motion.div key={user.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                  className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:shadow-lg hover:border-border transition-all duration-300">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-accent/10 to-primary/10 flex items-center justify-center shrink-0 border border-accent/10">
                      <span className="text-sm font-bold text-accent">{user.full_name.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground text-sm truncate">{user.full_name}</span>
                        <Badge variant={user.role === "mp" ? "default" : "secondary"} className="text-[10px] rounded-lg">
                          {roleLabels[user.role]}
                        </Badge>
                        {user.role === "mp" && (
                          <Badge
                            variant={user.is_approved ? "default" : "destructive"}
                            className={`text-[10px] rounded-lg ${user.is_approved ? "bg-success/10 text-success border-success/20" : ""}`}
                          >
                            {user.is_approved ? t("admin_dashboard.approved") : t("admin_dashboard.pending_approval")}
                          </Badge>
                        )}
                        {isBanned(user) && (
                          <Badge variant="destructive" className="text-[10px] rounded-lg">
                            {t("admin_dashboard.filter_banned")}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">{user.phone}</span>
                        {user.registration_number && (
                          <span className="text-xs text-muted-foreground">{user.registration_number}</span>
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
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {/* Role Dropdown */}
                    <Select
                      value={user.role}
                      onValueChange={(val) => handleRoleChange(user.user_id, val as AppRole)}
                      disabled={updatingRole === user.user_id}
                    >
                      <SelectTrigger className="w-[110px] h-9 rounded-lg text-xs border-border/50">
                        {updatingRole === user.user_id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <SelectValue />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="citizen">{t("admin_dashboard.role_citizen")}</SelectItem>
                        <SelectItem value="mp">{t("admin_dashboard.role_mp")}</SelectItem>
                        <SelectItem value="moderator">{t("admin_dashboard.role_moderator")}</SelectItem>
                        <SelectItem value="admin">{t("admin_dashboard.role_admin")}</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* MP Approval */}
                    {user.role === "mp" && !user.is_approved && (
                      <>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button size="sm" className="gap-1.5 bg-gradient-to-l from-success to-primary text-white hover:opacity-90 text-xs h-9 rounded-xl shadow-md"
                            disabled={approving === user.user_id}
                            onClick={() => handleApproveMP(user.user_id, true)}>
                            {approving === user.user_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            {t("admin_dashboard.approve")}
                          </Button>
                        </motion.div>
                        <Button size="sm" variant="outline" className="gap-1.5 text-destructive border-destructive/20 text-xs h-9 rounded-xl hover:bg-destructive/5"
                          disabled={approving === user.user_id}
                          onClick={() => handleApproveMP(user.user_id, false)}>
                          <XCircle className="w-3.5 h-3.5" /> {t("admin_dashboard.revoke")}
                        </Button>
                      </>
                    )}

                    {/* Delete Account */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-destructive hover:bg-destructive/10 rounded-xl"
                          disabled={deletingUser === user.user_id}>
                          {deletingUser === user.user_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("admin_dashboard.delete_confirm_title")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("admin_dashboard.delete_confirm_message")}
                            <br />
                            <strong>{user.full_name}</strong> — {user.phone}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteUser(user.user_id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {t("common.delete")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </motion.div>
              ))}
              {filteredUsers.length === 0 && (
                <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl text-center py-16">
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <Search className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium text-sm">{t("admin_dashboard.no_users")}</p>
                </div>
              )}
            </div>
          </>
        ) : activeTab === "issues" ? (
          <>
            {/* Issue Search */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-5 mb-6">
              <div className="relative">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={issueSearchQuery} onChange={(e) => setIssueSearchQuery(e.target.value)} placeholder={t("admin_dashboard.search_issues")} className="pr-11 text-right h-11 rounded-xl border-border/50 bg-background/50" />
              </div>
            </motion.div>

            <div className="space-y-3">
              {filteredIssues.map((issue, i) => (
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
                          {issue.status === "resolved" ? t("mp_dashboard.resolved") : issue.status === "in-progress" ? t("mp_dashboard.in_progress") : t("mp_dashboard.received")}
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
              {filteredIssues.length === 0 && (
                <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl text-center py-16">
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <Search className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium text-sm">{t("mp_dashboard.no_results")}</p>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Analytics Tab */
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: t("admin_dashboard.total_issues"), value: totalIssues, icon: FileText, color: "text-accent", bg: "from-accent/10 to-accent/5" },
              { label: t("mp_dashboard.resolved"), value: resolvedIssues, icon: CheckCircle2, color: "text-success", bg: "from-success/10 to-success/5" },
              { label: t("mp_dashboard.in_progress"), value: issues.filter((i) => i.status === "in-progress").length, icon: Clock, color: "text-warning", bg: "from-warning/10 to-warning/5" },
              { label: t("admin_dashboard.open_issues"), value: issues.filter((i) => i.status === "received").length, icon: AlertCircle, color: "text-info", bg: "from-info/10 to-info/5" },
              { label: t("admin_dashboard.collective_issues"), value: issues.filter((i) => i.issue_type === "collective").length, icon: Users, color: "text-accent", bg: "from-accent/10 to-primary/5" },
              { label: t("admin_dashboard.citizen_confirmed"), value: issues.filter((i) => i.citizen_confirmed).length, icon: CheckCircle2, color: "text-primary", bg: "from-primary/10 to-primary/5" },
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
