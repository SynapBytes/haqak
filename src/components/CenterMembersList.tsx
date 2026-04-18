import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { Loader2, Users, ShieldCheck, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface CenterMember {
  display_name: string;
  role: "citizen" | "mp";
  is_verified: boolean;
}

const PAGE_SIZE = 20;

/**
 * CenterMembersList
 *
 * Displays a paginated list of members registered in the same center as the
 * currently authenticated user.  The center_id is resolved entirely server-side
 * by the `get_center_members` RPC so the client can never request data for a
 * different center (IDOR prevention).
 *
 * Shows: display name, role badge (citizen / MP), verified badge.
 * Does NOT expose: emails, phone numbers, national IDs, or any other PII.
 */
const CenterMembersList = () => {
  const { user, profile } = useAuth();
  const { t } = useTranslation();
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<CenterMember[]>({
    queryKey: ["center-members", user?.id, page],
    enabled: !!user && !!profile?.center_id,
    queryFn: async () => {
      const { data: rows, error } = await supabase.rpc("get_center_members", {
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
      });
      if (error) throw error;
      return (rows ?? []) as CenterMember[];
    },
    staleTime: 60_000, // 1 minute
  });

  // User hasn't completed onboarding yet
  if (!profile?.center_id) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">
        <Users className="w-8 h-8 mx-auto mb-3 opacity-40" />
        <p>{t("center_members.no_center")}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">{t("center_members.loading")}</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-10 space-y-3">
        <AlertCircle className="w-8 h-8 mx-auto text-destructive opacity-70" />
        <p className="text-sm text-destructive">{t("center_members.error")}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          {t("center_members.retry")}
        </Button>
      </div>
    );
  }

  const members = data ?? [];

  if (members.length === 0 && page === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">
        <Users className="w-8 h-8 mx-auto mb-3 opacity-40" />
        <p>{t("center_members.empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {members.map((member, idx) => (
          <div
            key={`${member.display_name}-${idx}`}
            className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/50 px-4 py-3"
          >
            {/* Avatar placeholder */}
            <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center shrink-0 text-accent font-bold text-sm">
              {member.display_name.charAt(0)}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{member.display_name}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <Badge
                  variant={member.role === "mp" ? "default" : "secondary"}
                  className="text-xs h-5"
                >
                  {member.role === "mp" ? t("center_members.role_mp") : t("center_members.role_citizen")}
                </Badge>
                {member.is_verified && (
                  <Badge variant="outline" className="text-xs h-5 border-green-500/50 text-green-600 dark:text-green-400 gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    {t("center_members.verified")}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination controls */}
      {(page > 0 || members.length === PAGE_SIZE) && (
        <div className="flex items-center justify-between pt-2">
          {page > 0 && (
            <Button
              variant="ghost"
              size="sm"
              disabled={isFetching}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              ← السابق
            </Button>
          )}

          {members.length === PAGE_SIZE && (
            <Button
              variant="outline"
              size="sm"
              disabled={isFetching}
              onClick={() => setPage((p) => p + 1)}
              className="mr-auto"
            >
              {isFetching ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : null}
              {t("center_members.load_more")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default CenterMembersList;
