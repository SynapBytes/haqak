import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import IssueCard from "@/components/IssueCard";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { mockIssues } from "@/data/mockIssues";
import { Plus, X, Send, Camera } from "lucide-react";

const CitizenDashboard = () => {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const citizenIssues = mockIssues.slice(0, 4);

  const statusCounts = {
    received: citizenIssues.filter((i) => i.status === "received").length,
    "in-progress": citizenIssues.filter((i) => i.status === "in-progress").length,
    resolved: citizenIssues.filter((i) => i.status === "resolved").length,
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowForm(false);
    setTitle("");
    setDescription("");
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container py-8">
        {/* Summary */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">مشاكلي</h1>
            <p className="text-muted-foreground text-sm">تابع حالة المشاكل التي أبلغت عنها</p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Plus className="w-4 h-4" />
            إبلاغ عن مشكلة
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {([
            { status: "received" as const, label: "تم الاستلام", count: statusCounts.received },
            { status: "in-progress" as const, label: "قيد المعالجة", count: statusCounts["in-progress"] },
            { status: "resolved" as const, label: "تم الحل", count: statusCounts.resolved },
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
                className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg"
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
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="مثال: انقطاع المياه في حي الأمل"
                      className="text-right"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">وصف المشكلة</label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="اكتب تفاصيل المشكلة هنا..."
                      rows={4}
                      className="text-right"
                    />
                  </div>
                  <Button type="button" variant="outline" className="w-full gap-2">
                    <Camera className="w-4 h-4" />
                    إرفاق صورة
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    سيتم تصنيف مشكلتك تلقائياً باستخدام الذكاء الاصطناعي
                  </p>
                  <Button type="submit" className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                    <Send className="w-4 h-4" />
                    إرسال المشكلة
                  </Button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Issues List */}
        <div className="space-y-4">
          {citizenIssues.map((issue, i) => (
            <motion.div
              key={issue.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <IssueCard issue={issue} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CitizenDashboard;
