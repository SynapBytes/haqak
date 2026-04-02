import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type PollRow = {
  id: string;
  title: string;
  description: string | null;
  status: "open" | "closed";
  created_at: string;
};

type PollResultRow = {
  poll_id: string;
  yes_count: number;
  no_count: number;
  total: number;
  yes_percentage: number;
  no_percentage: number;
};

type PollVoteRow = {
  poll_id: string;
  vote_value: "yes" | "no";
};

type AnnouncementRow = {
  id: string;
  type: "event" | "conference" | "opening" | "general";
  title: string;
  body: string;
  event_datetime: string | null;
  address_text: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
};

const CitizenEngagementPanel = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["citizen-engagement-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("center_id, verification_status")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const pollsQuery = useQuery({
    queryKey: ["citizen-polls", profileQuery.data?.center_id],
    enabled: !!profileQuery.data?.center_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("polls")
        .select("id, title, description, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PollRow[];
    },
  });

  const pollResultsQuery = useQuery({
    queryKey: ["citizen-poll-results", pollsQuery.data?.map((p) => p.id).join(",")],
    enabled: (pollsQuery.data?.length ?? 0) > 0,
    queryFn: async () => {
      const pollIds = (pollsQuery.data ?? []).map((p) => p.id);
      const { data, error } = await supabase
        .from("poll_results")
        .select("poll_id, yes_count, no_count, total, yes_percentage, no_percentage")
        .in("poll_id", pollIds);
      if (error) throw error;
      return (data ?? []) as PollResultRow[];
    },
  });

  const votesQuery = useQuery({
    queryKey: ["citizen-poll-votes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("poll_votes")
        .select("poll_id, vote_value")
        .eq("voter_user_id", user!.id);
      if (error) throw error;
      return (data ?? []) as PollVoteRow[];
    },
  });

  const announcementsQuery = useQuery({
    queryKey: ["citizen-announcements", profileQuery.data?.center_id],
    enabled: !!profileQuery.data?.center_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("id, type, title, body, event_datetime, address_text, lat, lng, created_at")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AnnouncementRow[];
    },
  });

  const resultMap = useMemo(
    () => new Map((pollResultsQuery.data ?? []).map((r) => [r.poll_id, r])),
    [pollResultsQuery.data],
  );

  const voteMap = useMemo(
    () => new Map((votesQuery.data ?? []).map((v) => [v.poll_id, v.vote_value])),
    [votesQuery.data],
  );

  const voteMutation = useMutation({
    mutationFn: async ({ pollId, value }: { pollId: string; value: "yes" | "no" }) => {
      if (profileQuery.data?.verification_status !== "verified") {
        throw new Error("التصويت متاح فقط للمواطنين الموثقين");
      }
      const { error } = await supabase.from("poll_votes").insert({
        poll_id: pollId,
        voter_user_id: user!.id,
        vote_value: value,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("تم تسجيل صوتك");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["citizen-poll-votes", user?.id] }),
        qc.invalidateQueries({ queryKey: ["citizen-poll-results"] }),
      ]);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر تسجيل التصويت");
    },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/50 bg-card/70 p-4 space-y-3">
        <h3 className="font-semibold">استطلاعات المركز</h3>
        {profileQuery.data?.verification_status !== "verified" && (
          <div className="text-sm text-warning">يمكنك الاطلاع على النتائج، لكن التصويت متاح بعد التحقق.</div>
        )}
        <div className="space-y-2">
          {(pollsQuery.data ?? []).map((poll) => {
            const result = resultMap.get(poll.id);
            const myVote = voteMap.get(poll.id);
            return (
              <div key={poll.id} className="rounded-xl border border-border/40 p-3 text-sm space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{poll.title}</span>
                  <Badge variant={poll.status === "open" ? "default" : "secondary"}>
                    {poll.status === "open" ? "مفتوح" : "مغلق"}
                  </Badge>
                </div>
                {poll.description && <div className="text-muted-foreground">{poll.description}</div>}
                <div className="text-muted-foreground">
                  نعم: {result?.yes_count ?? 0} ({result?.yes_percentage ?? 0}%) • لا: {result?.no_count ?? 0} ({result?.no_percentage ?? 0}%)
                </div>
                {myVote ? (
                  <div className="text-xs">صوتك: <strong>{myVote === "yes" ? "نعم" : "لا"}</strong></div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={poll.status !== "open" || profileQuery.data?.verification_status !== "verified" || voteMutation.isPending}
                      onClick={() => voteMutation.mutate({ pollId: poll.id, value: "yes" })}
                    >
                      نعم
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={poll.status !== "open" || profileQuery.data?.verification_status !== "verified" || voteMutation.isPending}
                      onClick={() => voteMutation.mutate({ pollId: poll.id, value: "no" })}
                    >
                      لا
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/70 p-4 space-y-3">
        <h3 className="font-semibold">إعلانات وفعاليات المركز</h3>
        <div className="space-y-2">
          {(announcementsQuery.data ?? []).map((item) => (
            <div key={item.id} className="rounded-xl border border-border/40 p-3 text-sm space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{item.title}</span>
                <Badge>{item.type}</Badge>
              </div>
              <div className="text-muted-foreground whitespace-pre-wrap">{item.body}</div>
              {(item.event_datetime || item.address_text) && (
                <div className="text-xs text-muted-foreground">
                  {item.event_datetime ? `التاريخ: ${new Date(item.event_datetime).toLocaleString("ar-EG")}` : ""}
                  {item.event_datetime && item.address_text ? " • " : ""}
                  {item.address_text ? `العنوان: ${item.address_text}` : ""}
                </div>
              )}
              {(item.lat !== null && item.lng !== null) && (
                <div className="text-xs text-muted-foreground">
                  <a
                    href={`https://www.google.com/maps?q=${item.lat},${item.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    عرض الموقع على الخريطة
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CitizenEngagementPanel;
