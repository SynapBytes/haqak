import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";
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
import { Plus, X, Send, SendHorizonal, Loader2, ImagePlus, CheckCircle2, MessageCircle, AlertCircle, Clock, TrendingUp } from "lucide-react";
import type { Issue } from "@/components/IssueCard";
import LocationPicker from "@/components/LocationPicker";
import { useTranslation } from "react-i18next";
import { stripExifFromFiles } from "@/lib/stripExif";
import { filterContent, validateAttachments } from "@/lib/contentSecurity";

const categoryKeys = ["water", "roads", "public_facilities", "health", "sanitation", "education", "electricity", "other"] as const;

const CitizenDashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const mpIdParam = searchParams.get("mp_id");
  const mpNameParam = searchParams.get("mp_name");
  const [showForm, setShowForm] = useState(false);
  const [assignedMpId, setAssignedMpId] = useState<string | null>(null);
  const [assignedMpName, setAssignedMpName] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [issueType, setIssueType] = useState<"individual" | "collective">("individual");
  const [submitting, setSubmitting] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chatIssue, setChatIssue] = useState<Issue | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [conversationMap, setConversationMap] = useState<Record<string, boolean>>({});

  const isFormValid = title.trim() !== "" && 
                      description.trim() !== "" && 
                      category !== "" && 
                      location.trim() !== "";

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

  useEffect(() => {
    if (mpIdParam && mpNameParam) {
      setAssignedMpId(mpIdParam);
      setAssignedMpName(decodeURIComponent(mpNameParam));
      setShowForm(true);
      setSearchParams({}, { replace: true });
    }
  }, [mpIdParam, mpNameParam]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length + files.length > 5) {
      toast.error(t("dashboard.max_files"));
      return;
    }
    setFiles((prev) => [...prev, ...selected]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (issueId: string) => {
    const cleanedFiles = await stripExifFromFiles(files);
    for (const file of cleanedFiles) {
      const ext = file.name.split(".").pop();
      const path = `${user!.id}/${issueId}/${Date.now()}.${ext}`;
      if (path.includes('..')) {
        throw new Error("Invalid path");
      }
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
    if (!user || !isFormValid) {
      toast.error(t("dashboard.fill_all_fields"));
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("banned_until")
      .eq("user_id", user.id)
      .single();
    if (profileData?.banned_until) {
      const bannedUntil = new Date(profileData.banned_until);
      if (bannedUntil > new Date()) {
        const remainingDays = Math.ceil((bannedUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        toast.error(t("dashboard.banned_message", { days: remainingDays }));
        return;
      }
    }

    setSubmitting(true);
    try {
      // Validate content before processing
      const contentFilter = filterContent(title, description);
      if (!contentFilter.isClean) {
        toast.error(contentFilter.reason || "محتوى مسيء أو غير لائق");
        setSubmitting(false);
        return;
      }
      
      // Validate attachments
      if (files.length > 0) {
        const attachmentValidation = validateAttachments(files);
        if (!attachmentValidation.isValid) {
          toast.error(attachmentValidation.errors.join("\n"));
          setSubmitting(false);
          return;
        }
        if (attachmentValidation.warnings.length > 0) {
          attachmentValidation.warnings.forEach(w => toast.warning(w));
        }
      }
      
      let finalTitle = title;
      let finalDescription = description;
      let finalCategory = category;
      let finalIssueType = issueType;
      let isFlagged = false;
      let aiSummary: string | null = null;
      let priority = "normal";

      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();

      const senderName = senderProfile?.full_name || "";

      const filesInfo = files.map(f => ({
        fileName: f.name,
        fileType: f.type,
      }));

      try {
        toast.info(t("dashboard.classifying_ai"));
        const { data: classifyData, error: classifyError } = await supabase.functions.invoke("classify-issue", {
          body: { title, description, senderName, files: filesInfo },
        });

        if (!classifyError && classifyData) {
          if (classifyData.status === "rejected") {
            toast.error(classifyData.rejectionReason || t("dashboard.rejected"));
            setSubmitting(false);
            return;
          }

          finalTitle = classifyData.refined_title || title;
          finalDescription = classifyData.refined_description || classifyData.text || description;
          finalCategory = classifyData.issueCategory || category;
          finalIssueType = classifyData.category === "group" ? "collective" : "individual";
          isFlagged = classifyData.foulWordsRemoved || false;
          aiSummary = classifyData.summary || null;
          priority = classifyData.priority || "normal";
        }
      } catch {
        console.warn("AI classification failed, proceeding with original data");
      }

      const { data: insertedIssue, error } = await supabase.from("issues").insert({
        user_id: user.id,
        title: finalTitle,
        description: finalDescription,
        refined_title: finalTitle,
        refined_description: finalDescription,
        category: finalCategory,
        location,
        issue_type: finalIssueType,
        is_flagged: isFlagged,
        ai_summary: aiSummary,
        priority: priority,
        ...(assignedMpId ? { assigned_mp_id: assignedMpId } : {}),
        ...(latitude ? { latitude } : {}),
        ...(longitude ? { longitude } : {}),
      }).select("id").single();
      if (error) throw error;

      if (isFlagged) {
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("banned_until")
          .eq("user_id", user.id)
          .single();

        const hadPreviousBan = currentProfile?.banned_until && new Date(currentProfile.banned_until) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const banDays = hadPreviousBan ? 30 : 7;
        const banUntil = new Date();
        banUntil.setDate(banUntil.getDate() + banDays);
        await supabase.from("profiles").update({ banned_until: banUntil.toISOString() }).eq("user_id", user.id);
        toast.warning(t("dashboard.violation_recorded", { days: banDays }));
      }

      if (files.length > 0 && insertedIssue) {
        await uploadFiles(insertedIssue.id);
      }

      const { data: mpRoles } = await supabase.from("user_roles").select("user_id").eq("role", "mp");
      if (mpRoles) {
        const priorityLabel = priority === "urgent" ? t("dashboard.new_issue_urgent") : priority === "humanitarian" ? t("dashboard.new_issue_humanitarian") : "";
        for (const mp of mpRoles) {
          await supabase.from("notifications").insert({
            user_id: mp.user_id,
            title: priorityLabel || t("dashboard.new_issue_title"),
            message: t("dashboard.new_issue_notification", { title: finalTitle }),
            issue_id: insertedIssue?.id,
          });
        }
      }

      toast.success(t("dashboard.issue_sent_success"));
      setShowForm(false);
      setTitle(""); setDescription(""); setCategory(""); setLocation("");
      setIssueType("individual"); setFiles([]);
      setLatitude(null); setLongitude(null);
      setAssignedMpId(null); setAssignedMpName(null);
      fetchIssues();
    } catch (err: any) {
      toast.error(err.message || t("dashboard.error_submit"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmResolution = async (issueId: string) => {
    const { error } = await supabase.from("issues").update({ citizen_confirmed: true }).eq("id", issueId);
    if (error) { toast.error(t("common.error")); return; }
    toast.success(t("dashboard.resolution_confirmed"));
    await supabase.from("issue_actions").insert({
      issue_id: issueId,
      user_id: user!.id,
      action_type: "citizen_confirmed",
      note: t("dashboard.confirm_resolution"),
    });
    fetchIssues();
  };

  const statusCounts = {
    received: issues.filter((i) => i.status === "received").length,
    "in-progress": issues.filter((i) => i.status === "in-progress").length,
    resolved: issues.filter((i) => i.status === "resolved").length,
  };

  const statCards = [
    { status: "received" as const, count: statusCounts.received, icon: AlertCircle, color: "text-accent", bg: "from-accent/10 to-accent/5", label: t("dashboard.waiting") },
    { status: "in-progress" as const, count: statusCounts["in-progress"], icon: Clock, color: "text-warning", bg: "from-warning/10 to-warning/5", label: t("dashboard.in_progress") },
    { status: "resolved" as const, count: statusCounts.resolved, icon: CheckCircle2, color: "text-success", bg: "from-success/10 to-success/5", label: t("dashboard.resolved") },
  ];

  return (
    <div className="min-h-screen bg-background relative">
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <motion.h1
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-2xl md:text-3xl font-bold text-foreground mb-1 tracking-tight"
            >
              {t("dashboard.my_issues")}
            </motion.h1>
            <p className="text-muted-foreground text-sm">{t("dashboard.track_issues")}</p>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button onClick={() => setShowForm(true)} className="gap-2.5 bg-gradient-to-l from-accent to-info text-white hover:opacity-90 shadow-lg shadow-accent/20 rounded-xl h-11 px-6 font-semibold">
              <Plus className="w-5 h-5" />
              {t("dashboard.report_issue")}
            </Button>
          </motion.div>
        </div>

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
                    <h2 className="text-xl font-bold text-foreground">{t("dashboard.new_issue")}</h2>
                  </div>
                  <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {assignedMpName && (
                  <div className="flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-xl px-4 py-3 mb-2">
                    <SendHorizonal className="w-4 h-4 text-accent shrink-0" />
                    <span className="text-sm font-medium text-foreground">
                      {t("dashboard.issue_to_mp")} <span className="text-accent font-bold">{assignedMpName}</span>
                    </span>
                    <button type="button" onClick={() => { setAssignedMpId(null); setAssignedMpName(null); }} className="mr-auto text-muted-foreground hover:text-foreground">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground block">{t("dashboard.title")}</label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("dashboard.title_placeholder")} className="text-right h-11 rounded-xl border-border/50 bg-background/50 focus:bg-background" required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground block">{t("dashboard.description")}</label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("dashboard.description_placeholder")} rows={4} className="text-right rounded-xl border-border/50 bg-background/50 focus:bg-background" required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground block">{t("dashboard.location")}</label>
                    <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("dashboard.location_placeholder")} className="text-right h-11 rounded-xl border-border/50 bg-background/50 focus:bg-background" required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground block">{t("dashboard.map_location")}</label>
                    <LocationPicker
                      latitude={latitude}
                      longitude={longitude}
                      onChange={(lat, lng) => { setLatitude(lat); setLongitude(lng); }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-foreground block">{t("dashboard.category")}</label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="h-11 rounded-xl border-border/50"><SelectValue placeholder={t("dashboard.category_placeholder")} /></SelectTrigger>
                        <SelectContent>{categoryKeys.map((key) => (<SelectItem key={key} value={t(`categories.${key}`)}>{t(`categories.${key}`)}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-foreground block">{t("dashboard.type")}</label>
                      <Select value={issueType} onValueChange={(v) => setIssueType(v as "individual" | "collective")}>
                        <SelectTrigger className="h-11 rounded-xl border-border/50"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="individual">{t("dashboard.individual")}</SelectItem>
                          <SelectItem value="collective">{t("dashboard.collective")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground block">{t("dashboard.attachments")}</label>
                    <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleFileChange} />
                    <Button type="button" variant="outline" className="w-full gap-2 h-11 rounded-xl border-dashed border-2 border-border/50 hover:border-accent/30 hover:bg-accent/5" onClick={() => fileInputRef.current?.click()}>
                      <ImagePlus className="w-4 h-4 text-accent" />
                      {t("dashboard.attach_files") || "إرفاق صور أو ملفات"} ({files.length}/5)
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

                  <Button type="submit" disabled={submitting || !isFormValid} className={`w-full gap-2.5 bg-gradient-to-l from-accent to-info text-white hover:opacity-90 h-12 rounded-xl font-semibold shadow-lg shadow-accent/20 text-base transition-all ${isFormValid ? 'hover:-translate-y-0.5' : 'opacity-50 grayscale'}`}>
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    {t("dashboard.submit")}
                  </Button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="text-sm text-muted-foreground">{t("common.loading")}</span>
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
            <h3 className="text-lg font-bold text-foreground mb-2">{t("dashboard.no_issues")}</h3>
            <p className="text-muted-foreground text-sm mb-6">{t("dashboard.first_issue")}</p>
            <Button onClick={() => setShowForm(true)} className="gap-2 bg-accent text-white hover:bg-accent/90 rounded-xl">
              <Plus className="w-4 h-4" /> {t("dashboard.first_issue_btn")}
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {issues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                onConfirmResolution={() => handleConfirmResolution(issue.id)}
                onOpenChat={() => setChatIssue(issue)}
                hasChat={conversationMap[issue.id] || false}
              />
            ))}
          </div>
        )}
      </div>

      {chatIssue && (
        <ChatDrawer
          issueId={chatIssue.id}
          issueTitle={chatIssue.title}
          isOpen={!!chatIssue}
          onClose={() => setChatIssue(null)}
          isMP={false}
        />
      )}
    </div>
  );
};

export default CitizenDashboard;
