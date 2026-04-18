import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import CitizenEngagementPanel from "@/components/CitizenEngagementPanel";
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
import { dispatchNotification } from "@/lib/notifications";
import { ATTACHMENTS_BUCKET, buildIssueAttachmentPath, uploadIssueAttachment } from "@/lib/storage";
import { analytics } from "@/lib/analytics";
import { IssueGridSkeleton } from "@/components/ListSkeletons";
import IssueProgressTracker, { mapIssueStatusToTrackerStatus } from "@/components/IssueProgressTracker";
import SeoHead from "@/components/SeoHead";
import {
  isUuidString,
  normalizeClassifyIssueResponse,
  parseVerifyUploadIntegrityResponse,
} from "@/lib/boundaryAdapters";
import { handleClientError } from "@/lib/errors";
import { ISSUE_CATEGORY_KEYS, normalizeIssueCategory, type IssueCategoryKey } from "@/lib/issueCategories";

const categoryKeys = ISSUE_CATEGORY_KEYS;

const CitizenDashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
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
  const [category, setCategory] = useState<IssueCategoryKey | "">("");
  const [location, setLocation] = useState("");
  const [issueType, setIssueType] = useState<"individual" | "collective">("individual");
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chatIssue, setChatIssue] = useState<Issue | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [reputation, setReputation] = useState<{ points: number; rank: string } | null>(null);
  const [mpResponses, setMpResponses] = useState<{ id: string; response_text: string; created_at: string; [key: string]: unknown }[]>([]);
  const [responsesState, setResponsesState] = useState<"loading" | "ready" | "empty" | "coming-soon">("empty");
  const INTEGRITY_INVOKE_FAILED = "invoke_failed";

  const isFormValid = title.trim() !== "" && 
                      description.trim() !== "" && 
                      category !== "" && 
                      location.trim() !== "";

  const issuesQuery = useQuery({
    queryKey: ["citizen-issues", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issues")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const mapped = (data ?? []).map((d) => {
        const row = d as Record<string, unknown>;
        return {
          id: d.id,
          title: d.title,
          description: d.description,
          status: d.status as Issue["status"],
          category: normalizeIssueCategory(d.category),
          location: d.location,
          timeAgo: d.created_at,
          issue_type: ((row.issue_type as string) || "individual") as "collective" | "individual",
          is_flagged: (row.is_flagged as boolean) || false,
          citizen_confirmed: (row.citizen_confirmed as boolean) || false,
          ai_summary: d.ai_summary || undefined,
          user_id: d.user_id,
          resolution_rating: row.resolution_rating as number | undefined,
          refined_title: row.refined_title as string | undefined,
          refined_description: row.refined_description as string | undefined,
        } satisfies Issue;
      });
      return mapped;
    },
  });

  const createIssueMutation = useMutation({
    mutationFn: async (payload: {
      user_id: string;
      title: string;
      description: string;
      refined_title: string;
      refined_description: string;
      category: IssueCategoryKey;
      location: string;
      issue_type: "individual" | "collective";
      ai_summary: string | null;
      priority: string;
      assigned_mp_id?: string;
      latitude?: number;
      longitude?: number;
    }) => {
      const { data, error } = await supabase.from("issues").insert(payload).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["citizen-issues", user?.id] });
    },
  });

  const issues = issuesQuery.data ?? [];
  const loading = issuesQuery.isLoading;

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

  useEffect(() => {
    let isMounted = true;
    const fetchReputation = async () => {
      if (!user?.id) {
        if (isMounted) setReputation(null);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("reputation_points, reputation_rank")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!isMounted || error || !data) {
        if (isMounted) setReputation(null);
        return;
      }
      const row = data as Record<string, unknown>;
      const points = typeof row.reputation_points === "number" ? row.reputation_points : null;
      const rank = typeof row.reputation_rank === "string" && row.reputation_rank.trim().length > 0
        ? row.reputation_rank
        : null;
      if (!isMounted) return;
      setReputation(points !== null && rank ? { points, rank } : null);
    };
    void fetchReputation();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (mpIdParam && mpNameParam) {
      if (isUuidString(mpIdParam)) {
        setAssignedMpId(mpIdParam);
        setAssignedMpName(decodeURIComponent(mpNameParam));
      } else {
        handleClientError(
          {
            code: "issue.assignment.invalid_mp_id",
            message: "معرف النائب غير صالح",
            retryable: false,
          },
          undefined,
          { showToast: true, extras: { boundary: "citizen.mp_id_param" } },
        );
        setAssignedMpId(null);
        setAssignedMpName(null);
      }
      setShowForm(true);
      setSearchParams({}, { replace: true });
      setCaptchaToken(null);
    }
  }, [mpIdParam, mpNameParam, setSearchParams]);

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

      let path: string;
      try {
        path = buildIssueAttachmentPath(user!.id, issueId, file.name);
        await uploadIssueAttachment(path, file);
      } catch (uploadError) {
        console.error("Upload error:", uploadError);
        continue;
      }

      // ── FIX #4: Verify integrity via Edge Function ───────────────────────────
      const { data: integrityData, error: integrityError } = await supabase.functions.invoke(
        "verify-upload-integrity",
        { body: { storagePath: path, expectedHash: preHash } },
      );
      let parsedIntegrity: { valid: boolean; error?: string } = { valid: false, error: INTEGRITY_INVOKE_FAILED };
      if (!integrityError) {
        try {
          parsedIntegrity = parseVerifyUploadIntegrityResponse(integrityData);
        } catch (parseError) {
          handleClientError(
            {
              code: "issue.upload.integrity_invalid_response",
              message: t("dashboard.file_integrity_failed"),
              retryable: true,
            },
            parseError,
            { showToast: false, extras: { file_name: file.name, boundary: "verify-upload-integrity.parse" } },
          );
        }
      }
      if (integrityError || !parsedIntegrity.valid) {
        handleClientError(
          {
            code: "issue.upload.integrity_failed",
            message: t("dashboard.file_integrity_failed"),
            retryable: true,
          },
          integrityError ?? parsedIntegrity.error,
          { showToast: false, extras: { file_name: file.name, boundary: "verify-upload-integrity" } },
        );
        // Remove the corrupted upload
        if (path.includes('..')) {
          throw new Error('Invalid path');
        }
        await supabase.storage.from("issue-attachments").remove([path]);
        toast.error(`${t("dashboard.file_integrity_failed")}: ${file.name}`);
        continue;
      }

      await supabase.from("issue_attachments").insert({
        issue_id: issueId,
        bucket: ATTACHMENTS_BUCKET,
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
          toast.error(t("dashboard.egypt_only"));
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
      let finalCategory: IssueCategoryKey = category || "other";
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
        toast.info(t("dashboard.classifying_ai"));
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
          const normalizedClassify = normalizeClassifyIssueResponse(classifyData, {
            title,
            description,
            category: category || "other",
            issueType,
            aiSummary: null,
            priority: "normal",
          });

          if (normalizedClassify.rejected) {
            // Check if rejection is due to location being outside Egypt
            if (normalizedClassify.rejectionReason && normalizedClassify.rejectionReason.includes("location")) {
              toast.error(t("dashboard.egypt_only"));
            } else {
              toast.error(normalizedClassify.rejectionReason || t("dashboard.rejected"));
            }
            setSubmitting(false);
            return;
          }

          if (normalizedClassify.usedFallback) {
            handleClientError(
              {
                code: "issue.classify.invalid_response",
                message: t("dashboard.ai_unavailable"),
                retryable: true,
              },
              undefined,
              { showToast: false, extras: { boundary: "classify-issue.normalize" } },
            );
          }

          finalTitle = normalizedClassify.title;
          finalDescription = normalizedClassify.description;
          const aiSuggestedCategory = normalizeIssueCategory(normalizedClassify.category);
          const aiSuggestedPriority = normalizedClassify.priority;
          const userSelectedCategory = category || "other";
          const userSelectedPriority = "normal";
          const classificationChanged =
            aiSuggestedCategory !== userSelectedCategory ||
            aiSuggestedPriority !== userSelectedPriority;

          if (classificationChanged) {
            const acceptAiClassification = window.confirm(
              t("dashboard.ai_classification_confirm", {
                category: aiSuggestedCategory,
                priority: aiSuggestedPriority,
                defaultValue: `AI classified your issue as "${aiSuggestedCategory}" with "${aiSuggestedPriority}" priority. Apply this classification?`,
              }),
            );
            if (!acceptAiClassification) {
              toast.info(
                t("dashboard.ai_classification_rejected", {
                  defaultValue: "AI classification was skipped. Your selected/default classification will be used.",
                }),
              );
            } else {
              toast.success(
                t("dashboard.ai_classification_applied", {
                  category: aiSuggestedCategory,
                  priority: aiSuggestedPriority,
                  defaultValue: `AI classification applied: ${aiSuggestedCategory} (${aiSuggestedPriority}).`,
                }),
              );
            }
            finalCategory = acceptAiClassification ? aiSuggestedCategory : userSelectedCategory;
            priority = acceptAiClassification ? aiSuggestedPriority : userSelectedPriority;
          } else {
            finalCategory = aiSuggestedCategory;
            priority = aiSuggestedPriority;
          }
          finalIssueType = normalizedClassify.issueType;
          aiSummary = normalizedClassify.aiSummary;
        } else if (classifyError) {
          handleClientError(
            {
              code: "issue.classify.invoke_failed",
              message: t("dashboard.ai_unavailable"),
              retryable: true,
            },
            classifyError,
            { showToast: false, extras: { boundary: "classify-issue.invoke" } },
          );
        }
      } catch (err) {
        handleClientError(
          {
            code: "issue.classify.invalid_response",
            message: t("dashboard.ai_unavailable"),
            retryable: true,
          },
          err,
          { showToast: false, extras: { boundary: "classify-issue.parse" } },
        );
        setSubmitting(false);
        return;
      }

      const insertedIssue = await createIssueMutation.mutateAsync({
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
      });

      if (files.length > 0) {
        await uploadFiles(insertedIssue.id);
      }

      // Notify citizen and assigned MP (if provided)
      await dispatchNotification({
        recipients: [user.id],
        issueId: insertedIssue.id,
        event: "issue_submitted",
        csrfHeader,
        csrfToken,
      });

      if (assignedMpId) {
        await dispatchNotification({
          recipients: [assignedMpId],
          issueId: insertedIssue.id,
          event: "issue_assigned",
          actorName: senderName || undefined,
          csrfHeader,
          csrfToken,
        });
      }

      toast.success(t("dashboard.issue_submitted"));
      analytics.track("issue_submitted", {
        category: finalCategory,
        has_attachments: files.length > 0,
        has_assigned_mp: !!assignedMpId,
        issue_type: finalIssueType,
        priority,
      });
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
      await queryClient.invalidateQueries({ queryKey: ["citizen-issues", user.id] });
    } catch (err: unknown) {
      analytics.track("issue_submission_failed");
      handleClientError(
        { code: "issue.submit.failed", message: t("dashboard.error_submitting"), retryable: true },
        err,
        { showToast: false, extras: { boundary: "issues.insert" } },
      );
      toast.error(t("dashboard.error_submitting"));
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
      <SeoHead title={t("seo.citizen_dashboard_title")} description={t("seo.citizen_dashboard_description")} path="/citizen" />
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full blur-3xl" style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.08) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full blur-3xl" style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.08) 0%, transparent 70%)" }} />
      </div>

      <AppHeader />

      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">{t("dashboard.title")}</h1>
              {reputation && <ReputationBadge points={reputation.points} rank={reputation.rank} />}
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
                {t("dashboard.legal_assistant")}
              </TabsTrigger>
              <TabsTrigger value="mobile-app" className="gap-2 data-[state=active]:bg-accent">
                <Smartphone className="w-4 h-4" />
                {t("dashboard.mobile_app")}
              </TabsTrigger>
              <TabsTrigger value="engagement" className="gap-2 data-[state=active]:bg-accent">
                <FileText className="w-4 h-4" />
                {t("dashboard.engagement")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="issues" className="space-y-6">
              {loading ? (
                <IssueGridSkeleton />
              ) : issuesQuery.isError ? (
                <div className="text-center py-20 bg-card/30 border border-dashed border-border/50 rounded-3xl">
                  <h3 className="text-xl font-semibold text-foreground mb-2">{t("common.error")}</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">{t("auth.error_network")}</p>
                  <Button onClick={() => issuesQuery.refetch()} variant="outline" className="mt-6 rounded-xl">
                    {t("common.retry")}
                  </Button>
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

            <TabsContent value="engagement">
              <CitizenEngagementPanel />
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
                      <p className="text-xs text-muted-foreground">{t("dashboard.issue_to_mp")}</p>
                      <p className="font-bold text-accent">{assignedMpName}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground px-1">{t("dashboard.title")}</label>
                    <Input placeholder={t("dashboard.title_placeholder")} value={title} onChange={(e) => setTitle(e.target.value)} className="h-14 rounded-2xl bg-muted/30 border-none focus:ring-2 focus:ring-accent" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground px-1">{t("dashboard.category")}</label>
                    <Select value={category} onValueChange={(value) => setCategory(normalizeIssueCategory(value))}>
                      <SelectTrigger className="h-14 rounded-2xl bg-muted/30 border-none focus:ring-2 focus:ring-accent">
                        <SelectValue placeholder={t("dashboard.category_placeholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryKeys.map((key) => (
                          <SelectItem key={key} value={key}>{t(`categories.${key}`)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground px-1">{t("dashboard.description")}</label>
                  <Textarea placeholder={t("dashboard.description_placeholder")} value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[150px] rounded-2xl bg-muted/30 border-none focus:ring-2 focus:ring-accent resize-none p-4" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground px-1">{t("dashboard.location")}</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input placeholder={t("dashboard.location_placeholder")} value={location} onChange={(e) => setLocation(e.target.value)} className="h-14 pl-12 rounded-2xl bg-muted/30 border-none focus:ring-2 focus:ring-accent" />
                  </div>
                  <LocationPicker latitude={latitude} longitude={longitude} onChange={(lat, lng) => { setLatitude(lat); setLongitude(lng); }} />
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-semibold text-foreground px-1">{t("dashboard.attach_files")}</label>
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
                        <span className="text-xs font-medium">{t("dashboard.add_image")}</span>
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
                  <p className="text-sm font-semibold text-foreground px-1">{t("dashboard.captcha")}</p>
                  <TurnstileCaptcha onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />
                </div>

                <div className="pt-4 border-t border-border/50">
                  <Button type="submit" disabled={submitting || !isFormValid || !captchaToken} className="w-full h-16 rounded-2xl bg-accent hover:bg-accent/90 text-lg font-bold shadow-xl shadow-accent/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                    {submitting ? (
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>{t("dashboard.classifying_ai")}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Send className="w-6 h-6" />
                        <span>{t("dashboard.submit")}</span>
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
                <div className="bg-card border border-border/50 rounded-3xl p-5">
                  <IssueProgressTracker status={mapIssueStatusToTrackerStatus(selectedIssue.status)} />
                </div>
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
                        {responsesState === "coming-soon" ? (
                          <Badge className="bg-warning/10 text-warning border-warning/20">
                            {t("common.coming_soon", { defaultValue: "قريبًا" })}
                          </Badge>
                        ) : (
                          <Badge className="bg-success/10 text-success border-success/20">موثق</Badge>
                        )}
                      </div>

                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                        {responsesState === "loading" ? (
                          <div className="text-center py-12 space-y-3">
                            <Clock className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                            <p className="text-muted-foreground text-sm">
                              {t("dashboard.loading_responses", { defaultValue: "جارٍ تحميل الردود الرسمية..." })}
                            </p>
                          </div>
                        ) : mpResponses.length > 0 ? (
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
                        ) : responsesState === "coming-soon" ? (
                          <div className="text-center py-12 space-y-3">
                            <Clock className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                            <p className="text-muted-foreground text-sm">
                              {t("dashboard.responses_coming_soon", { defaultValue: "ميزة الردود الرسمية الكاملة ستكون متاحة قريبًا." })}
                            </p>
                          </div>
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
          isMP={false}
          onClose={() => setChatIssue(null)}
        />
      )}
    </div>
  );
};

export default CitizenDashboard;
