import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { sanitizeText } from "@/lib/sanitize";
import { dispatchNotification } from "@/lib/notifications";

type PollStatus = "open" | "closed";
type AnnouncementType = "event" | "conference" | "opening" | "general";

type PollRow = {
  id: string;
  title: string;
  description: string | null;
  status: PollStatus;
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

type AnnouncementRow = {
  id: string;
  type: AnnouncementType;
  title: string;
  body: string;
  status: "draft" | "published";
  event_datetime: string | null;
  address_text: string | null;
  lat: number | null;
  lng: number | null;
  images: string[];
  created_at: string;
};

const MPEngagementPanel = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [pollTitle, setPollTitle] = useState("");
  const [pollDescription, setPollDescription] = useState("");

  const [announcementType, setAnnouncementType] = useState<AnnouncementType>("general");
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [announcementAddress, setAnnouncementAddress] = useState("");
  const [announcementDateTime, setAnnouncementDateTime] = useState("");
  const [announcementLat, setAnnouncementLat] = useState("");
  const [announcementLng, setAnnouncementLng] = useState("");
  const [announcementImages, setAnnouncementImages] = useState("");

  const [requestMessage, setRequestMessage] = useState("");

  const profileQuery = useQuery({
    queryKey: ["mp-engagement-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("center_id, verification_status, full_name, governorate, district")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const pollsQuery = useQuery({
    queryKey: ["mp-polls", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("polls")
        .select("id, title, description, status, created_at")
        .eq("mp_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PollRow[];
    },
  });

  const pollResultsQuery = useQuery({
    queryKey: ["mp-poll-results", pollsQuery.data?.map((p) => p.id).join(",")],
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

  const announcementsQuery = useQuery({
    queryKey: ["mp-announcements", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("id, type, title, body, status, event_datetime, address_text, lat, lng, images, created_at")
        .eq("mp_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AnnouncementRow[];
    },
  });

  const deliveryStatsQuery = useQuery({
    queryKey: ["mp-delivery-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: actorNotifications, error: actorNotificationsError } = await supabase
        .from("notifications")
        .select("id")
        .contains("data_json", { actor_id: user!.id });
      if (actorNotificationsError) throw actorNotificationsError;

      const ids = (actorNotifications ?? []).map((n) => n.id);
      if (ids.length === 0) {
        return { queued: 0, sent: 0, failed: 0, skipped: 0 };
      }

      const { data: deliveries, error: deliveriesError } = await supabase
        .from("notification_deliveries")
        .select("status")
        .in("notification_id", ids);
      if (deliveriesError) throw deliveriesError;

      return (deliveries ?? []).reduce(
        (acc, row) => {
          if (row.status === "queued") acc.queued += 1;
          if (row.status === "sent") acc.sent += 1;
          if (row.status === "failed") acc.failed += 1;
          if (row.status === "skipped") acc.skipped += 1;
          return acc;
        },
        { queued: 0, sent: 0, failed: 0, skipped: 0 },
      );
    },
  });

  const isVerified = profileQuery.data?.verification_status === "verified";
  const centerId = profileQuery.data?.center_id ?? null;

  const pollResultMap = useMemo(() => {
    return new Map((pollResultsQuery.data ?? []).map((r) => [r.poll_id, r]));
  }, [pollResultsQuery.data]);

  const createPollMutation = useMutation({
    mutationFn: async () => {
      if (!user || !isVerified || !centerId) throw new Error("الحساب غير مؤهل لإنشاء استطلاع");

      const title = sanitizeText(pollTitle);
      const description = sanitizeText(pollDescription);
      if (!title) throw new Error("عنوان الاستطلاع مطلوب");

      const { data, error } = await supabase
        .from("polls")
        .insert({
          mp_user_id: user.id,
          center_id: centerId,
          title,
          description,
          status: "open",
        })
        .select("id")
        .single();
      if (error) throw error;

      await dispatchNotification({
        event: "poll_published",
        title: "استطلاع جديد من نائب دائرتك",
        body: title,
        channels: ["sms", "email"],
        target: {
          roles: ["citizen"],
          center_id: centerId,
          verified_only: true,
        },
        data_json: { poll_id: data.id },
      });
    },
    onSuccess: async () => {
      setPollTitle("");
      setPollDescription("");
      toast.success("تم نشر الاستطلاع");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["mp-polls", user?.id] }),
        qc.invalidateQueries({ queryKey: ["mp-poll-results"] }),
        qc.invalidateQueries({ queryKey: ["mp-delivery-stats", user?.id] }),
      ]);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر إنشاء الاستطلاع");
    },
  });

  const setPollStatusMutation = useMutation({
    mutationFn: async ({ pollId, status }: { pollId: string; status: PollStatus }) => {
      const { error } = await supabase
        .from("polls")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", pollId)
        .eq("mp_user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("تم تحديث حالة الاستطلاع");
      await qc.invalidateQueries({ queryKey: ["mp-polls", user?.id] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث حالة الاستطلاع");
    },
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: async () => {
      if (!user || !isVerified || !centerId) throw new Error("الحساب غير مؤهل لنشر إعلان");

      const title = sanitizeText(announcementTitle);
      const body = sanitizeText(announcementBody);
      const addressText = sanitizeText(announcementAddress);
      if (!title || !body) throw new Error("العنوان والنص مطلوبان");

      const imageRefs = announcementImages
        .split("\n")
        .map((line) => sanitizeText(line))
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => !line.includes("..") && !line.includes("\\"));

      const lat = announcementLat.trim() ? Number(announcementLat) : null;
      const lng = announcementLng.trim() ? Number(announcementLng) : null;
      if ((lat !== null && Number.isNaN(lat)) || (lng !== null && Number.isNaN(lng))) {
        throw new Error("إحداثيات الخريطة غير صحيحة");
      }
      if (lat !== null && (lat < -90 || lat > 90)) {
        throw new Error("خط العرض يجب أن يكون بين -90 و 90");
      }
      if (lng !== null && (lng < -180 || lng > 180)) {
        throw new Error("خط الطول يجب أن يكون بين -180 و 180");
      }

      const eventDate = announcementDateTime ? new Date(announcementDateTime).toISOString() : null;

      const { data, error } = await supabase
        .from("announcements")
        .insert({
          mp_user_id: user.id,
          center_id: centerId,
          type: announcementType,
          title,
          body,
          event_datetime: eventDate,
          address_text: addressText || null,
          lat,
          lng,
          images: imageRefs,
          status: "published",
        })
        .select("id")
        .single();
      if (error) throw error;

      await dispatchNotification({
        event: "announcement_published",
        title: "إعلان رسمي جديد في دائرتك",
        body: title,
        channels: ["sms", "email"],
        target: {
          roles: ["citizen"],
          center_id: centerId,
          verified_only: true,
        },
        data_json: { announcement_id: data.id },
      });
    },
    onSuccess: async () => {
      setAnnouncementTitle("");
      setAnnouncementBody("");
      setAnnouncementAddress("");
      setAnnouncementDateTime("");
      setAnnouncementLat("");
      setAnnouncementLng("");
      setAnnouncementImages("");
      toast.success("تم نشر الإعلان");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["mp-announcements", user?.id] }),
        qc.invalidateQueries({ queryKey: ["mp-delivery-stats", user?.id] }),
      ]);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر نشر الإعلان");
    },
  });

  const renominationMutation = useMutation({
    mutationFn: async () => {
      if (!user || !isVerified || !centerId) throw new Error("الحساب غير مؤهل لإرسال الطلب");

      const message = sanitizeText(requestMessage);
      if (!message) throw new Error("اكتب رسالة الطلب");

      const { data: requestRow, error } = await supabase
        .from("mp_admin_requests")
        .insert({
          mp_user_id: user.id,
          center_id: centerId,
          type: "renomination",
          message,
          status: "pending",
        })
        .select("id")
        .single();
      if (error) throw error;

      const profileName = sanitizeText(profileQuery.data?.full_name ?? "عضو مجلس النواب");
      await supabase.from("outbound_email_tasks").insert({
        created_by: user.id,
        to_email: "admin@haqak.org",
        subject: "طلب إعادة ترشح من نائب",
        body: `تم تقديم طلب إعادة ترشح جديد من ${profileName}.\n\nالرسالة:\n${message}`,
        status: "pending",
        context: { request_id: requestRow.id, type: "renomination", center_id: centerId },
      });
    },
    onSuccess: async () => {
      setRequestMessage("");
      toast.success("تم إرسال طلب إعادة الترشح للإدارة");
      await qc.invalidateQueries({ queryKey: ["mp-renomination-requests", user?.id] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر إرسال الطلب");
    },
  });

  return (
    <div className="space-y-6">
      {!isVerified && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
          هذه الميزات متاحة فقط للحسابات الموثقة.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border/50 bg-card/70 p-4 space-y-3">
          <h3 className="font-semibold">استطلاعات نعم / لا</h3>
          <Input value={pollTitle} onChange={(e) => setPollTitle(e.target.value)} placeholder="عنوان الاستطلاع" />
          <Textarea value={pollDescription} onChange={(e) => setPollDescription(e.target.value)} placeholder="وصف مختصر" />
          <Button disabled={!isVerified || createPollMutation.isPending} onClick={() => createPollMutation.mutate()}>
            نشر استطلاع
          </Button>

          <div className="space-y-2">
            {(pollsQuery.data ?? []).map((poll) => {
              const stats = pollResultMap.get(poll.id);
              return (
                <div key={poll.id} className="rounded-xl border border-border/40 p-3 text-sm space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{poll.title}</span>
                    <Badge variant={poll.status === "open" ? "default" : "secondary"}>
                      {poll.status === "open" ? "مفتوح" : "مغلق"}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground">
                    نعم: {stats?.yes_count ?? 0} ({stats?.yes_percentage ?? 0}%) • لا: {stats?.no_count ?? 0} ({stats?.no_percentage ?? 0}%)
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setPollStatusMutation.mutate({
                        pollId: poll.id,
                        status: poll.status === "open" ? "closed" : "open",
                      })
                    }
                  >
                    {poll.status === "open" ? "إغلاق" : "إعادة فتح"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/70 p-4 space-y-3">
          <h3 className="font-semibold">إعلانات / فعاليات</h3>
          <Select value={announcementType} onValueChange={(v) => setAnnouncementType(v as AnnouncementType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="general">عام</SelectItem>
              <SelectItem value="event">فعالية</SelectItem>
              <SelectItem value="conference">مؤتمر</SelectItem>
              <SelectItem value="opening">افتتاح</SelectItem>
            </SelectContent>
          </Select>
          <Input value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)} placeholder="عنوان الإعلان" />
          <Textarea value={announcementBody} onChange={(e) => setAnnouncementBody(e.target.value)} placeholder="نص الإعلان" />
          <Input value={announcementDateTime} onChange={(e) => setAnnouncementDateTime(e.target.value)} type="datetime-local" />
          <Input value={announcementAddress} onChange={(e) => setAnnouncementAddress(e.target.value)} placeholder="العنوان" />
          <div className="grid grid-cols-2 gap-2">
            <Input value={announcementLat} onChange={(e) => setAnnouncementLat(e.target.value)} placeholder="Latitude" />
            <Input value={announcementLng} onChange={(e) => setAnnouncementLng(e.target.value)} placeholder="Longitude" />
          </div>
          <Textarea
            value={announcementImages}
            onChange={(e) => setAnnouncementImages(e.target.value)}
            placeholder="روابط/مسارات الصور (سطر لكل صورة)"
          />
          <Button disabled={!isVerified || createAnnouncementMutation.isPending} onClick={() => createAnnouncementMutation.mutate()}>
            نشر الإعلان
          </Button>

          <div className="space-y-2">
            {(announcementsQuery.data ?? []).map((announcement) => (
              <div key={announcement.id} className="rounded-xl border border-border/40 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{announcement.title}</span>
                  <Badge variant={announcement.status === "published" ? "default" : "secondary"}>
                    {announcement.status === "published" ? "منشور" : "مسودة"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/70 p-4 space-y-3">
        <h3 className="font-semibold">طلب إعادة الترشح للإدارة</h3>
        <Textarea
          value={requestMessage}
          onChange={(e) => setRequestMessage(e.target.value)}
          placeholder="أرغب في الترشح مرة أخرى، يرجى إخطار مركزي"
        />
        <Button disabled={!isVerified || renominationMutation.isPending} onClick={() => renominationMutation.mutate()}>
          إرسال الطلب
        </Button>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/70 p-4 text-sm">
        <h3 className="font-semibold mb-2">إحصاءات التسليم (من السجلات)</h3>
        <div className="text-muted-foreground">
          مرسل: {deliveryStatsQuery.data?.sent ?? 0} • قيد الانتظار: {deliveryStatsQuery.data?.queued ?? 0} • فشل: {deliveryStatsQuery.data?.failed ?? 0} • متخطى: {deliveryStatsQuery.data?.skipped ?? 0}
        </div>
      </div>
    </div>
  );
};

export default MPEngagementPanel;
