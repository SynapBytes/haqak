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
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Search, Filter, BarChart3, AlertCircle, CheckCircle2, Clock, Loader2,
  X, Users, User, FileText, TrendingUp, PieChart, MessageCircle, Phone
} from "lucide-react";
import type { Issue } from "@/components/IssueCard";
import type { IssueStatus } from "@/components/StatusBadge";

const categories = ["الكل", "مياه", "طرق", "مرافق عامة", "صحة", "نظافة", "تعليم", "كهرباء", "أخرى"];

interface ActionLog {
  id: string;
  action_type: string;
  note: string | null;
  created_at: string;
}

const MPDashboard = () => {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState("الكل");
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

  const fetchIssues = async () => {
    const { data } = await supabase
      .from("issues")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setIssues(data.map((d) => ({
        id: d.id,
        title: d.title,
        description: d.description,
        status: d.status as Issue["status"],
        category: d.category,
        location: d.location,
        timeAgo: new Date(d.created_at).toLocaleDateString("ar-EG"),
        issue_type: (d as any).issue_type || "individual",
        is_flagged: (d as any).is_flagged || false,
        citizen_confirmed: (d as any).citizen_confirmed || false,
        ai_summary: d.ai_summary || undefined,
      })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchIssues(); }, []);

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
        status: newStatus,
        mp_notes: actionNote || undefined,
        assigned_mp_id: user.id,
      }).eq("id", selectedIssue.id);
      if (error) throw error;

      await supabase.from("issue_actions").insert({
        issue_id: selectedIssue.id,
        user_id: user.id,
        action_type: `status_change_to_${newStatus}`,
        note: actionNote || `تم تغيير الحالة إلى ${newStatus === "received" ? "تم الاستلام" : newStatus === "in-progress" ? "قيد المعالجة" : "تم الحل"}`,
      });

      const { data: issueData } = await supabase.from("issues").select("user_id, title").eq("id", selectedIssue.id).single();
      if (issueData) {
        const statusLabel = newStatus === "resolved" ? "تم حل مشكلتك" : newStatus === "in-progress" ? "مشكلتك قيد المعالجة" : "تم استلام مشكلتك";
        await supabase.from("notifications").insert({
          user_id: issueData.user_id,
          title: statusLabel,
          message: `${issueData.title}: ${actionNote || statusLabel}`,
          issue_id: selectedIssue.id,
        });
      }

      toast.success("تم تحديث حالة المشكلة");
      setSelectedIssue(null);
      fetchIssues();
    } catch (err: any) {
      toast.error(err.message || "خطأ في التحديث");
    } finally {
      setUpdating(false);
    }
  };

  const filteredIssues = issues.filter((issue) => {
    const matchesCategory = selectedCategory === "الكل" || issue.category === selectedCategory;
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
    { label: "إجمالي المشاكل", value: totalIssues, icon: BarChart3, color: "text-accent" },
    { label: "بانتظار المعالجة", value: pendingCount, icon: AlertCircle, color: "text-warning" },
    { label: "قيد المعالجة", value: inProgressCount, icon: Clock, color: "text-info" },
    { label: "تم الحل", value: resolvedCount, icon: CheckCircle2, color: "text-success" },
  ];

  const analyticsCards = [
    { label: "نسبة الحل", value: `${resolutionRate}%`, icon: TrendingUp },
    { label: "مشاكل جماعية", value: collectiveCount, icon: Users },
    { label: "مؤكدة من المواطنين", value: confirmedCount, icon: CheckCircle2 },
    { label: "حسب التصنيف الأكثر", value: getMostCommonCategory(), icon: PieChart },
  ];

  function getMostCommonCategory() {
    if (issues.length === 0) return "-";
    const counts: Record<string, number> = {};
    issues.forEach((i) => { counts[i.category] = (counts[i.category] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
  }

  const statusFilters: { key: "all" | IssueStatus; label: string }[] = [
    { key: "all", label: "الكل" },
    { key: "received", label: "تم الاستلام" },
    { key: "in-progress", label: "قيد المعالجة" },
    { key: "resolved", label: "تم الحل" },
  ];

  const actionTypeLabels: Record<string, string> = {
    status_change_to_received: "تغيير الحالة: تم الاستلام",
    status_change_to_in_progress: "تغيير الحالة: قيد المعالجة",
    "status_change_to_in-progress": "تغيير الحالة: قيد المعالجة",
    status_change_to_resolved: "تغيير الحالة: تم الحل",
    citizen_confirmed: "تأكيد المواطن للحل",
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container py-6 md:py-8 px-4">
        <div className="mb-6 md:mb-8">
          <h1 className="text-xl md:text-2xl font-bold text-foreground mb-1">لوحة تحكم النائب</h1>
          <p className="text-muted-foreground text-sm">نظرة عامة على مشاكل الدائرة</p>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4">
          {statCards.map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="civic-card">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 md:w-10 md:h-10 rounded-lg bg-secondary flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <div>
                  <div className="text-xl md:text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-[10px] md:text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Analytics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          {analyticsCards.map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}
              className="bg-card border border-border/50 p-3 md:p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] md:text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <div className="text-base md:text-lg font-bold text-foreground">{stat.value}</div>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="civic-card mb-6">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ابحث بالعنوان أو رقم المشكلة..." className="pr-10 text-right" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {statusFilters.map((sf) => (
                <Button key={sf.key} variant={selectedStatus === sf.key ? "secondary" : "ghost"} size="sm" onClick={() => setSelectedStatus(sf.key)} className="text-xs h-8">
                  {sf.label}
                </Button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap pt-3 border-t border-border">
              <Filter className="w-4 h-4 text-muted-foreground mt-1" />
              {categories.map((cat) => (
                <Button key={cat} variant={selectedCategory === cat ? "secondary" : "ghost"} size="sm" onClick={() => setSelectedCategory(cat)} className="text-xs h-8">
                  {cat}
                </Button>
              ))}
            </div>
            <div className="flex gap-2 pt-3 border-t border-border">
              <Button variant={selectedType === "all" ? "secondary" : "ghost"} size="sm" onClick={() => setSelectedType("all")} className="gap-1 text-xs h-8">الكل</Button>
              <Button variant={selectedType === "individual" ? "secondary" : "ghost"} size="sm" onClick={() => setSelectedType("individual")} className="gap-1 text-xs h-8">
                <User className="w-3 h-3" /> فردية
              </Button>
              <Button variant={selectedType === "collective" ? "secondary" : "ghost"} size="sm" onClick={() => setSelectedType("collective")} className="gap-1 text-xs h-8">
                <Users className="w-3 h-3" /> جماعية
              </Button>
            </div>
          </div>
        </div>

        <div className="text-sm text-muted-foreground mb-4">
          عرض {filteredIssues.length} من {totalIssues} مشكلة
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {filteredIssues.map((issue, i) => (
              <motion.div key={issue.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <IssueCard issue={issue} onClick={() => openIssueDetail(issue)} />
              </motion.div>
            ))}
            {filteredIssues.length === 0 && (
              <div className="civic-card text-center py-12">
                <p className="text-muted-foreground">لا توجد مشاكل مطابقة</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Issue Detail Modal */}
      <AnimatePresence>
        {selectedIssue && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-end md:items-center justify-center"
            onClick={() => setSelectedIssue(null)}>
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="bg-card border border-border rounded-t-2xl md:rounded-2xl p-5 md:p-6 w-full md:max-w-lg max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground">تفاصيل المشكلة</h2>
                <button onClick={() => setSelectedIssue(null)} className="text-muted-foreground hover:text-foreground p-1"><X className="w-5 h-5" /></button>
              </div>

              <h3 className="font-semibold text-foreground mb-2">{selectedIssue.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{selectedIssue.description}</p>
              {selectedIssue.ai_summary && (
                <p className="text-xs text-accent bg-accent/5 border border-accent/10 rounded-lg p-2 mb-4">✨ {selectedIssue.ai_summary}</p>
              )}

              <div className="space-y-3 mb-6">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">تحديث الحالة</label>
                  <Select value={newStatus} onValueChange={(v) => setNewStatus(v as IssueStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="received">تم الاستلام</SelectItem>
                      <SelectItem value="in-progress">قيد المعالجة</SelectItem>
                      <SelectItem value="resolved">تم الحل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">ملاحظات الإجراء</label>
                  <Textarea value={actionNote} onChange={(e) => setActionNote(e.target.value)} placeholder="أضف ملاحظة عن الإجراء المتخذ..." rows={3} className="text-right" />
                </div>
                <Button onClick={handleUpdateStatus} disabled={updating} className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90 h-11">
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  حفظ التحديث
                </Button>
              </div>

              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> سجل الإجراءات
                </h4>
                {actionLogs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">لا توجد إجراءات مسجلة بعد</p>
                ) : (
                  <div className="space-y-2">
                    {actionLogs.map((log) => (
                      <div key={log.id} className="bg-secondary/50 rounded-lg p-2.5 text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-foreground">{actionTypeLabels[log.action_type] || log.action_type}</span>
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
    </div>
  );
};

export default MPDashboard;
