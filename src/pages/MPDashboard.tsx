import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import IssueCard from "@/components/IssueCard";
import ChatDrawer from "@/components/ChatDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { sendPushToUser } from "@/lib/pushNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Search, Filter, BarChart3, AlertCircle, CheckCircle2, Clock, Loader2,
  X, Users, User, FileText, TrendingUp, PieChart, MessageCircle, Phone
} from "lucide-react";
import type { Issue } from "@/components/IssueCard";
import type { IssueStatus } from "@/components/StatusBadge";

interface ActionLog {
  id: string;
  action_type: string;
  note: string | null;
  created_at: string;
}

const MPDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | IssueStatus>("all");
  const [selectedType, setSelectedType] = useState<"all" | "individual" | "collective">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [newStatus, setNewStatus] = useState<IssueStatus>("received");
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
  const [updating, setUpdating] = useState(false);
  const [chatIssue, setChatIssue] = useState<Issue | null>(null);
  const [citizenPhones, setCitizenPhones] = useState<Record<string, string>>({});

  const categories = [
    { key: "all", label: t("categories.all") },
    { key: "مياه", label: t("categories.water") },
    { key: "طرق", label: t("categories.roads") },
    { key: "مرافق عامة", label: t("categories.public_facilities") },
    { key: "صحة", label: t("categories.health") },
    { key: "نظافة", label: t("categories.sanitation") },
    { key: "تعليم", label: t("categories.education") },
    { key: "كهرباء", label: t("categories.electricity") },
    { key: "أخرى", label: t("categories.other") },
  ];

  const fetchIssues = async () => {
    let mpGovernorate: string | null = null;
    if (user) {
      const { data: mpProfile } = await supabase
        .from("profiles")
        .select("governorate, constituency")
        .eq("user_id", user.id)
        .single();
      if (mpProfile) {
        mpGovernorate = mpProfile.governorate;
      }
    }

    let query = supabase.from("issues").select("*").order("created_at", { ascending: false });
    const { data } = await query;
    
    if (data) {
      const filtered = mpGovernorate
        ? data.filter((d) => 
            d.location?.includes(mpGovernorate!) || 
            d.assigned_mp_id === user?.id ||
            !d.assigned_mp_id
          )
        : data;

      setIssues(filtered.map((d) => ({
        id: d.id, title: d.title, description: d.description,
        status: d.status as Issue["status"], category: d.category,
        location: d.location, timeAgo: new Date(d.created_at).toLocaleDateString("ar-EG"),
        issue_type: (d as any).issue_type || "individual",
        is_flagged: (d as any).is_flagged || false,
        citizen_confirmed: (d as any).citizen_confirmed || false,
        ai_summary: d.ai_summary || undefined, user_id: d.user_id,
      })));
    }
    setLoading(false);
  };

  const fetchCitizenPhone = async (userId: string) => {
    if (citizenPhones[userId]) return citizenPhones[userId];
    const { data } = await supabase.from("profiles").select("phone").eq("user_id", userId).single();
    if (data) {
      setCitizenPhones((prev) => ({ ...prev, [userId]: data.phone }));
      return data.phone;
    }
    return undefined;
  };

  useEffect(() => { fetchIssues(); }, [user]);

  const fetchActionLogs = async (issueId: string) => {
    const { data } = await supabase.from("issue_actions").select("*").eq("issue_id", issueId).order("created_at", { ascending: false });
    if (data) setActionLogs(data);
  };

  const openIssueDetail = (issue: Issue) => {
    setSelectedIssue(issue);
    setNewStatus(issue.status);
    setActionNote("");
    fetchActionLogs(issue.id);
  };

  const handleUpdateStatus = async () => {
    if (!selectedIssue || !user) return;
    setUpdating(true);
    try {
      const { error } = await supabase.from("issues").update({
        status: newStatus, mp_notes: actionNote || undefined, assigned_mp_id: user.id,
      }).eq("id", selectedIssue.id);
      if (error) throw error;

      await supabase.from("issue_actions").insert({
        issue_id: selectedIssue.id, user_id: user.id,
        action_type: `status_change_to_${newStatus}`,
        note: actionNote || `${t("mp_dashboard.update_status")}: ${newStatus === "received" ? t("mp_dashboard.received") : newStatus === "in-progress" ? t("mp_dashboard.in_progress") : t("mp_dashboard.resolved")}`,
      });

      const { data: issueData } = await supabase.from("issues").select("user_id, title").eq("id", selectedIssue.id).single();
      if (issueData) {
        const statusLabel = newStatus === "resolved" ? t("mp_dashboard.resolved") : newStatus === "in-progress" ? t("mp_dashboard.in_progress") : t("mp_dashboard.received");
        const notifMessage = `${issueData.title}: ${actionNote || statusLabel}`;
        await supabase.from("notifications").insert({
          user_id: issueData.user_id, title: statusLabel,
          message: notifMessage, issue_id: selectedIssue.id,
        });
        sendPushToUser(issueData.user_id, statusLabel, notifMessage, { issue_id: selectedIssue.id });
      }

      toast.success(t("mp_dashboard.status_updated"));
      setSelectedIssue(null);
      fetchIssues();
    } catch (err: any) {
      toast.error(err.message || t("mp_dashboard.error_update"));
    } finally {
      setUpdating(false);
    }
  };

  const filteredIssues = issues.filter((issue) => {
    const matchesCategory = selectedCategory === "all" || issue.category === selectedCategory;
    const matchesStatus = selectedStatus === "all" || issue.status === selectedStatus;
    const matchesType = selectedType === "all" || issue.issue_type === selectedType;
    const matchesSearch = !searchQuery || issue.title.includes(searchQuery) || issue.description.includes(searchQuery) || issue.id.includes(searchQuery);
    return matchesCategory && matchesStatus && matchesType && matchesSearch;
  });

  const totalIssues = issues.length;
  const resolvedCount = issues.filter((i) => i.status === "resolved").length;
  const pendingCount = issues.filter((i) => i.status === "received").length;
  const inProgressCount = issues.filter((i) => i.status === "in-progress").length;
  const confirmedCount = issues.filter((i) => i.citizen_confirmed).length;
  const collectiveCount = issues.filter((i) => i.issue_type === "collective").length;
  const resolutionRate = totalIssues > 0 ? Math.round((resolvedCount / totalIssues) * 100) : 0;

  const statCards = [
    { label: t("mp_dashboard.total_issues"), value: totalIssues, icon: BarChart3, color: "text-accent", bg: "from-accent/10 to-accent/5" },
    { label: t("mp_dashboard.pending"), value: pendingCount, icon: AlertCircle, color: "text-warning", bg: "from-warning/10 to-warning/5" },
    { label: t("mp_dashboard.processing"), value: inProgressCount, icon: Clock, color: "text-info", bg: "from-info/10 to-info/5" },
    { label: t("mp_dashboard.completed"), value: resolvedCount, icon: CheckCircle2, color: "text-success", bg: "from-success/10 to-success/5" },
  ];

  const analyticsCards = [
    { label: t("mp_dashboard.resolution_rate"), value: `${resolutionRate}%`, icon: TrendingUp, color: "text-success" },
    { label: t("mp_dashboard.collective_issues"), value: collectiveCount, icon: Users, color: "text-accent" },
    { label: t("mp_dashboard.citizen_confirmed"), value: confirmedCount, icon: CheckCircle2, color: "text-primary" },
    { label: t("mp_dashboard.top_category"), value: getMostCommonCategory(), icon: PieChart, color: "text-warning" },
  ];

  function getMostCommonCategory() {
    if (issues.length === 0) return "-";
    const counts: Record<string, number> = {};
    issues.forEach((i) => { counts[i.category] = (counts[i.category] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
  }

  const statusFilters: { key: "all" | IssueStatus; label: string }[] = [
    { key: "all", label: t("mp_dashboard.filter_all") },
    { key: "received", label: t("mp_dashboard.received") },
    { key: "in-progress", label: t("mp_dashboard.in_progress") },
    { key: "resolved", label: t("mp_dashboard.resolved") },
  ];

  const actionTypeLabels: Record<string, string> = {
    status_change_to_received: t("mp_dashboard.status_received"),
    status_change_to_in_progress: t("mp_dashboard.status_in_progress"),
    "status_change_to_in-progress": t("mp_dashboard.status_in_progress"),
    status_change_to_resolved: t("mp_dashboard.status_resolved"),
    citizen_confirmed: t("mp_dashboard.citizen_confirm_action"),
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-accent/[0.04] blur-3xl" />
        <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.3, 0.15] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} className="absolute -bottom-40 -right-40 w-[400px] h-[400px] rounded-full bg-primary/[0.04] blur-3xl" />
      </div>

      <AppHeader />
      <div className="container py-6 md:py-8 px-4 relative z-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1 tracking-tight">{t("mp_dashboard.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("mp_dashboard.subtitle")}</p>
        </motion.div>

        {/* Main Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4">
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
                  <div className="text-[10px] md:text-xs text-muted-foreground font-medium">{stat.label}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Analytics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          {analyticsCards.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.06 }}
              className="bg-card/60 backdrop-blur-sm border border-border/30 p-3 md:p-4 rounded-xl hover:bg-card/80 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                <span className="text-[10px] md:text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <div className="text-lg md:text-xl font-bold text-foreground">{stat.value}</div>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-5 mb-6"
        >
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t("mp_dashboard.search_placeholder")} className="pr-11 text-right h-11 rounded-xl border-border/50 bg-background/50" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {statusFilters.map((sf) => (
                <Button key={sf.key} variant={selectedStatus === sf.key ? "secondary" : "ghost"} size="sm" onClick={() => setSelectedStatus(sf.key)} className="text-xs h-9 rounded-lg">
                  {sf.label}
                </Button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap pt-3 border-t border-border/30">
              <Filter className="w-4 h-4 text-muted-foreground mt-1" />
              {categories.map((cat) => (
                <Button key={cat.key} variant={selectedCategory === cat.key ? "secondary" : "ghost"} size="sm" onClick={() => setSelectedCategory(cat.key)} className="text-xs h-9 rounded-lg">
                  {cat.label}
                </Button>
              ))}
            </div>
            <div className="flex gap-2 pt-3 border-t border-border/30">
              <Button variant={selectedType === "all" ? "secondary" : "ghost"} size="sm" onClick={() => setSelectedType("all")} className="gap-1 text-xs h-9 rounded-lg">{t("mp_dashboard.filter_all")}</Button>
              <Button variant={selectedType === "individual" ? "secondary" : "ghost"} size="sm" onClick={() => setSelectedType("individual")} className="gap-1 text-xs h-9 rounded-lg">
                <User className="w-3 h-3" /> {t("mp_dashboard.filter_individual")}
              </Button>
              <Button variant={selectedType === "collective" ? "secondary" : "ghost"} size="sm" onClick={() => setSelectedType("collective")} className="gap-1 text-xs h-9 rounded-lg">
                <Users className="w-3 h-3" /> {t("mp_dashboard.filter_collective")}
              </Button>
            </div>
          </div>
        </motion.div>

        <div className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent" />
          {t("mp_dashboard.showing", { count: filteredIssues.length, total: totalIssues })}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-accent" />
            <span className="text-sm text-muted-foreground">{t("common.loading")}</span>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {filteredIssues.map((issue, i) => (
              <motion.div key={issue.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <IssueCard issue={issue} onClick={() => openIssueDetail(issue)} />
              </motion.div>
            ))}
            {filteredIssues.length === 0 && (
              <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl text-center py-16">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Search className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">{t("mp_dashboard.no_results")}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Issue Detail Modal */}
      <AnimatePresence>
        {selectedIssue && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-md z-50 flex items-end md:items-center justify-center"
            onClick={() => setSelectedIssue(null)}>
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-t-3xl md:rounded-3xl p-6 md:p-7 w-full md:max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent to-info flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground">{t("mp_dashboard.issue_details")}</h2>
                </div>
                <button onClick={() => setSelectedIssue(null)} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h3 className="font-bold text-foreground mb-2 text-lg">{selectedIssue.title}</h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{selectedIssue.description}</p>
              {selectedIssue.ai_summary && (
                <p className="text-xs text-accent bg-accent/[0.06] border border-accent/10 rounded-xl p-3 mb-4">✨ {selectedIssue.ai_summary}</p>
              )}

              <div className="space-y-4 mb-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground block">{t("mp_dashboard.update_status")}</label>
                  <Select value={newStatus} onValueChange={(v) => setNewStatus(v as IssueStatus)}>
                    <SelectTrigger className="h-11 rounded-xl border-border/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="received">{t("mp_dashboard.received")}</SelectItem>
                      <SelectItem value="in-progress">{t("mp_dashboard.in_progress")}</SelectItem>
                      <SelectItem value="resolved">{t("mp_dashboard.resolved")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground block">{t("mp_dashboard.add_note")}</label>
                  <Textarea value={actionNote} onChange={(e) => setActionNote(e.target.value)} placeholder={t("mp_dashboard.note_placeholder")} rows={3} className="text-right rounded-xl border-border/50" />
                </div>
                <Button onClick={handleUpdateStatus} disabled={updating} className="w-full gap-2.5 bg-gradient-to-l from-accent to-info text-white hover:opacity-90 h-12 rounded-xl font-semibold shadow-lg shadow-accent/20">
                  {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  {t("mp_dashboard.update")}
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (selectedIssue?.user_id) { await fetchCitizenPhone(selectedIssue.user_id); }
                    setChatIssue(selectedIssue);
                    setSelectedIssue(null);
                  }}
                  className="w-full gap-2 h-11 rounded-xl border-border/50 hover:border-accent/30"
                >
                  <MessageCircle className="w-4 h-4 text-accent" />
                  {t("mp_dashboard.start_chat")}
                </Button>
              </div>

              <div className="border-t border-border/30 pt-5">
                <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-accent" /> {t("mp_dashboard.action_log")}
                </h4>
                {actionLogs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("mp_dashboard.no_actions")}</p>
                ) : (
                  <div className="space-y-2">
                    {actionLogs.map((log) => (
                      <div key={log.id} className="bg-muted/50 rounded-xl p-3 text-xs border border-border/20">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-foreground">{actionTypeLabels[log.action_type] || log.action_type}</span>
                          <span className="text-muted-foreground">{new Date(log.created_at).toLocaleDateString("ar-EG")}</span>
                        </div>
                        {log.note && <p className="text-muted-foreground">{log.note}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Drawer */}
      <AnimatePresence>
        {chatIssue && chatIssue.user_id && (
          <ChatDrawer
            issueId={chatIssue.id}
            issueTitle={chatIssue.title}
            citizenUserId={chatIssue.user_id}
            citizenPhone={citizenPhones[chatIssue.user_id]}
            isMP={true}
            onClose={() => setChatIssue(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MPDashboard;
