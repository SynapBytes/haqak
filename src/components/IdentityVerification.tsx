import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Upload, CheckCircle2, XCircle, Clock } from "lucide-react";
import { stripExifFromFile } from "@/lib/stripExif";
import { buildIdentityVerificationPath, getSignedDownloadUrl, uploadIdentityVerificationImage } from "@/lib/storage";
import { CSRF_HEADER, getOrCreateToken } from "@/lib/csrfToken";

type VerificationStatus = "pending" | "verified" | "rejected";

interface VerificationRow {
  id: string;
  status: VerificationStatus;
  id_front_path: string;
  id_back_path: string;
  extracted_fields_json: Record<string, unknown> | null;
  submitted_at: string;
  decided_at: string | null;
  rejection_reason: string | null;
}

const IdentityVerification = ({ onVerified }: { onVerified: () => void }) => {
  const { user, profile, role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [verification, setVerification] = useState<VerificationRow | null>(null);
  const [frontPreviewUrl, setFrontPreviewUrl] = useState<string | null>(null);
  const [backPreviewUrl, setBackPreviewUrl] = useState<string | null>(null);

  const canSubmit = useMemo(() => !!frontFile && !!backFile && !!user, [frontFile, backFile, user]);

  const loadVerification = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    const { data } = await supabase
      .from("identity_verifications")
      .select("id, status, id_front_path, id_back_path, extracted_fields_json, submitted_at, decided_at, rejection_reason")
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setVerification((data as VerificationRow | null) ?? null);
    setRefreshing(false);
  }, [user]);

  useEffect(() => {
    void loadVerification();
  }, [loadVerification]);

  const getRoleForRecord = () => {
    return role ?? "citizen";
  };

  const updateSignedPreviews = async (row: VerificationRow) => {
    try {
      const [front, back] = await Promise.all([
        getSignedDownloadUrl("id_verifications", row.id_front_path, 60),
        getSignedDownloadUrl("id_verifications", row.id_back_path, 60),
      ]);
      setFrontPreviewUrl(front);
      setBackPreviewUrl(back);
    } catch {
      setFrontPreviewUrl(null);
      setBackPreviewUrl(null);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || !user) return;
    setLoading(true);
    try {
      const cleanFront = await stripExifFromFile(frontFile!);
      const cleanBack = await stripExifFromFile(backFile!);

      const insertPayload = {
        user_id: user.id,
        role: getRoleForRecord(),
        center_id_snapshot: profile?.center_id ?? null,
        status: "pending" as const,
        id_front_path: "pending",
        id_back_path: "pending",
      };

      const { data: created, error: createError } = await supabase
        .from("identity_verifications")
        .insert(insertPayload)
        .select("id")
        .single();
      if (createError || !created?.id) throw createError ?? new Error("Failed to create verification");

      const frontPath = buildIdentityVerificationPath(user.id, created.id, "front", cleanFront.name);
      const backPath = buildIdentityVerificationPath(user.id, created.id, "back", cleanBack.name);

      await uploadIdentityVerificationImage(frontPath, cleanFront);
      await uploadIdentityVerificationImage(backPath, cleanBack);

      const { error: updateError } = await supabase
        .from("identity_verifications")
        .update({ id_front_path: frontPath, id_back_path: backPath })
        .eq("id", created.id);
      if (updateError) throw updateError;

      const { error: ocrInvokeError } = await supabase.functions.invoke("verify-identity-ocr", {
        body: {
          verification_id: created.id,
          front_path: frontPath,
          back_path: backPath,
        },
        headers: {
          [CSRF_HEADER]: getOrCreateToken(),
        },
      });
      if (ocrInvokeError) {
        toast.warning("تم إرسال المستندات، وسيتم إكمال المراجعة يدويًا.");
      }

      toast.success("تم إرسال طلب التحقق بنجاح.");
      setFrontFile(null);
      setBackFile(null);
      await loadVerification();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "حدث خطأ أثناء إرسال طلب التحقق");
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (status: VerificationStatus) => {
    if (status === "verified") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs text-success">
          <CheckCircle2 className="h-3 w-3" /> موثق
        </span>
      );
    }
    if (status === "rejected") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-1 text-xs text-destructive">
          <XCircle className="h-3 w-3" /> مرفوض
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-1 text-xs text-warning">
        <Clock className="h-3 w-3" /> قيد المراجعة
      </span>
    );
  };

  return (
    <Card className="border-accent/20 bg-card/50 backdrop-blur-md overflow-hidden">
      <CardHeader className="bg-accent/5 border-b border-accent/10">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <ShieldCheck className="w-5 h-5 text-accent" />
          التحقق من الهوية
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {(role === "admin" || role === "moderator") ? (
          <p className="text-sm text-muted-foreground">
            التحقق من الهوية متاح لحسابات المواطنين والنواب فقط.
          </p>
        ) : verification ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                آخر طلب: {new Date(verification.submitted_at).toLocaleString("ar-EG")}
              </p>
              {statusBadge(verification.status)}
            </div>
            {verification.rejection_reason && (
              <p className="text-xs text-destructive bg-destructive/10 rounded-md p-2">
                سبب الرفض: {verification.rejection_reason}
              </p>
            )}
            {verification.status === "verified" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onVerified()}
              >
                تحديث الحالة
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await updateSignedPreviews(verification);
                }}
                disabled={refreshing}
              >
                {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : "عرض صور البطاقة"}
              </Button>
              <Button size="sm" variant="ghost" onClick={loadVerification} disabled={refreshing}>
                تحديث
              </Button>
            </div>
            {(frontPreviewUrl || backPreviewUrl) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {frontPreviewUrl && (
                  <a href={frontPreviewUrl} target="_blank" rel="noreferrer" className="text-xs text-accent underline">
                    عرض الوجه الأمامي
                  </a>
                )}
                {backPreviewUrl && (
                  <a href={backPreviewUrl} target="_blank" rel="noreferrer" className="text-xs text-accent underline">
                    عرض الوجه الخلفي
                  </a>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              ارفع صورة الوجه الأمامي والخلفي لبطاقة الرقم القومي لمراجعتها.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="id-front">الوجه الأمامي</Label>
                <Input
                  id="id-front"
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(e) => setFrontFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="id-back">الوجه الخلفي</Label>
                <Input
                  id="id-back"
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(e) => setBackFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
            <Button onClick={handleSubmit} disabled={!canSubmit || loading} className="w-full gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              إرسال طلب التحقق
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default IdentityVerification;
