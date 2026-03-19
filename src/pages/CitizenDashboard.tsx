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
import { Plus, X, Send, Loader2, ImagePlus, CheckCircle2, MessageCircle } from "lucide-react";
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

      // Check which issues have conversations
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
    setSubmitting(true);
    try {
      const { data: insertedIssue, error } = await supabase.from("issues").insert({
        user_id: user.id,
        title,
        description,
        category,
        location,
        issue_type: issueType,
      }).select("id").single();
      if (error) throw error;

      if (files.length > 0 && insertedIssue) {
        await uploadFiles(insertedIssue.id);
      }

      // Create notification for MPs
      const { data: mpRoles } = await supabase.from("user_roles").select("user_id").eq("role", "mp");
      if (mpRoles) {
        for (const mp of mpRoles) {
          await supabase.from("notifications").insert({
            user_id: mp.user_id,
            title: "مشكلة جديدة",
            message: `تم استلام مشكلة جديدة: ${title}`,
            issue_id: insertedIssue?.id,
          });
        }
      }

      toast.success("تم إرسال المشكلة بنجاح");
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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">مشاكلي</h1>
            <p className="text-muted-foreground text-sm">تابع حالة المشاكل التي أبلغت عنها</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="w-4 h-4" />
            إبلاغ عن مشكلة
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {([
            { status: "received" as const, count: statusCounts.received },
            { status: "in-progress" as const, count: statusCounts["in-progress"] },
            { status: "resolved" as const, count: statusCounts.resolved },
          ]).map((item) => (
            <div key={item.status} className="civic-card text-center">
              <div className="text-2xl font-bold text-foreground mb-2">{item.count}</div>
              <StatusBadge status={item.status} />
            </div>
          ))}
        </div>

        {/* Issue Form Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowForm(false)}>
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-foreground">إبلاغ عن مشكلة جديدة</h2>
                  <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">عنوان المشكلة</label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: انقطاع المياه في حي الأمل" className="text-right" required />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">وصف المشكلة</label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="اكتب تفاصيل المشكلة هنا..." rows={4} className="text-right" required />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">الموقع</label>
                    <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="مثال: شارع النيل، سوهاج" className="text-right" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">التصنيف</label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger><SelectValue placeholder="اختر التصنيف" /></SelectTrigger>
                        <SelectContent>{categories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">نوع المشكلة</label>
                      <Select value={issueType} onValueChange={(v) => setIssueType(v as "individual" | "collective")}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="individual">فردية</SelectItem>
                          <SelectItem value="collective">جماعية</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">مرفقات (اختياري)</label>
                    <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleFileChange} />
                    <Button type="button" variant="outline" className="w-full gap-2" onClick={() => fileInputRef.current?.click()}>
                      <ImagePlus className="w-4 h-4" />
                      إرفاق صور أو ملفات ({files.length}/5)
                    </Button>
                    {files.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {files.map((f, i) => (
                          <div key={i} className="flex items-center gap-1 bg-secondary rounded-md px-2 py-1 text-xs text-secondary-foreground">
                            <span className="max-w-[100px] truncate">{f.name}</span>
                            <button type="button" onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button type="button" variant="outline" className="w-full gap-2" onClick={handleClassify} disabled={classifying || !title || !description}>
                    {classifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "✨"}
                    صنّف تلقائياً بالذكاء الاصطناعي
                  </Button>

                  <Button type="submit" disabled={submitting} className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    إرسال المشكلة
                  </Button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Issues List */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
        ) : issues.length === 0 ? (
          <div className="civic-card text-center py-12">
            <p className="text-muted-foreground">لم تقدم أي مشاكل بعد. ابدأ بالإبلاغ عن مشكلتك الأولى!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {issues.map((issue, i) => (
              <motion.div key={issue.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <IssueCard issue={issue} />
                {issue.status === "resolved" && !issue.citizen_confirmed && (
                  <div className="mt-2 flex justify-end">
                    <Button size="sm" variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10" onClick={() => handleConfirmResolution(issue.id)}>
                      <CheckCircle2 className="w-4 h-4" />
                      تأكيد حل المشكلة
                    </Button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CitizenDashboard;
