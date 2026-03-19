import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import IssueCard from "@/components/IssueCard";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, X, Send, Camera, Loader2 } from "lucide-react";
import type { Issue } from "@/components/IssueCard";

const categories = ["مياه", "طرق", "مرافق عامة", "صحة", "نظافة", "تعليم", "كهرباء", "أخرى"];

const CitizenDashboard = () => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIssues = async () => {
    if (!user) return;
    const { data, error } = await supabase
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
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchIssues();
  }, [user]);

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
        toast.success("تم تصنيف المشكلة بالذكاء الاصطناعي ✨");
      }
    } catch {
      toast.error("تعذر التصنيف التلقائي");
    } finally {
      setClassifying(false);
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
      const { error } = await supabase.from("issues").insert({
        user_id: user.id,
        title,
        description,
        category,
        location,
      });
      if (error) throw error;
      toast.success("تم إرسال المشكلة بنجاح");
      setShowForm(false);
      setTitle("");
      setDescription("");
      setCategory("");
      setLocation("");
      fetchIssues();
    } catch (err: any) {
      toast.error(err.message || "خطأ في إرسال المشكلة");
    } finally {
      setSubmitting(false);
    }
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowForm(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-foreground">إبلاغ عن مشكلة جديدة</h2>
                  <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-5 h-5" />
                  </button>
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
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">التصنيف</label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue placeholder="اختر تصنيف المشكلة" /></SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : issues.length === 0 ? (
          <div className="civic-card text-center py-12">
            <p className="text-muted-foreground">لم تقدم أي مشاكل بعد. ابدأ بالإبلاغ عن مشكلتك الأولى!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {issues.map((issue, i) => (
              <motion.div key={issue.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <IssueCard issue={issue} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CitizenDashboard;
