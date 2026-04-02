import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

type Center = {
  id: string;
  governorate_en: string;
  district_en: string;
};

const CenterOnboarding = () => {
  const { user, role, profile } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [governorate, setGovernorate] = useState<string>("");
  const [centerId, setCenterId] = useState<string>("");

  useEffect(() => {
    if (profile?.center_id) {
      navigate(role === "mp" ? "/mp" : "/citizen", { replace: true });
      return;
    }
    const fetchCenters = async () => {
      const { data, error } = await supabase
        .from("centers")
        .select("id, governorate_en, district_en")
        .order("governorate_en", { ascending: true })
        .order("district_en", { ascending: true });
      if (error) {
        toast.error(t("center_onboarding.load_error"));
      } else {
        setCenters((data ?? []) as Center[]);
      }
      setLoading(false);
    };
    fetchCenters();
  }, [navigate, profile?.center_id, role, t]);

  const governorates = useMemo(
    () => Array.from(new Set(centers.map((c) => c.governorate_en))),
    [centers],
  );

  const filteredCenters = useMemo(
    () => centers.filter((c) => !governorate || c.governorate_en === governorate),
    [centers, governorate],
  );

  const onSave = async () => {
    if (!user || !centerId) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ center_id: centerId })
      .eq("user_id", user.id);
    if (error) {
      toast.error(error.message || t("center_onboarding.save_error"));
      setSaving(false);
      return;
    }
    toast.success(t("center_onboarding.saved"));
    navigate(role === "mp" ? "/mp" : "/mps", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container max-w-xl py-10">
        <Card className="p-6 space-y-4">
          <h1 className="text-xl font-bold">{t("center_onboarding.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("center_onboarding.subtitle")}
          </p>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
          ) : (
            <>
              <Select
                value={governorate || "__none"}
                onValueChange={(value) => {
                  const next = value === "__none" ? "" : value;
                  setGovernorate(next);
                  setCenterId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("center_onboarding.governorate")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">{t("center_onboarding.all_governorates")}</SelectItem>
                  {governorates.map((gov) => (
                    <SelectItem key={gov} value={gov}>
                      {gov}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={centerId} onValueChange={setCenterId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("center_onboarding.center")} />
                </SelectTrigger>
                <SelectContent>
                  {filteredCenters.map((center) => (
                    <SelectItem key={center.id} value={center.id}>
                      {center.governorate_en} / {center.district_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={onSave} disabled={!centerId || saving} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("center_onboarding.continue")}
              </Button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default CenterOnboarding;
