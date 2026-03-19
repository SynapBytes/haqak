import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import IssueCard from "@/components/IssueCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Search, Filter, BarChart3, AlertCircle, CheckCircle2, Clock, Loader2, X, Users, User, FileText } from "lucide-react";
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

      // Get issue owner from issues table
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

  const statCards = [
    { label: "إجمالي المشاكل", value: totalIssues, icon: BarChart3, color: "text-accent" },
    { label: "بانتظار المعالجة", value: pendingCount, icon: AlertCircle, color: "text-warning" },
    { label: "قيد المعالجة", value: inProgressCount, icon: Clock, color: "text-info" },
    { label: "تم الحل", value: resolvedCount, icon: CheckCircle2, color: "text-success" },
  ];

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
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">لوحة تحكم النائب</h1>
          <p className="text-muted-foreground text-sm">نظرة عامة على مشاكل الدائرة</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="civic-card">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="civic-card mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ابحث بالعنوان أو رقم المشكلة..." className="pr-10 text-right" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {statusFilters.map((sf) => (
                <Button key={sf.key} variant={selectedStatus === sf.key ? "secondary" : "ghost"} size="sm" onClick={() => setSelectedStatus(sf.key)}>
                  {sf.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap mt-4 pt-4 border-t border-border">
            <Filter className="w-4 h-4 text-muted-foreground mt-1" />
            {categories.map((cat) => (
              <Button key={cat} variant={selectedCategory === cat ? "secondary" : "ghost"} size="sm" onClick={() => setSelectedCategory(cat)} className="text-xs">
                {cat}
              </Button>
            ))}
          </div>
          <div className="flex gap-2 mt-3 pt-3 border-t border-border">
            <Button variant={selectedType === "all" ? "secondary" : "ghost"} size="sm" onClick={() => setSelectedType("all")} className="gap-1 text-xs">الكل</Button>
            <Button variant={selectedType === "individual" ? "secondary" : "ghost"} size="sm" onClick={() => setSelectedType("individual")} className="gap-1 text-xs">
              <User className="w-3 h-3" /> فردية
            </Button>
            <Button variant={selectedType === "collective" ? "secondary" : "ghost"} size="sm" onClick={() => setSelectedType("collective")} className="gap-1 text-xs">
              <Users className="w-3 h-3" /> جماعية
            </Button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground mb-4">
          عرض {filteredIssues.length} من {totalIssues} مشكلة
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
        ) : (
          <div className="space-y-4">
            {filteredIssues.map((issue, i) => (
              <motion.div key={issue.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
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
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedIssue(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground">تفاصيل المشكلة</h2>
                <button onClick={() => setSelectedIssue(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
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
                <Button onClick={handleUpdateStatus} disabled={updating} className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  حفظ التحديث
                </Button>
              </div>

              {/* Action Log */}
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
