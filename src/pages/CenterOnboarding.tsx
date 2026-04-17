import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  governorate_ar: string;
  district_en: string;
  district_ar: string;
};

const CenterOnboarding = () => {
  const { user, role, profile } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [governorate, setGovernorate] = useState<string>("");
  const [centerId, setCenterId] = useState<string>("");
  // Prevent duplicate fetches when the profile dependency changes after
  // the initial auth resolution (e.g. center_id going from undefined → null).
  const fetchedRef = useRef(false);
  // Guard against concurrent in-flight requests (e.g. rapid retry clicks).
  const isFetchingRef = useRef(false);

  const fetchCenters = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    setLoadError(false);
    const { data, error } = await supabase
      .from("centers")
      .select("id, governorate_en, governorate_ar, district_en, district_ar")
      .order("governorate_ar", { ascending: true })
      .order("district_ar", { ascending: true });
    if (error) {
      setLoadError(true);
      toast.error(t("center_onboarding.load_error"));
    } else {
      setCenters((data ?? []) as Center[]);
    }
    setLoading(false);
    isFetchingRef.current = false;
  }, [t]);

  useEffect(() => {
    if (profile?.center_id) {
      navigate(role === "mp" ? "/mp" : "/citizen", { replace: true });
      return;
    }
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchCenters();
    }
  }, [fetchCenters, navigate, profile?.center_id, role]);

  const governorates = useMemo(() => {
    const seen = new Map<string, { en: string; ar: string }>();
    for (const c of centers) {
      if (!seen.has(c.governorate_en)) {
        seen.set(c.governorate_en, { en: c.governorate_en, ar: c.governorate_ar });
      }
    }
    return Array.from(seen.values());
  }, [centers]);

  const filteredCenters = useMemo(
    () => centers.filter((c) => c.governorate_en === governorate),
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
    navigate(role === "mp" ? "/mp" : "/citizen", { replace: true });
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
          ) : loadError ? (
            <div className="space-y-3 text-center py-4">
              <p className="text-sm text-destructive">{t("center_onboarding.load_error")}</p>
              <Button
                variant="outline"
                onClick={fetchCenters}
              >
                {t("common.retry")}
              </Button>
            </div>
          ) : (
            <>
              <Select
                value={governorate}
                onValueChange={(value) => {
                  setGovernorate(value);
                  setCenterId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("center_onboarding.governorate")} />
                </SelectTrigger>
                <SelectContent>
                  {governorates.map((gov) => (
                    <SelectItem key={gov.en} value={gov.en}>
                      {gov.ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={centerId} onValueChange={setCenterId} disabled={!governorate}>
                <SelectTrigger>
                  <SelectValue placeholder={t("center_onboarding.center")} />
                </SelectTrigger>
                <SelectContent>
                  {filteredCenters.map((center) => (
                    <SelectItem key={center.id} value={center.id}>
                      {center.district_ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={onSave} disabled={!governorate || !centerId || saving} className="w-full">
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
