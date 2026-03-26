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
  const [selectedPriority, setSelectedPriority] = useState<"all" | "urgent" | "humanitarian" | "normal">("all");
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
        id: d.id,
        title: d.title,
        description: d.description,
        refined_title: (d as any).refined_title || d.title,
        refined_description: (d as any).refined_description || d.description,
        status: d.status as Issue["status"],
        category: d.category,
        location: d.location,
        timeAgo: new Date(d.created_at).toLocaleDateString("ar-EG"),
        issue_type: (d as any).issue_type || "individual",
        is_flagged: (d as any).is_flagged || false,
        citizen_confirmed: (d as any).citizen_confirmed || false,
        ai_summary: d.ai_summary || undefined,
        priority: (d as any).priority || "normal",
        user_id: d.user_id,
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
    const matchesPriority = selectedPriority === "all" || issue.priority === selectedPriority;
    const matchesSearch = !searchQuery || issue.title.includes(searchQuery) || issue.description.includes(searchQuery) || issue.id.includes(searchQuery);
    return matchesCategory && matchesStatus && matchesType && matchesPriority && matchesSearch;
  });

  const totalIssues = issues.length;
  const resolvedCount = issues.filter((i) => i.status === "resolved").length;
  const pendingCount = issues.filter((i) => i.status === "received").length;
  const inProgressCount = issues.filter((i) => i.status === "in-progress").length;
  const confirmedCount = issues.filter((i) => i.citizen_confirmed).length;
  const collectiveCount = issues.filter((i) => i.issue_type === "collective").length;
  const urgentCount = issues.filter((i) => i.priority === "urgent").length;
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
    { label: "الشكاوى الضرورية", value: urgentCount, icon: AlertCircle, color: "text-destructive" },
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

  const priorityFilters: { key: "all" | "urgent" | "humanitarian" | "normal"; label: string }[] = [
    { key: "all", label: "جميع الأولويات" },
    { key: "urgent", label: "🔴 ضروري" },
    { key: "humanitarian", label: "⚠️ إنساني" },
    { key: "normal", label: "عادي" },
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
              className={`bg-gradient-to-br ${stat.bg} border border-border/50 rounded-2xl p-4 md:p-5`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-xs md:text-sm font-medium">{stat.label}</p>
                  <p className="text-2xl md:text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`w-8 h-8 md:w-10 md:h-10 ${stat.color} opacity-20`} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          {analyticsCards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (i + 4) * 0.08 }}
              className="bg-card/50 border border-border/50 rounded-2xl p-4 md:p-5 text-center"
            >
              <card.icon className={`w-6 h-6 md:w-8 md:h-8 ${card.color} mx-auto mb-2`} />
              <p className="text-muted-foreground text-xs md:text-sm">{card.label}</p>
              <p className="text-xl md:text-2xl font-bold text-foreground mt-1">{card.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card/50 border border-border/50 rounded-2xl p-4 md:p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-foreground">{t("mp_dashboard.filters")}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("mp_dashboard.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>{t("categories.all")}</SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.key} value={cat.key}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={(val) => setSelectedStatus(val as any)}>
              <SelectTrigger>{t("mp_dashboard.filter_all")}</SelectTrigger>
              <SelectContent>
                {statusFilters.map((filter) => (
                  <SelectItem key={filter.key} value={filter.key}>{filter.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={selectedType} onValueChange={(val) => setSelectedType(val as any)}>
              <SelectTrigger>{t("mp_dashboard.filter_all")}</SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("mp_dashboard.filter_all")}</SelectItem>
                <SelectItem value="individual">{t("issue_card.individual")}</SelectItem>
                <SelectItem value="collective">{t("issue_card.collective")}</SelectItem>
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select value={selectedPriority} onValueChange={(val) => setSelectedPriority(val as any)}>
              <SelectTrigger>جميع الأولويات</SelectTrigger>
              <SelectContent>
                {priorityFilters.map((filter) => (
                  <SelectItem key={filter.key} value={filter.key}>{filter.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Results Count */}
          <p className="text-sm text-muted-foreground mt-4">
            {t("mp_dashboard.showing")} <span className="font-semibold text-foreground">{filteredIssues.length}</span> {t("mp_dashboard.of")} <span className="font-semibold text-foreground">{totalIssues}</span> {t("mp_dashboard.issues")}
          </p>
        </motion.div>

        {/* Issues Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : filteredIssues.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">{t("mp_dashboard.no_issues")}</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
          >
            <AnimatePresence>
              {filteredIssues.map((issue, i) => (
                <motion.div
                  key={issue.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <IssueCard issue={issue} onClick={() => openIssueDetail(issue)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Issue Detail Modal */}
        <AnimatePresence>
          {selectedIssue && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedIssue(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-card border border-border/50 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6 md:p-8">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-foreground mb-2">{selectedIssue.refined_title || selectedIssue.title}</h2>
                      <div className="flex items-center gap-2 flex-wrap">
                        {selectedIssue.priority === "urgent" && (
                          <span className="px-3 py-1 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold">🔴 ضروري</span>
                        )}
                        {selectedIssue.priority === "humanitarian" && (
                          <span className="px-3 py-1 rounded-lg bg-orange-500/10 text-orange-600 text-xs font-semibold">⚠️ إنساني</span>
                        )}
                        <span className="px-3 py-1 rounded-lg bg-muted text-muted-foreground text-xs">{selectedIssue.category}</span>
                        {selectedIssue.issue_type === "collective" && (
                          <span className="px-3 py-1 rounded-lg bg-accent/10 text-accent text-xs">جماعي</span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => setSelectedIssue(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="space-y-6">
                    {/* Description */}
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">{t("mp_dashboard.description")}</h3>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{selectedIssue.refined_description || selectedIssue.description}</p>
                    </div>

                    {/* AI Summary */}
                    {selectedIssue.ai_summary && (
                      <div className="bg-accent/[0.06] border border-accent/20 rounded-xl p-4">
                        <p className="text-sm text-accent">✨ <span className="font-semibold">{t("mp_dashboard.ai_summary")}:</span> {selectedIssue.ai_summary}</p>
                      </div>
                    )}

                    {/* Issue Details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">{t("mp_dashboard.location")}</p>
                        <p className="text-foreground font-semibold">{selectedIssue.location || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">{t("mp_dashboard.date")}</p>
                        <p className="text-foreground font-semibold">{selectedIssue.timeAgo}</p>
                      </div>
                    </div>

                    {/* Action Logs */}
                    {actionLogs.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-foreground mb-3">{t("mp_dashboard.action_history")}</h3>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {actionLogs.map((log) => (
                            <div key={log.id} className="text-xs bg-muted/50 rounded-lg p-2">
                              <p className="font-semibold text-foreground">{actionTypeLabels[log.action_type] || log.action_type}</p>
                              {log.note && <p className="text-muted-foreground">{log.note}</p>}
                              <p className="text-xs text-muted-foreground/70">{new Date(log.created_at).toLocaleString("ar-EG")}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Update Status Form */}
                    <div className="border-t border-border/50 pt-6">
                      <h3 className="font-semibold text-foreground mb-4">{t("mp_dashboard.update_status")}</h3>
                      <div className="space-y-4">
                        <Select value={newStatus} onValueChange={(val) => setNewStatus(val as IssueStatus)}>
                          <SelectTrigger>{newStatus}</SelectTrigger>
                          <SelectContent>
                            {statusFilters.map((filter) => (
                              <SelectItem key={filter.key} value={filter.key}>{filter.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Textarea
                          placeholder={t("mp_dashboard.add_note")}
                          value={actionNote}
                          onChange={(e) => setActionNote(e.target.value)}
                          className="min-h-24"
                        />

                        <div className="flex gap-3">
                          <Button
                            onClick={handleUpdateStatus}
                            disabled={updating}
                            className="flex-1 bg-accent hover:bg-accent/90"
                          >
                            {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            {t("mp_dashboard.save_changes")}
                          </Button>
                          <Button
                            onClick={() => setSelectedIssue(null)}
                            variant="outline"
                            className="flex-1"
                          >
                            {t("common.cancel")}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Chat Button */}
                    <Button
                      onClick={() => {
                        setChatIssue(selectedIssue);
                        setSelectedIssue(null);
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      {t("mp_dashboard.open_chat")}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Drawer */}
        {chatIssue && (
          <ChatDrawer
            issue={chatIssue}
            onClose={() => setChatIssue(null)}
          />
        )}
      </div>
    </div>
  );
};

export default MPDashboard;
