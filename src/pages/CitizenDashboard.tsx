import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import IssueCard from "@/components/IssueCard";
import ChatDrawer from "@/components/ChatDrawer";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, X, Send, Loader2, ImagePlus, CheckCircle2, MessageCircle, AlertCircle, Clock, TrendingUp } from "lucide-react";
import type { Issue } from "@/components/IssueCard";

const categories = ["مياه", "طرق", "مرافق عامة", "صحة", "نظافة", "تعليم", "كهرباء", "أخرى"];

const CitizenDashboard = () => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [issueType, setIssueType] = useState<"individual" | "collective">("individual");
  const [submitting, setSubmitting] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chatIssue, setChatIssue] = useState<Issue | null>(null);
  const [conversationMap, setConversationMap] = useState<Record<string, boolean>>({});

  const fetchIssues = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("issues")
      .select("*")
      .eq("user_id", user.id)
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
        user_id: d.user_id,
      })));

      const { data: convs } = await supabase
        .from("chat_conversations")
        .select("issue_id")
        .in("issue_id", data.map((d) => d.id));
      if (convs) {
        const map: Record<string, boolean> = {};
        convs.forEach((c: any) => { map[c.issue_id] = true; });
        setConversationMap(map);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchIssues(); }, [user]);

  const handleClassify = async () => {
    if (!title || !description) return;
    setClassifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("classify-issue", {
        body: { title, description },
      });
      if (error) throw error;
      if (data) {
        if (data.refined_title) setTitle(data.refined_title);
        if (data.refined_description) setDescription(data.refined_description);
        if (data.category) setCategory(data.category);
        if (data.issue_type) setIssueType(data.issue_type);
        if (data.is_flagged) toast.info("تم تنقيح بعض العبارات غير اللائقة تلقائياً");
        toast.success("تم تصنيف المشكلة بالذكاء الاصطناعي ✨");
      }
    } catch {
      toast.error("تعذر التصنيف التلقائي");
    } finally {
      setClassifying(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length + files.length > 5) {
      toast.error("الحد الأقصى 5 ملفات");
      return;
    }
    setFiles((prev) => [...prev, ...selected]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (issueId: string) => {
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `${user!.id}/${issueId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("issue-attachments")
        .upload(path, file);
      if (uploadError) {
        console.error("Upload error:", uploadError);
        continue;
      }
      await supabase.from("issue_attachments").insert({
        issue_id: issueId,
        file_path: path,
        file_name: file.name,
        file_type: file.type,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title || !description || !category || !location) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }

    // Check ban status
    const { data: profileData } = await supabase
      .from("profiles")
      .select("banned_until")
      .eq("user_id", user.id)
      .single();
    if (profileData?.banned_until) {
      const bannedUntil = new Date(profileData.banned_until);
      if (bannedUntil > new Date()) {
        const remainingDays = Math.ceil((bannedUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        toast.error(`حسابك موقوف لمدة ${remainingDays} يوم بسبب استخدام ألفاظ غير لائقة`);
        return;
      }
    }

    setSubmitting(true);
    try {
      // Step 1: Auto-classify with AI
      let finalTitle = title;
      let finalDescription = description;
      let finalCategory = category;
      let finalIssueType = issueType;
      let isFlagged = false;
      let aiSummary: string | null = null;

      try {
        toast.info("جاري التصنيف التلقائي بالذكاء الاصطناعي... ✨");
        const { data: classifyData, error: classifyError } = await supabase.functions.invoke("classify-issue", {
          body: { title, description },
        });
        if (!classifyError && classifyData) {
          finalTitle = classifyData.refined_title || title;
          finalDescription = classifyData.refined_description || description;
          finalCategory = classifyData.category || category;
          finalIssueType = classifyData.issue_type || issueType;
          isFlagged = classifyData.is_flagged || false;
          aiSummary = classifyData.summary || null;
        }
      } catch {
        console.warn("AI classification failed, proceeding with original data");
      }

      // Step 2: Insert issue with AI results
      const { data: insertedIssue, error } = await supabase.from("issues").insert({
        user_id: user.id,
        title: finalTitle,
        description: finalDescription,
        category: finalCategory,
        location,
        issue_type: finalIssueType,
        is_flagged: isFlagged,
        ai_summary: aiSummary,
      }).select("id").single();
      if (error) throw error;

      // Step 3: If flagged, apply weekly ban
      if (isFlagged) {
        const banUntil = new Date();
        banUntil.setDate(banUntil.getDate() + 7);
        await supabase.from("profiles").update({ banned_until: banUntil.toISOString() }).eq("user_id", user.id);
        toast.warning("تم تسجيل مخالفة بسبب ألفاظ غير لائقة. حسابك موقوف لمدة أسبوع.");
      }

      // Step 4: Upload files
      if (files.length > 0 && insertedIssue) {
        await uploadFiles(insertedIssue.id);
      }

      // Step 5: Notify MPs
      const { data: mpRoles } = await supabase.from("user_roles").select("user_id").eq("role", "mp");
      if (mpRoles) {
        for (const mp of mpRoles) {
          await supabase.from("notifications").insert({
            user_id: mp.user_id,
            title: "مشكلة جديدة",
            message: `تم استلام مشكلة جديدة: ${finalTitle}`,
            issue_id: insertedIssue?.id,
          });
        }
      }

      toast.success("تم إرسال المشكلة بنجاح وتصنيفها تلقائياً ✨");
      setShowForm(false);
      setTitle(""); setDescription(""); setCategory(""); setLocation("");
      setIssueType("individual"); setFiles([]);
      fetchIssues();
    } catch (err: any) {
      toast.error(err.message || "خطأ في إرسال المشكلة");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmResolution = async (issueId: string) => {
    const { error } = await supabase.from("issues").update({ citizen_confirmed: true }).eq("id", issueId);
    if (error) { toast.error("حدث خطأ"); return; }
    toast.success("تم تأكيد حل المشكلة ✅");
    await supabase.from("issue_actions").insert({
      issue_id: issueId,
      user_id: user!.id,
      action_type: "citizen_confirmed",
      note: "المواطن أكد حل المشكلة",
    });
    fetchIssues();
  };

  const statusCounts = {
    received: issues.filter((i) => i.status === "received").length,
    "in-progress": issues.filter((i) => i.status === "in-progress").length,
    resolved: issues.filter((i) => i.status === "resolved").length,
  };

  const statCards = [
    { status: "received" as const, count: statusCounts.received, icon: AlertCircle, color: "text-accent", bg: "from-accent/10 to-accent/5", label: "بانتظار المراجعة" },
    { status: "in-progress" as const, count: statusCounts["in-progress"], icon: Clock, color: "text-warning", bg: "from-warning/10 to-warning/5", label: "قيد المعالجة" },
    { status: "resolved" as const, count: statusCounts.resolved, icon: CheckCircle2, color: "text-success", bg: "from-success/10 to-success/5", label: "تم الحل" },
  ];

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-accent/[0.04] blur-3xl"
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-primary/[0.04] blur-3xl"
        />
      </div>

      <AppHeader />
      <div className="container py-6 md:py-8 px-4 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <motion.h1
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-2xl md:text-3xl font-bold text-foreground mb-1 tracking-tight"
            >
              مشاكلي
            </motion.h1>
            <p className="text-muted-foreground text-sm">تابع حالة المشاكل التي أبلغت عنها</p>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button onClick={() => setShowForm(true)} className="gap-2.5 bg-gradient-to-l from-accent to-info text-white hover:opacity-90 shadow-lg shadow-accent/20 rounded-xl h-11 px-6 font-semibold">
              <Plus className="w-5 h-5" />
              إبلاغ عن مشكلة
            </Button>
          </motion.div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 md:gap-5 mb-8">
          {statCards.map((item, i) => (
            <motion.div
              key={item.status}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -3, scale: 1.02 }}
              className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 md:p-5 text-center group hover:shadow-xl transition-all duration-300 cursor-default"
            >
              <div className={`w-11 h-11 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br ${item.bg} flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300`}>
                <item.icon className={`w-5 h-5 md:w-6 md:h-6 ${item.color}`} />
              </div>
              <div className={`text-2xl md:text-3xl font-bold mb-1 ${item.color}`}>{item.count}</div>
              <div className="text-xs text-muted-foreground font-medium">{item.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Issue Form Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/20 backdrop-blur-md z-50 flex items-center justify-center p-4"
              onClick={() => setShowForm(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-3xl p-7 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent to-info flex items-center justify-center">
                      <Plus className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">إبلاغ عن مشكلة جديدة</h2>
                  </div>
                  <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground block">عنوان المشكلة</label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: انقطاع المياه في حي الأمل" className="text-right h-11 rounded-xl border-border/50 bg-background/50 focus:bg-background" required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground block">وصف المشكلة</label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="اكتب تفاصيل المشكلة هنا..." rows={4} className="text-right rounded-xl border-border/50 bg-background/50 focus:bg-background" required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground block">الموقع</label>
                    <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="مثال: شارع النيل، سوهاج" className="text-right h-11 rounded-xl border-border/50 bg-background/50 focus:bg-background" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-foreground block">التصنيف</label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="h-11 rounded-xl border-border/50"><SelectValue placeholder="اختر التصنيف" /></SelectTrigger>
                        <SelectContent>{categories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-foreground block">نوع المشكلة</label>
                      <Select value={issueType} onValueChange={(v) => setIssueType(v as "individual" | "collective")}>
                        <SelectTrigger className="h-11 rounded-xl border-border/50"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="individual">فردية</SelectItem>
                          <SelectItem value="collective">جماعية</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* File Upload */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground block">مرفقات (اختياري)</label>
                    <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleFileChange} />
                    <Button type="button" variant="outline" className="w-full gap-2 h-11 rounded-xl border-dashed border-2 border-border/50 hover:border-accent/30 hover:bg-accent/5" onClick={() => fileInputRef.current?.click()}>
                      <ImagePlus className="w-4 h-4 text-accent" />
                      إرفاق صور أو ملفات ({files.length}/5)
                    </Button>
                    {files.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {files.map((f, i) => (
                          <div key={i} className="flex items-center gap-1.5 bg-muted rounded-lg px-3 py-1.5 text-xs text-foreground">
                            <span className="max-w-[100px] truncate">{f.name}</span>
                            <button type="button" onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive transition-colors"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>


                  <Button type="submit" disabled={submitting} className="w-full gap-2.5 bg-gradient-to-l from-accent to-info text-white hover:opacity-90 h-12 rounded-xl font-semibold shadow-lg shadow-accent/20 text-base">
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    إرسال المشكلة
                  </Button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Issues List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-accent" />
            <span className="text-sm text-muted-foreground">جاري التحميل...</span>
          </div>
        ) : issues.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-3xl text-center py-16 px-6"
          >
            <div className="w-16 h-16 rounded-3xl bg-accent/10 flex items-center justify-center mx-auto mb-5">
              <TrendingUp className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">لم تقدم أي مشاكل بعد</h3>
            <p className="text-muted-foreground text-sm mb-6">ابدأ بالإبلاغ عن مشكلتك الأولى وتابع حلها</p>
            <Button onClick={() => setShowForm(true)} className="gap-2 bg-gradient-to-l from-accent to-info text-white rounded-xl px-6">
              <Plus className="w-4 h-4" /> قدّم مشكلتك الأولى
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {issues.map((issue, i) => (
              <motion.div key={issue.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <IssueCard issue={issue} />
                <div className="mt-2 flex justify-end gap-2">
                  {conversationMap[issue.id] && (
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button size="sm" variant="outline" className="gap-2 text-accent border-accent/20 hover:bg-accent/5 rounded-xl" onClick={() => setChatIssue(issue)}>
                        <MessageCircle className="w-4 h-4" />
                        المحادثة
                      </Button>
                    </motion.div>
                  )}
                  {issue.status === "resolved" && !issue.citizen_confirmed && (
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button size="sm" variant="outline" className="gap-2 border-success/20 text-success hover:bg-success/5 rounded-xl" onClick={() => handleConfirmResolution(issue.id)}>
                        <CheckCircle2 className="w-4 h-4" />
                        تأكيد حل المشكلة
                      </Button>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Chat Drawer */}
      <AnimatePresence>
        {chatIssue && chatIssue.user_id && (
          <ChatDrawer
            issueId={chatIssue.id}
            issueTitle={chatIssue.title}
            citizenUserId={chatIssue.user_id}
            isMP={false}
            onClose={() => setChatIssue(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CitizenDashboard;
