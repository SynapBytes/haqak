import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { dispatchNotification } from "@/lib/notifications";
import { sanitizeText } from "@/lib/sanitize";

type RequestRow = {
  id: string;
  mp_user_id: string;
  center_id: string;
  type: "renomination";
  message: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
  decision_note: string | null;
};

type ProfileMinimal = {
  user_id: string;
  full_name: string;
  governorate: string | null;
  district: string | null;
};

const AdminRenominationPanel = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const requestsQuery = useQuery({
    queryKey: ["admin-renomination-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mp_admin_requests")
        .select("id, mp_user_id, center_id, type, message, status, created_at, decided_at, decided_by, decision_note")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RequestRow[];
    },
  });

  const mpProfilesQuery = useQuery({
    queryKey: ["admin-renomination-mp-profiles", requestsQuery.data?.map((r) => r.mp_user_id).join(",")],
    enabled: (requestsQuery.data?.length ?? 0) > 0,
    queryFn: async () => {
      const ids = Array.from(new Set((requestsQuery.data ?? []).map((r) => r.mp_user_id)));
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, governorate, district")
        .in("user_id", ids);
      if (error) throw error;
      return (data ?? []) as ProfileMinimal[];
    },
  });

  const profileMap = useMemo(() => new Map((mpProfilesQuery.data ?? []).map((p) => [p.user_id, p])), [mpProfilesQuery.data]);

  const decideMutation = useMutation({
    mutationFn: async ({
      request,
      status,
      decisionNote,
    }: {
      request: RequestRow;
      status: "approved" | "rejected";
      decisionNote: string;
    }) => {
      const sanitizedNote = sanitizeText(decisionNote);
      const { error } = await supabase
        .from("mp_admin_requests")
        .update({
          status,
          decision_note: sanitizedNote || null,
          decided_at: new Date().toISOString(),
          decided_by: user?.id ?? null,
        })
        .eq("id", request.id);
      if (error) throw error;

      if (status === "approved") {
        const mpProfile = profileMap.get(request.mp_user_id);
        const centerText = [mpProfile?.governorate, mpProfile?.district].filter(Boolean).join(" / ");
        const mpName = sanitizeText(mpProfile?.full_name ?? "عضو مجلس النواب");
        const message = `تعلن الإدارة اعتماد طلب إعادة الترشح للنائب ${mpName}${centerText ? ` عن ${centerText}` : ""}.`;

        await dispatchNotification({
          event: "renomination_approved",
          title: "إعلان رسمي من الإدارة",
          body: message,
          channels: ["email"],
          target: {
            roles: ["citizen"],
            center_id: request.center_id,
            verified_only: true,
          },
          data_json: { mp_admin_request_id: request.id, mp_user_id: request.mp_user_id },
        });
      }
    },
    onSuccess: async () => {
      toast.success("تم حفظ القرار");
      await qc.invalidateQueries({ queryKey: ["admin-renomination-requests"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر حفظ القرار");
    },
  });

  const pending = (requestsQuery.data ?? []).filter((r) => r.status === "pending");

  return (
    <div className="space-y-3">
      {pending.length === 0 ? (
        <div className="rounded-2xl border border-border/50 bg-card/70 p-5 text-sm text-muted-foreground">
          لا توجد طلبات إعادة ترشح معلقة.
        </div>
      ) : (
        pending.map((request) => {
          const profile = profileMap.get(request.mp_user_id);
          return (
            <div key={request.id} className="rounded-2xl border border-border/50 bg-card/70 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="font-semibold">{profile?.full_name ?? request.mp_user_id}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(request.created_at).toLocaleString("ar-EG")}
                  </div>
                </div>
                <Badge>pending</Badge>
              </div>
              <div className="text-sm whitespace-pre-wrap">{request.message}</div>

              <DecisionActions
                requestId={request.id}
                disabled={decideMutation.isPending}
                onApprove={(note) => decideMutation.mutate({ request, status: "approved", decisionNote: note })}
                onReject={(note) => decideMutation.mutate({ request, status: "rejected", decisionNote: note })}
              />
            </div>
          );
        })
      )}
    </div>
  );
};

const DecisionActions = ({
  requestId,
  onApprove,
  onReject,
  disabled,
}: {
  requestId: string;
  onApprove: (note: string) => void;
  onReject: (note: string) => void;
  disabled: boolean;
}) => {
  const defaultNote = "تمت المراجعة من الإدارة";
  const [note, setNote] = useState(defaultNote);
  return (
    <div className="space-y-2">
      <Textarea
        id={`decision-note-${requestId}`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex gap-2">
        <Button size="sm" disabled={disabled} onClick={() => onApprove(note || defaultNote)}>
          موافقة
        </Button>
        <Button size="sm" variant="outline" disabled={disabled} onClick={() => onReject(note || defaultNote)}>
          رفض
        </Button>
      </div>
    </div>
  );
};

export default AdminRenominationPanel;
