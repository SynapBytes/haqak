import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import IssueCard from "@/components/IssueCard";
import ChatDrawer from "@/components/ChatDrawer";
import ReputationBadge from "@/components/ReputationBadge";
import OfficialDocumentGenerator from "@/components/OfficialDocumentGenerator";
import AttachmentManager from "@/components/AttachmentManager";
import { AILegalBot } from "@/components/AILegalBot";
import { MobileAppFeatures } from "@/components/MobileAppFeatures";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, X, Send, Loader2, ImagePlus, MessageCircle, AlertCircle, Clock, CheckCircle2, Mic, MapPin, ShieldCheck, FileText } from "lucide-react";
import type { Issue } from "@/components/IssueCard";
import LocationPicker from "@/components/LocationPicker";
import { useTranslation } from "react-i18next";
import { stripExifFromFiles } from "@/lib/stripExif";
import { sanitizeText } from "@/lib/sanitize";
import { validateIssueLocation, isLocationInEgypt } from "@/lib/egyptLocationValidation";
import TurnstileCaptcha from "@/components/TurnstileCaptcha";
import { verifyCaptchaToken } from "@/lib/captchaVerification";
import { validateBeforeUpload, validateNewFiles } from "@/lib/fileValidation";
import { ALLOWED_FILE_TYPES } from "@/constants/uploadConstraints";
import { useCsrfToken } from "@/hooks/useCsrfToken";
import { hashFile } from "@/lib/fileIntegrityService";

const categoryKeys = ["water", "roads", "public_facilities", "health", "sanitation", "education", "electricity", "other"] as const;

const CitizenDashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { csrfToken, csrfHeader, rotate: rotateCsrf } = useCsrfToken();
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
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [reputation, setReputation] = useState({ points: 0, rank: "مواطن جديد" });
  const [mpResponses, setMpResponses] = useState<any[]>([]);

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
        resolution_rating: (d as any).resolution_rating,
        refined_title: (d as any).refined_title,
        refined_description: (d as any).refined_description,
      })));
    }
    
    // reputation columns not yet in profiles table – use defaults
    setReputation({ points: 0, rank: "مواطن جديد" });
    
    setLoading(false);
  };

  const fetchResponses = async (issueId: string) => {
    // mp_responses table not yet created
    setMpResponses([]);
  };

  useEffect(() => { fetchIssues(); }, [user]);

  useEffect(() => {
    if (mpIdParam && mpNameParam) {
      setAssignedMpId(mpIdParam);
      setAssignedMpName(decodeURIComponent(mpNameParam));
      setShowForm(true);
      setSearchParams({}, { replace: true });
      setCaptchaToken(null);
    }
  }, [mpIdParam, mpNameParam]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const validation = validateNewFiles(files, selected);
    if (!validation.valid) {
      toast.error(validation.error || t("dashboard.max_files"));
      return;
    }
    setFiles((prev) => [...prev, ...selected]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (issueId: string) => {
    const validation = validateBeforeUpload(files);
    if (!validation.valid) {
      toast.error(validation.error || t("dashboard.max_files"));
      return;
    }
    const cleanedFiles = await stripExifFromFiles(files);
    for (const file of cleanedFiles) {
      // ── FIX #4: Compute SHA-256 hash BEFORE upload ───────────────────────────
      const preHash = await hashFile(file);

      const ext = file.name.split(".").pop();
      const path = `${user!.id}/${issueId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("issue-attachments")
        .upload(path, file);
      if (uploadError) {
        console.error("Upload error:", uploadError);
        continue;
      }

      // ── FIX #4: Verify integrity via Edge Function ───────────────────────────
      const { data: integrityData, error: integrityError } = await supabase.functions.invoke(
        "verify-upload-integrity",
        { body: { storagePath: path, expectedHash: preHash } },
      );
      if (integrityError || !integrityData?.valid) {
        console.error("Integrity check failed for", file.name, integrityError ?? integrityData?.error);
        // Remove the corrupted upload
        await supabase.storage.from("issue-attachments").remove([path]);
        toast.error(`${t("dashboard.file_integrity_failed")}: ${file.name}`);
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
    if (!captchaToken) {
      toast.error(t("support.fill_all_captcha"));
      return;
    }

    // Validate that the issue location is within Egypt
    if (latitude && longitude) {
      if (!isLocationInEgypt(latitude, longitude)) {
        toast.error("البلاغ يجب أن يكون عن مشكلة داخل حدود مصر فقط");
        return;
      }
    }

    setSubmitting(true);
    try {
      const captchaResult = await verifyCaptchaToken(captchaToken);
      if (!captchaResult.valid) {
        toast.error(t("support.captcha_failed"));
        setCaptchaToken(null);
        setSubmitting(false);
        return;
      }

      let finalTitle = sanitizeText(title);
      let finalDescription = sanitizeText(description);
      let finalCategory = category;
      let finalIssueType = issueType;
      let aiSummary: string | null = null;
      let priority = "normal";

      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();

      const senderName = senderProfile?.full_name || "";

      try {
        toast.info("جاري تحليل الشكوى بالذكاء الاصطناعي...");
        const { data: classifyData, error: classifyError } = await supabase.functions.invoke("classify-issue", {
          body: { 
            title, 
            description, 
            senderName, 
            location: { address: location, lat: latitude, lng: longitude },
            isEgyptianLocation: latitude && longitude ? isLocationInEgypt(latitude, longitude) : true
          },
          headers: { [csrfHeader]: csrfToken },
        });

        if (!classifyError && classifyData) {
          if (classifyData.status === "rejected") {
            // Check if rejection is due to location being outside Egypt
            if (classifyData.rejectionReason && classifyData.rejectionReason.includes("location")) {
              toast.error("البلاغ يجب أن يكون عن مشكلة داخل حدود مصر فقط");
            } else {
              toast.error(classifyData.rejectionReason || t("dashboard.rejected"));
            }
            setSubmitting(false);
            return;
          }

          finalTitle = classifyData.refined_title || title;
          finalDescription = classifyData.refined_description || description;
          finalCategory = classifyData.issueCategory || category;
          finalIssueType = classifyData.category === "collective" ? "collective" : "individual";
          aiSummary = classifyData.ai_summary || null;
          priority = classifyData.priority || "normal";
        }
      } catch (err) {
        console.error("AI classification failed:", err);
        toast.error("حدث خطأ في خوادم الفحص، يرجى المحاولة لاحقاً.");
        setSubmitting(false);
        return;
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
        ai_summary: aiSummary,
        priority: priority,
        ...(assignedMpId ? { assigned_mp_id: assignedMpId } : {}),
        ...(latitude ? { latitude } : {}),
        ...(longitude ? { longitude } : {}),
      }).select("id").single();
      
      if (error) throw error;

      if (files.length > 0) {
        await uploadFiles(insertedIssue.id);
      }

      toast.success(t("dashboard.issue_submitted"));
      setShowForm(false);
      setTitle("");
      setDescription("");
      setCategory("");
      setLocation("");
      setFiles([]);
      setAssignedMpId(null);
      setAssignedMpName(null);
      setCaptchaToken(null);
      rotateCsrf();
      fetchIssues();
    } catch (err: any) {
      toast.error(err.message || t("dashboard.error_submitting"));
    } finally {
      setSubmitting(false);
    }
  };

  const openIssueDetail = (issue: Issue) => {
    setSelectedIssue(issue);
    fetchResponses(issue.id);
  };

  const stats = [
    { label: t("dashboard.total_issues"), value: issues.length, icon: AlertCircle, color: "text-accent", bg: "bg-accent/10" },
    { label: t("dashboard.resolved"), value: issues.filter(i => i.status === 'resolved').length, icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
    { label: t("dashboard.in_progress"), value: issues.filter(i => i.status === 'in-progress').length, icon: Clock, color: "text-info", bg: "bg-info/10" },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.03, 0.06, 0.03] }} transition={{ duration: 10, repeat: Infinity }} className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-accent blur-3xl" />
        <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.03, 0.06, 0.03] }} transition={{ duration: 12, repeat: Infinity, delay: 1 }} className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-primary blur-3xl" />
      </div>

      <AppHeader />

      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">{t("dashboard.title")}</h1>
              <ReputationBadge points={reputation.points} rank={reputation.rank} />
            </div>
            <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2 bg-accent hover:bg-accent/90 px-8 py-6 rounded-2xl text-lg shadow-lg shadow-accent/20 transition-all hover:scale-105 active:scale-95">
            <Plus className="w-6 h-6" />
            {t("dashboard.new_issue")}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {stats.map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className={`${stat.bg} border border-border/50 rounded-3xl p-6 backdrop-blur-sm`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                </div>
                <div className={`p-4 rounded-2xl bg-background/50 ${stat.color}`}>
                  <stat.icon className="w-8 h-8" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

<Tabs defaultValue="issues" className="space-y-8">
            <TabsList className="bg-card/50 backdrop-blur-sm border-accent/20 p-1">
              <TabsTrigger value="issues" className="gap-2 data-[state=active]:bg-accent">
                <AlertCircle className="w-4 h-4" />
                {t("dashboard.my_issues")}
              </TabsTrigger>
              <TabsTrigger value="legal-bot" className="gap-2 data-[state=active]:bg-accent">
                <MessageCircle className="w-4 h-4" />
                المساعد القانوني
              </TabsTrigger>
              <TabsTrigger value="mobile-app" className="gap-2 data-[state=active]:bg-accent">
                <Smartphone className="w-4 h-4" />
                تطبيق حقك
              </TabsTrigger>
            </TabsList>

            <TabsContent value="issues" className="space-y-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-10 h-10 animate-spin text-accent mb-4" />
                  <p className="text-muted-foreground">{t("common.loading")}</p>
                </div>
              ) : issues.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {issues.map((issue) => (
                    <IssueCard key={issue.id} issue={issue} onClick={() => openIssueDetail(issue)} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-card/30 border border-dashed border-border/50 rounded-3xl">
                  <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{t("dashboard.no_issues")}</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">{t("dashboard.no_issues_desc")}</p>
                  <Button onClick={() => setShowForm(true)} variant="outline" className="mt-6 rounded-xl">
                    {t("dashboard.new_issue")}
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="legal-bot">
              <AILegalBot />
            </TabsContent>

            <TabsContent value="mobile-app">
              <MobileAppFeatures />
            </TabsContent>
          </Tabs>
      </main>

      {/* New Issue Form Overlay */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-card border border-border shadow-2xl rounded-[32px] w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-8 border-b border-border/50 flex justify-between items-center bg-muted/30">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{t("dashboard.new_issue")}</h2>
                  <p className="text-sm text-muted-foreground mt-1">أدخل تفاصيل مشكلتك ليتم معالجتها باحترافية</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowForm(false);
                    setCaptchaToken(null);
                  }}
                  className="rounded-full hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
                {assignedMpName && (
                  <div className="bg-accent/10 border border-accent/20 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-bold">
                      {assignedMpName[0]}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">موجه إلى النائب:</p>
                      <p className="font-bold text-accent">{assignedMpName}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground px-1">عنوان المشكلة</label>
                    <Input placeholder="مثال: انقطاع المياه في حي الأمل" value={title} onChange={(e) => setTitle(e.target.value)} className="h-14 rounded-2xl bg-muted/30 border-none focus:ring-2 focus:ring-accent" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground px-1">القطاع</label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-14 rounded-2xl bg-muted/30 border-none focus:ring-2 focus:ring-accent">
                        <SelectValue placeholder="اختر القطاع المعني" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryKeys.map((key) => (
                          <SelectItem key={key} value={t(`categories.${key}`)}>{t(`categories.${key}`)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-sm font-semibold text-foreground">وصف المشكلة</label>
                  </div>
                  <Textarea placeholder="اشرح تفاصيل المشكلة، متى بدأت، وما هي مطالبك..." value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[150px] rounded-2xl bg-muted/30 border-none focus:ring-2 focus:ring-accent resize-none p-4" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground px-1">الموقع الجغرافي</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input placeholder="حدد المنطقة أو العنوان التفصيلي" value={location} onChange={(e) => setLocation(e.target.value)} className="h-14 pl-12 rounded-2xl bg-muted/30 border-none focus:ring-2 focus:ring-accent" />
                  </div>
                  <LocationPicker onLocationSelect={(loc, lat, lng) => { setLocation(loc); setLatitude(lat); setLongitude(lng); }} />
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-semibold text-foreground px-1">المرفقات (صور أو مستندات)</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {files.map((file, i) => (
                      <div key={i} className="relative aspect-square rounded-2xl bg-muted overflow-hidden group border border-border/50">
                        <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeFile(i)} className="absolute top-2 right-2 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {files.length < 5 && (
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-2xl border-2 border-dashed border-border hover:border-accent hover:bg-accent/5 transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-accent">
                        <ImagePlus className="w-8 h-8" />
                        <span className="text-xs font-medium">إضافة صورة</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    multiple
                    accept={ALLOWED_FILE_TYPES.map((ext) => `.${ext}`).join(",")}
                    className="hidden"
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground px-1">التحقق البشري (CAPTCHA)</p>
                  <TurnstileCaptcha onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />
                </div>

                <div className="pt-4 border-t border-border/50">
                  <Button type="submit" disabled={submitting || !isFormValid || !captchaToken} className="w-full h-16 rounded-2xl bg-accent hover:bg-accent/90 text-lg font-bold shadow-xl shadow-accent/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                    {submitting ? (
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>جاري المعالجة بالذكاء الاصطناعي...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Send className="w-6 h-6" />
                        <span>إرسال الشكوى رسمياً</span>
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Issue Detail Overlay with Official Response Tracking */}
      <AnimatePresence>
        {selectedIssue && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-card border border-border shadow-2xl rounded-[32px] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-border/50 flex justify-between items-center bg-muted/30">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-6 h-6 text-accent" />
                  <div>
                    <h2 className="text-xl font-bold text-foreground">التوثيق الرسمي والمتابعة</h2>
                    <p className="text-xs text-muted-foreground">شكوى رقم: {selectedIssue.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedIssue(null)} className="rounded-full">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="overflow-y-auto p-8 space-y-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-accent/5 p-6 rounded-2xl border border-accent/10">
                  <div>
                    <h3 className="font-bold text-foreground">توليد نسخة رسمية للطباعة</h3>
                    <p className="text-xs text-muted-foreground mt-1">احتفظ بنسخة موثقة من شكواك لاستخدامها قانونياً</p>
                  </div>
                  <OfficialDocumentGenerator 
                    type="issue_report"
                    data={{
                      id: selectedIssue.id,
                      title: selectedIssue.refined_title || selectedIssue.title,
                      description: selectedIssue.refined_description || selectedIssue.description,
                      citizenName: "المواطن صاحب الشكوى",
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
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">محتوى الشكوى الموثق</h3>
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
                    <div className="bg-card border border-border/50 rounded-3xl p-6 space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-foreground">الردود الرسمية من النائب</h3>
                        <Badge className="bg-success/10 text-success border-success/20">موثق</Badge>
                      </div>

                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                        {mpResponses.length > 0 ? (
                          mpResponses.map((res) => (
                            <div key={res.id} className="bg-muted/30 p-4 rounded-2xl border border-border/30">
                              <p className="text-sm text-foreground mb-4 font-medium">{res.response_text}</p>
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] text-muted-foreground">{new Date(res.created_at).toLocaleString("ar-EG")}</span>
                                <OfficialDocumentGenerator 
                                  type="mp_response"
                                  data={{
                                    id: selectedIssue.id,
                                    title: selectedIssue.refined_title || selectedIssue.title,
                                    description: selectedIssue.refined_description || selectedIssue.description,
                                    citizenName: "المواطن صاحب الشكوى",
                                    mpName: "عضو مجلس النواب",
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
                        ) : (
                          <div className="text-center py-12 space-y-3">
                            <Clock className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                            <p className="text-muted-foreground text-sm">بانتظار رد النائب الرسمي...</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      onClick={() => {
                        setChatIssue(selectedIssue);
                        setSelectedIssue(null);
                      }}
                      variant="outline"
                      className="w-full h-14 rounded-2xl border-dashed border-accent/30 text-accent gap-2"
                    >
                      <MessageCircle className="w-5 h-5" />
                      متابعة في المحادثة المباشرة
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
          citizenUserId={user?.id || ""}
          onClose={() => setChatIssue(null)}
        />
      )}
    </div>
  );
};

export default CitizenDashboard;
