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
  X, Users, User, FileText, TrendingUp, PieChart, MessageCircle, Phone,
  LayoutDashboard, List
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MPAnalyticsSuite from "@/components/MPAnalyticsSuite";
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
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.04, 0.08, 0.04] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-accent blur-3xl" />
        <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.04, 0.08, 0.04] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} className="absolute -bottom-40 -right-40 w-[400px] h-[400px] rounded-full bg-primary blur-3xl" />
      </div>

      <AppHeader />
      <div className="container py-6 md:py-8 px-4 relative z-10">
        <Tabs defaultValue="list" className="space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1 tracking-tight">{t("mp_dashboard.title")}</h1>
              <p className="text-muted-foreground text-sm">{t("mp_dashboard.subtitle")}</p>
            </motion.div>
            <TabsList className="bg-card/50 backdrop-blur-sm border-accent/20 p-1">
              <TabsTrigger value="list" className="gap-2 data-[state=active]:bg-accent">
                <List className="w-4 h-4" />
                قائمة الشكاوى
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2 data-[state=active]:bg-accent">
                <LayoutDashboard className="w-4 h-4" />
                مركز التحليلات
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="analytics">
            <MPAnalyticsSuite issues={issues} mpName={user?.email || "النائب"} />
          </TabsContent>

          <TabsContent value="list" className="space-y-8">
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
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t("mp_dashboard.search")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>{t("categories.all")}</SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.key} value={cat.key}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedStatus} onValueChange={(val) => setSelectedStatus(val as any)}>
                  <SelectTrigger>{t("mp_dashboard.filter_all")}</SelectTrigger>
                  <SelectContent>
                    {statusFilters.map((filter) => (
                      <SelectItem key={filter.key} value={filter.key}>{filter.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedType} onValueChange={(val) => setSelectedType(val as any)}>
                  <SelectTrigger>{t("mp_dashboard.filter_all")}</SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("mp_dashboard.filter_all")}</SelectItem>
                    <SelectItem value="individual">{t("issue_card.individual")}</SelectItem>
                    <SelectItem value="collective">{t("issue_card.collective")}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedPriority} onValueChange={(val) => setSelectedPriority(val as any)}>
                  <SelectTrigger>جميع الأولويات</SelectTrigger>
                  <SelectContent>
                    {priorityFilters.map((filter) => (
                      <SelectItem key={filter.key} value={filter.key}>{filter.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <p className="text-sm text-muted-foreground mt-4">
                {t("mp_dashboard.showing")} <span className="font-semibold text-foreground">{filteredIssues.length}</span> {t("mp_dashboard.of")} <span className="font-semibold text-foreground">{totalIssues}</span> {t("mp_dashboard.issues")}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <AnimatePresence mode="popLayout">
                {filteredIssues.map((issue) => (
                  <motion.div
                    key={issue.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <IssueCard
                      issue={issue}
                      onClick={() => openIssueDetail(issue)}
                      isMPView
                      citizenPhone={citizenPhones[issue.user_id]}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {filteredIssues.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 bg-card/30 border border-dashed border-border/50 rounded-3xl"
              >
                <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground">{t("mp_dashboard.no_issues")}</h3>
                <p className="text-muted-foreground">{t("mp_dashboard.no_issues_desc")}</p>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>

        <AnimatePresence>
          {selectedIssue && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-card border border-border shadow-2xl rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
              >
                <div className="p-6 border-b border-border/50 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-foreground">{t("mp_dashboard.issue_details")}</h2>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedIssue(null)} className="rounded-full">
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="overflow-y-auto p-6 space-y-8">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">{t("issue_card.title")}</h3>
                      <p className="text-lg font-semibold text-foreground">{selectedIssue.refined_title || selectedIssue.title}</p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">{t("issue_card.description")}</h3>
                      <div className="bg-muted/30 rounded-2xl p-4 text-foreground whitespace-pre-wrap leading-relaxed">
                        {selectedIssue.refined_description || selectedIssue.description}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted/20 rounded-xl p-3">
                        <p className="text-xs text-muted-foreground mb-1">{t("issue_card.category")}</p>
                        <p className="font-medium text-foreground">{selectedIssue.category}</p>
                      </div>
                      <div className="bg-muted/20 rounded-xl p-3">
                        <p className="text-xs text-muted-foreground mb-1">{t("issue_card.location")}</p>
                        <p className="font-medium text-foreground">{selectedIssue.location}</p>
                      </div>
                    </div>

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

        {chatIssue && (
          <ChatDrawer
            issueId={chatIssue.id}
            issueTitle={chatIssue.title}
            citizenUserId={chatIssue.user_id || ""}
            isMP={true}
            onClose={() => setChatIssue(null)}
          />
        )}
      </div>
    </div>
  );
};

export default MPDashboard;
