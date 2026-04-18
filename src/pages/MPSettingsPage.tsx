import { useEffect, useRef, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { sanitizeText } from "@/lib/sanitize";
import { buildAvatarPath, uploadAvatar } from "@/lib/storage";
import { Loader2 } from "lucide-react";

type BankStatus = "pending_verification" | "verified" | "rejected";

interface BankForm {
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  iban: string;
  swift: string;
  branch_name: string | null;
  country: string;
  status: BankStatus;
  rejection_reason: string | null;
}

const MPSettingsPage = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [notificationPrefs, setNotificationPrefs] = useState({
    inapp_opt_in: true,
    email_opt_in: true,
  });
  const [bank, setBank] = useState<BankForm>({
    account_holder_name: "",
    bank_name: "",
    account_number: "",
    iban: "",
    swift: "",
    branch_name: null,
    country: "Egypt",
    status: "pending_verification",
    rejection_reason: null,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);

      const [profileRes, prefsRes, bankRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("notification_preferences")
          .select("inapp_opt_in, email_opt_in")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("mp_bank_accounts")
          .select(
            "account_holder_name, bank_name, account_number, iban, swift, branch_name, country, status, rejection_reason",
          )
          .eq("mp_user_id", user.id)
          .maybeSingle(),
      ]);

      if (profileRes.data) {
        setDisplayName(profileRes.data.full_name ?? "");
        setAvatarUrl(profileRes.data.avatar_url ?? null);
      } else if (profile) {
        setDisplayName(profile.full_name ?? "");
        setAvatarUrl(profile.avatar_url ?? null);
      }

      if (prefsRes.data) {
        setNotificationPrefs({
          inapp_opt_in: prefsRes.data.inapp_opt_in ?? true,
          email_opt_in: prefsRes.data.email_opt_in ?? true,
        });
      }

      if (bankRes.data) {
        setBank({
          account_holder_name: bankRes.data.account_holder_name ?? "",
          bank_name: bankRes.data.bank_name ?? "",
          account_number: bankRes.data.account_number ?? "",
          iban: bankRes.data.iban ?? "",
          swift: bankRes.data.swift ?? "",
          branch_name: bankRes.data.branch_name ?? null,
          country: bankRes.data.country ?? "Egypt",
          status: (bankRes.data.status as BankStatus) ?? "pending_verification",
          rejection_reason: bankRes.data.rejection_reason ?? null,
        });
      }

      setLoading(false);
    };

    load();
  }, [user, profile]);

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("يرجى اختيار صورة فقط");
      return;
    }
    setUploadingAvatar(true);
    try {
      const path = buildAvatarPath(user.id, file.name);
      await uploadAvatar(path, file);
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const next = `${data.publicUrl}?t=${Date.now()}`;
      const { error } = await supabase.from("profiles").update({ avatar_url: next }).eq("user_id", user.id);
      if (error) throw error;
      setAvatarUrl(next);
      toast.success("تم تحديث الصورة");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث الصورة");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: sanitizeText(displayName) })
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("تم حفظ بيانات الملف العام");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر الحفظ");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePrefs = async () => {
    if (!user) return;
    setSavingPrefs(true);
    try {
      const { error } = await supabase.from("notification_preferences").upsert({
        user_id: user.id,
        ...notificationPrefs,
      });
      if (error) throw error;
      toast.success("تم حفظ إعدادات الإشعارات");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر الحفظ");
    } finally {
      setSavingPrefs(false);
    }
  };

  const saveBank = async () => {
    if (!user) return;
    setSavingBank(true);
    try {
      const payload = {
        mp_user_id: user.id,
        account_holder_name: sanitizeText(bank.account_holder_name),
        bank_name: sanitizeText(bank.bank_name),
        account_number: sanitizeText(bank.account_number),
        iban: sanitizeText(bank.iban),
        swift: sanitizeText(bank.swift),
        branch_name: bank.branch_name ? sanitizeText(bank.branch_name) : null,
        country: sanitizeText(bank.country || "Egypt"),
        status: "pending_verification",
        verified_by: null,
        verified_at: null,
        rejection_reason: null,
      };

      const { error } = await supabase.from("mp_bank_accounts").upsert(payload, { onConflict: "mp_user_id" });
      if (error) throw error;
      setBank((prev) => ({ ...prev, status: "pending_verification", rejection_reason: null }));
      toast.success("تم حفظ بيانات الحساب البنكي وإرسالها للمراجعة");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حفظ بيانات البنك");
    } finally {
      setSavingBank(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container py-20 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container py-6 max-w-4xl space-y-6">
        <h1 className="text-2xl font-bold">إعدادات النائب</h1>

        <Card>
          <CardHeader>
            <CardTitle>الملف العام</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-muted overflow-hidden flex items-center justify-center">
                {avatarUrl ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" /> : "م"}
              </div>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}>
                {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : "تغيير الصورة"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleAvatarUpload(file);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>الاسم الظاهر للعامة</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <Button onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ الملف العام"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>إعدادات الإشعارات</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              variant={notificationPrefs.inapp_opt_in ? "default" : "outline"}
              onClick={() => setNotificationPrefs((p) => ({ ...p, inapp_opt_in: !p.inapp_opt_in }))}
            >
              داخل التطبيق
            </Button>
            <Button
              variant={notificationPrefs.email_opt_in ? "default" : "outline"}
              onClick={() => setNotificationPrefs((p) => ({ ...p, email_opt_in: !p.email_opt_in }))}
            >
              البريد
            </Button>
            <Button onClick={savePrefs} disabled={savingPrefs}>
              {savingPrefs ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ الإشعارات"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>بيانات الحساب البنكي (مرئية للإدارة فقط)</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>اسم صاحب الحساب</Label>
              <Input value={bank.account_holder_name} onChange={(e) => setBank((p) => ({ ...p, account_holder_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>اسم البنك</Label>
              <Input value={bank.bank_name} onChange={(e) => setBank((p) => ({ ...p, bank_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>رقم الحساب</Label>
              <Input value={bank.account_number} onChange={(e) => setBank((p) => ({ ...p, account_number: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>IBAN</Label>
              <Input value={bank.iban} onChange={(e) => setBank((p) => ({ ...p, iban: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>SWIFT</Label>
              <Input value={bank.swift} onChange={(e) => setBank((p) => ({ ...p, swift: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>الفرع (اختياري)</Label>
              <Input value={bank.branch_name ?? ""} onChange={(e) => setBank((p) => ({ ...p, branch_name: e.target.value || null }))} />
            </div>
            <div className="space-y-2">
              <Label>الدولة</Label>
              <Input value={bank.country} onChange={(e) => setBank((p) => ({ ...p, country: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>الحالة</Label>
              <Input value={bank.status} disabled />
              {bank.rejection_reason && <p className="text-xs text-destructive">سبب الرفض: {bank.rejection_reason}</p>}
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-2">
              <Button onClick={saveBank} disabled={savingBank}>
                {savingBank ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ وإرسال للمراجعة"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MPSettingsPage;
