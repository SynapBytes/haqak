import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import IssueCard from "@/components/IssueCard";
import ChatDrawer from "@/components/ChatDrawer";
import OfficialDocumentGenerator from "@/components/OfficialDocumentGenerator";
import AttachmentManager from "@/components/AttachmentManager";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { dispatchNotification } from "@/lib/notifications";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Search, Filter, AlertCircle,
  X, Users, User, FileText, TrendingUp, PieChart, MessageCircle,
  LayoutDashboard, List, ShieldCheck, Send
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MPAnalyticsSuite from "@/components/MPAnalyticsSuite";
import { AIEarlyWarningSystem } from "@/components/AIEarlyWarningSystem";
import { GISHeatmap } from "@/components/GISHeatmap";
import { BlockchainAuditTrail } from "@/components/BlockchainAuditTrail";
import { DigitalTwinIntegration } from "@/components/DigitalTwinIntegration";
import { PredictiveCrisisEngine } from "@/components/PredictiveCrisisEngine";
import { SmartContractsAccountability } from "@/components/SmartContractsAccountability";
import { UnifiedNationalIDIntegration } from "@/components/UnifiedNationalIDIntegration";
import MPEngagementPanel from "@/components/MPEngagementPanel";
import MPPublicPostsManager from "@/components/MPPublicPostsManager";
import type { Issue } from "@/components/IssueCard";
import type { IssueStatus } from "@/components/StatusBadge";
import { IssueGridSkeleton } from "@/components/ListSkeletons";

interface ActionLog {
  id: string;
  action_type: string;
  note: string | null;
  created_at: string;
}

interface MPResponse {
  id: string;
  response_text: string;
  created_at: string;
}

const sanitizeLocationTerm = (value: string) =>
  value.replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s+/g, " ").trim();

const MPDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | IssueStatus>("all");
  const [selectedType, setSelectedType] = useState<"all" | "individual" | "collective">("all");
  const [selectedPriority, setSelectedPriority] = useState<"all" | "urgent" | "humanitarian" | "normal">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [newStatus, setNewStatus] = useState<IssueStatus>("received");
  const [chatIssue, setChatIssue] = useState<Issue | null>(null);
  const [mpResponses, setMpResponses] = useState<MPResponse[]>([]);
  const [responsesState, setResponsesState] = useState<"loading" | "ready" | "empty" | "coming-soon">("empty");

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

  const profileQuery = useQuery({
    queryKey: ["mp-profile-scope", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("governorate, constituency")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const issuesQuery = useQuery({
    queryKey: ["mp-issues", user?.id, profileQuery.data?.governorate, profileQuery.data?.constituency],
    enabled: !!user && profileQuery.isSuccess,
    queryFn: async () => {
      const locationTerms = [
        sanitizeLocationTerm(profileQuery.data?.governorate ?? ""),
        sanitizeLocationTerm(profileQuery.data?.constituency ?? ""),
      ].filter((term) => term.length >= 2);

      const assignedIssuesPromise = supabase
        .from("issues")
        .select("*")
        .or(`assigned_mp_id.eq.${user!.id},assigned_mp_id.is.null`);

      const locationIssuePromises = locationTerms.map((term) =>
        supabase.from("issues").select("*").ilike("location", `%${term}%`),
      );

      const [assignedIssuesResult, ...locationIssueResults] = await Promise.all([
        assignedIssuesPromise,
        ...locationIssuePromises,
      ]);

      if (assignedIssuesResult.error) throw assignedIssuesResult.error;
      locationIssueResults.forEach((result) => {
        if (result.error) throw result.error;
      });

      const combined = [...(assignedIssuesResult.data ?? [])];
      locationIssueResults.forEach((result) => {
        if (result.data?.length) {
          combined.push(...result.data);
        }
      });

      const dedupedById = new Map<string, (typeof combined)[number]>();
      combined.forEach((row) => {
        dedupedById.set(row.id, row);
      });
      const data = Array.from(dedupedById.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      return (data ?? []).map((d) => {
        const row = d as Record<string, unknown>;
        return {
          id: d.id,
          title: d.title,
          description: d.description,
          refined_title: (row.refined_title as string) || d.title,
          refined_description: (row.refined_description as string) || d.description,
          status: d.status as Issue["status"],
          category: d.category,
          location: d.location,
          timeAgo: d.created_at,
          issue_type: (d.issue_type || "individual") as Issue["issue_type"],
          is_flagged: d.is_flagged || false,
          citizen_confirmed: d.citizen_confirmed || false,
          ai_summary: d.ai_summary || undefined,
          priority: ((row.priority as string) || "normal") as Issue["priority"],
          user_id: d.user_id,
        } satisfies Issue;
      });
    },
  });

  const centerAggregateQuery = useQuery({
    queryKey: ["mp-center-citizens-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_mp_center_citizens_count");
      if (error) throw error;
      return Number(data ?? 0);
    },
  });

  const actionLogsQuery = useQuery({
    queryKey: ["mp-issue-actions", selectedIssue?.id],
    enabled: !!selectedIssue,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issue_actions")
        .select("*")
        .eq("issue_id", selectedIssue!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ActionLog[];
    },
  });

  const issues = issuesQuery.data ?? [];
  const actionLogs = actionLogsQuery.data ?? [];
  const centerCitizensCount = centerAggregateQuery.data ?? 0;
  const loading = issuesQuery.isLoading || profileQuery.isLoading;

  const fetchResponses = async (issueId: string) => {
    setResponsesState("loading");
    const { data, error } = await supabase
      .from("issue_actions")
      .select("id, note, created_at")
      .eq("issue_id", issueId)
      .eq("action_type", "official_response")
      .order("created_at", { ascending: false });

    if (error) {
      setMpResponses([]);
      setResponsesState("coming-soon");
      return;
    }

    const responses = (data ?? [])
      .filter((item) => typeof item.note === "string" && item.note.trim().length > 0)
      .map((item) => ({
        id: item.id,
        response_text: item.note as string,
        created_at: item.created_at,
      }));
    setMpResponses(responses);
    setResponsesState(responses.length > 0 ? "ready" : "empty");
  };

  const openIssueDetail = (issue: Issue) => {
    setSelectedIssue(issue);
    setNewStatus(issue.status);
    setActionNote("");
    fetchResponses(issue.id);
  };

  const updateStatusMutation = useMutation({
    mutationFn: async () => {
      if (!selectedIssue || !user) return;
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
        await dispatchNotification({
          recipients: [issueData.user_id],
          issueId: selectedIssue.id,
          event: "status_changed",
          status: statusLabel,
        });
      }
    },
    onSuccess: async () => {
      toast.success(t("mp_dashboard.status_updated"));
      setSelectedIssue(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["mp-issues", user?.id] }),
        queryClient.invalidateQueries({ queryKey: ["mp-issue-actions"] }),
      ]);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t("mp_dashboard.error_update"));
    },
  });

  const handleUpdateStatus = async () => {
    await updateStatusMutation.mutateAsync();
  };

  const addOfficialResponseMutation = useMutation({
    mutationFn: async () => {
      if (!selectedIssue || !user || !actionNote) return;
      // mp_responses table not yet created – use issue_actions as alternative
      await supabase.from("issue_actions").insert({
        issue_id: selectedIssue.id,
        user_id: user.id,
        action_type: "official_response",
        note: actionNote,
      });
    },
    onSuccess: async () => {
      toast.success("تم إرسال الرد الرسمي بنجاح");
      if (selectedIssue) {
        fetchResponses(selectedIssue.id);
      }
      setActionNote("");
      await queryClient.invalidateQueries({ queryKey: ["mp-issue-actions"] });
    },
    onError: () => {
      toast.error("فشل إرسال الرد");
    },
  });

  const handleAddOfficialResponse = async () => {
    await addOfficialResponseMutation.mutateAsync();
  };

  const clearFilters = () => {
    setSelectedCategory("all");
    setSelectedStatus("all");
    setSelectedType("all");
    setSelectedPriority("all");
    setSearchQuery("");
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
              <TabsTrigger value="early-warning" className="gap-2 data-[state=active]:bg-accent">
                <AlertCircle className="w-4 h-4" />
                الإنذار المبكر
              </TabsTrigger>
              <TabsTrigger value="gis" className="gap-2 data-[state=active]:bg-accent">
                <PieChart className="w-4 h-4" />
                خريطة GIS
              </TabsTrigger>
              <TabsTrigger value="blockchain" className="gap-2 data-[state=active]:bg-accent">
                <ShieldCheck className="w-4 h-4" />
                سجل التدقيق
              </TabsTrigger>
              <TabsTrigger value="digital-twin" className="gap-2 data-[state=active]:bg-accent">
                <LayoutDashboard className="w-4 h-4" />
                التوأم الرقمي
              </TabsTrigger>
              <TabsTrigger value="predictive" className="gap-2 data-[state=active]:bg-accent">
                <TrendingUp className="w-4 h-4" />
                التنبؤ بالأزمات
              </TabsTrigger>
              <TabsTrigger value="smart-contracts" className="gap-2 data-[state=active]:bg-accent">
                <ShieldCheck className="w-4 h-4" />
                العقود الذكية
              </TabsTrigger>
              <TabsTrigger value="democracy" className="gap-2 data-[state=active]:bg-accent">
                <Users className="w-4 h-4" />
                الديمقراطية المباشرة
              </TabsTrigger>
              <TabsTrigger value="engagement" className="gap-2 data-[state=active]:bg-accent">
                <Send className="w-4 h-4" />
                تفاعل المركز
              </TabsTrigger>
              <TabsTrigger value="public-posts" className="gap-2 data-[state=active]:bg-accent">
                <FileText className="w-4 h-4" />
                منشورات عامة
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="analytics">
            <MPAnalyticsSuite issues={issues} mpName={user?.email || "النائب"} />
          </TabsContent>

          <TabsContent value="early-warning">
            <AIEarlyWarningSystem />
          </TabsContent>

          <TabsContent value="gis">
            <GISHeatmap />
          </TabsContent>

          <TabsContent value="blockchain">
            <BlockchainAuditTrail />
          </TabsContent>

          <TabsContent value="digital-twin">
            <DigitalTwinIntegration />
          </TabsContent>

          <TabsContent value="predictive">
            <PredictiveCrisisEngine />
          </TabsContent>

          <TabsContent value="smart-contracts">
            <SmartContractsAccountability />
          </TabsContent>

          <TabsContent value="democracy">
            <UnifiedNationalIDIntegration />
          </TabsContent>

          <TabsContent value="engagement">
            <MPEngagementPanel />
          </TabsContent>

          <TabsContent value="public-posts">
            <MPPublicPostsManager />
          </TabsContent>

          <TabsContent value="list" className="space-y-8">
            {loading ? (
              <IssueGridSkeleton />
            ) : issuesQuery.isError ? (
              <div className="text-center py-16 bg-card/30 border border-dashed border-border/50 rounded-3xl">
                <h3 className="text-lg font-medium text-foreground">{t("common.error")}</h3>
                <p className="text-muted-foreground">{t("auth.error_network")}</p>
                <Button onClick={() => issuesQuery.refetch()} variant="outline" className="mt-4 rounded-xl">
                  {t("common.retry")}
                </Button>
              </div>
            ) : (
              <>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card/50 border border-border/50 rounded-2xl p-4 md:p-6"
            >
              <div className="flex items-center gap-4 flex-wrap text-sm">
                <span className="font-medium text-foreground">{t("mp_dashboard.total_issues")}: {totalIssues}</span>
                <span className="text-muted-foreground">Citizens in my center: {centerCitizensCount}</span>
              </div>
            </motion.div>

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

                <Select value={selectedStatus} onValueChange={(val) => setSelectedStatus(val as "all" | IssueStatus)}>
                  <SelectTrigger>{t("mp_dashboard.filter_all")}</SelectTrigger>
                  <SelectContent>
                    {statusFilters.map((filter) => (
                      <SelectItem key={filter.key} value={filter.key}>{filter.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedType} onValueChange={(val) => setSelectedType(val as "all" | "individual" | "collective")}>
                  <SelectTrigger>{t("mp_dashboard.filter_all")}</SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("mp_dashboard.filter_all")}</SelectItem>
                    <SelectItem value="individual">{t("issue_card.individual")}</SelectItem>
                    <SelectItem value="collective">{t("issue_card.collective")}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedPriority} onValueChange={(val) => setSelectedPriority(val as "all" | "urgent" | "humanitarian" | "normal")}>
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
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {filteredIssues.length === 0 && totalIssues > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 bg-gradient-to-br from-card/80 to-muted/30 border border-dashed border-border/50 rounded-3xl"
              >
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {t("mp_dashboard.filtered_empty_title", { defaultValue: "لا توجد نتائج مطابقة للفلاتر الحالية" })}
                </h3>
                <p className="text-muted-foreground mb-5">
                  {t("mp_dashboard.filtered_empty_description", { defaultValue: "جرّب تعديل الفلاتر أو إعادة تعيينها لعرض جميع الشكاوى." })}
                </p>
                <Button variant="outline" onClick={clearFilters} className="rounded-xl">
                  {t("mp_dashboard.reset_filters", { defaultValue: "إعادة تعيين الفلاتر" })}
                </Button>
              </motion.div>
            )}

            {filteredIssues.length === 0 && totalIssues === 0 && (
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
              </>
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
                className="bg-card border border-border shadow-2xl rounded-[32px] w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col"
              >
                <div className="p-6 border-b border-border/50 flex justify-between items-center bg-muted/30">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-accent" />
                    <div>
                      <h2 className="text-xl font-bold text-foreground">التوثيق الرسمي للشكوى</h2>
                      <p className="text-xs text-muted-foreground">معالجة سيادية لمطالب المواطن</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedIssue(null)} className="rounded-full">
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="overflow-y-auto p-8 space-y-10">
                  {/* Document Generation Options */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-accent/5 p-6 rounded-2xl border border-accent/10">
                    <div>
                      <h3 className="font-bold text-foreground">توليد المستندات الرسمية</h3>
                      <p className="text-xs text-muted-foreground mt-1">قم بتوليد خطاب رسمي موجه للجهات المعنية</p>
                    </div>
                    <OfficialDocumentGenerator 
                      type="issue_report"
                      data={{
                        id: selectedIssue.id,
                        title: selectedIssue.refined_title || selectedIssue.title,
                        description: selectedIssue.refined_description || selectedIssue.description,
                        citizenName: "مواطن مسجل",
                        category: selectedIssue.category,
                        location: selectedIssue.location || "غير محدد",
                        date: selectedIssue.timeAgo,
                        status: selectedIssue.status
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-8">
                      <div>
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">تفاصيل الشكوى المنقحة</h3>
                        <div className="bg-muted/30 rounded-3xl p-6 border border-border/50">
                          <h4 className="text-lg font-bold text-foreground mb-4">{selectedIssue.refined_title || selectedIssue.title}</h4>
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                            {selectedIssue.refined_description || selectedIssue.description}
                          </p>
                        </div>
                      </div>

                      <AttachmentManager issueId={selectedIssue.id} />
                    </div>

                    <div className="space-y-8">
                      {/* Response System */}
                      <div className="bg-card border border-border/50 rounded-3xl p-6 space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-foreground">الردود الرسمية والمتابعة</h3>
                          {responsesState === "coming-soon" ? (
                            <Badge className="bg-warning/10 text-warning border-warning/20">
                              {t("common.coming_soon", { defaultValue: "قريبًا" })}
                            </Badge>
                          ) : (
                            <Badge className="bg-success/10 text-success border-success/20">موثق</Badge>
                          )}
                        </div>

                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                          {responsesState === "loading" ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                              {t("mp_dashboard.loading_responses", { defaultValue: "جارٍ تحميل الردود..." })}
                            </div>
                          ) : mpResponses.length > 0 ? (
                            mpResponses.map((res) => (
                              <div key={res.id} className="bg-muted/30 p-4 rounded-2xl border border-border/30 relative group">
                                <p className="text-sm text-foreground mb-2 font-medium">{res.response_text}</p>
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] text-muted-foreground">{new Date(res.created_at).toLocaleString("ar-EG")}</span>
                                  <OfficialDocumentGenerator 
                                    type="mp_response"
                                    data={{
                                      id: selectedIssue.id,
                                      title: selectedIssue.refined_title || selectedIssue.title,
                                      description: selectedIssue.refined_description || selectedIssue.description,
                                      citizenName: "مواطن مسجل",
                                      mpName: user?.email || "عضو مجلس النواب",
                                      category: selectedIssue.category,
                                      location: selectedIssue.location || "غير محدد",
                                      date: new Date(res.created_at).toLocaleDateString("ar-EG"),
                                      status: selectedIssue.status,
                                      responseText: res.response_text
                                    }}
                                  />
                                </div>
                              </div>
                            ))
                          ) : responsesState === "coming-soon" ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                              {t("mp_dashboard.responses_coming_soon", { defaultValue: "ميزة عرض الردود الرسمية الكاملة ستكون متاحة قريبًا." })}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                              {t("mp_dashboard.no_official_responses", { defaultValue: "لا توجد ردود رسمية حتى الآن" })}
                            </div>
                          )}
                        </div>

                        <div className="space-y-4 pt-4 border-t border-border/50">
                          <Textarea
                            placeholder="اكتب ردك الرسمي هنا... سيتم توثيقه وإرساله للمواطن فوراً"
                            value={actionNote}
                            onChange={(e) => setActionNote(e.target.value)}
                            className="min-h-[120px] rounded-2xl bg-muted/30 border-none focus:ring-2 focus:ring-accent"
                          />
                          <div className="flex gap-3">
                            <Button
                              onClick={handleAddOfficialResponse}
                              disabled={addOfficialResponseMutation.isPending || !actionNote}
                              className="flex-1 bg-accent hover:bg-accent/90 rounded-xl gap-2"
                            >
                              <Send className="w-4 h-4" />
                              إرسال رد رسمي
                            </Button>
                            <Select value={newStatus} onValueChange={(val) => setNewStatus(val as IssueStatus)}>
                              <SelectTrigger className="w-[140px] rounded-xl">{newStatus}</SelectTrigger>
                              <SelectContent>
                                {statusFilters.map((filter) => (
                                  <SelectItem key={filter.key} value={filter.key}>{filter.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button onClick={handleUpdateStatus} disabled={updateStatusMutation.isPending} variant="outline" className="rounded-xl">تحديث الحالة</Button>
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={() => {
                          setChatIssue(selectedIssue);
                          setSelectedIssue(null);
                        }}
                        variant="ghost"
                        className="w-full h-14 rounded-2xl border border-dashed border-border/50 hover:bg-accent/5 text-accent gap-2"
                      >
                        <MessageCircle className="w-5 h-5" />
                        فتح المحادثة المباشرة مع المواطن
                      </Button>
                    </div>
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
