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
import { LOCAL_CENTERS, LOCAL_GOVERNORATES } from "@/data/egyptCentersData";

// Center rows returned from the Supabase `centers` table.
type Center = {
  id: string;
  governorate_en: string;
  governorate_ar: string;
  district_en: string;
  district_ar: string;
};

// Build a stable fallback Center list from the local dataset.
// `id` is left empty because the UUID is only available from the DB.
const FALLBACK_CENTERS: Center[] = LOCAL_CENTERS.map((lc) => ({
  id: "",
  governorate_en: lc.governorate_en,
  governorate_ar: lc.governorate_ar,
  district_en: lc.district_en,
  district_ar: lc.district_ar,
}));

const CenterOnboarding = () => {
  const { user, role, profile } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  // True when the Supabase fetch failed or returned 0 rows and we are
  // showing data from the local fallback dataset instead.
  const [usingFallback, setUsingFallback] = useState(false);
  const [saving, setSaving] = useState(false);
  const [governorate, setGovernorate] = useState<string>("");
  // In normal mode centerId holds the Supabase UUID.
  // In fallback mode centerId holds district_en (resolved to UUID on save).
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

    if (error || !data?.length) {
      // Failed or empty table: fall back to the local dataset so the
      // dropdowns are still usable.  On save we will re-query Supabase
      // for the UUID using the selected governorate + district pair.
      setLoadError(true);
      setUsingFallback(true);
      setCenters(FALLBACK_CENTERS);
      // Preserve governorate/center selections the user may have already made.
      setCenterId("");
      setGovernorate("");
      toast.error(t("center_onboarding.load_error"));
    } else {
      setCenters(data as Center[]);
      setUsingFallback(false);
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
    if (usingFallback) return LOCAL_GOVERNORATES;
    const seen = new Map<string, { en: string; ar: string }>();
    for (const c of centers) {
      if (!seen.has(c.governorate_en)) {
        seen.set(c.governorate_en, { en: c.governorate_en, ar: c.governorate_ar });
      }
    }
    return Array.from(seen.values());
  }, [centers, usingFallback]);

  const filteredCenters = useMemo(
    () => centers.filter((c) => c.governorate_en === governorate),
    [centers, governorate],
  );

  const onSave = async () => {
    if (!user || !centerId || !governorate) return;

    // Validate that the selected center actually belongs to the selected
    // governorate before sending anything to the server.
    const isConsistent = filteredCenters.some(
      (c) => (usingFallback ? c.district_en : c.id) === centerId,
    );
    if (!isConsistent) {
      toast.error(t("center_onboarding.save_error"));
      return;
    }

    setSaving(true);

    let resolvedCenterId = centerId;

    if (usingFallback) {
      // centerId is district_en in fallback mode — resolve to the real UUID.
      const { data: centerData, error: lookupError } = await supabase
        .from("centers")
        .select("id")
        .eq("governorate_en", governorate)
        .eq("district_en", centerId)
        .maybeSingle();

      if (lookupError || !centerData?.id) {
        toast.error(t("center_onboarding.save_error"));
        setSaving(false);
        return;
      }
      resolvedCenterId = centerData.id;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ center_id: resolvedCenterId })
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
          ) : (
            <>
              {loadError && (
                <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-sm text-destructive">{t("center_onboarding.load_error")}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      fetchedRef.current = false;
                      fetchCenters();
                    }}
                  >
                    {t("common.retry")}
                  </Button>
                </div>
              )}

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
                    <SelectItem
                      key={center.district_en}
                      value={usingFallback ? center.district_en : center.id}
                    >
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
