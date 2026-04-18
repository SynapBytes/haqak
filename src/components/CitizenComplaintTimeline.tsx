import IssueProgressTracker, { mapIssueStatusToTrackerStatus } from "@/components/IssueProgressTracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { CANONICAL_TIMELINE_STATUSES, fetchComplaintTimeline } from "@/lib/complaintTimeline";
import { useTranslation } from "react-i18next";

type TimelineIssue = {
  id: string;
  status: string;
  title: string;
};

const mapTimelineStatusToTrackerStatus = (status: string | undefined) => {
  if (status === "closed") return "resolved";
  if (status === "in_progress") return "in_resolution";
  if (status === "assigned") return "routed_to_mp";
  if (status === "under_review") return "under_review";
  if (status === "submitted") return "received";
  return mapIssueStatusToTrackerStatus(status || "received");
};

const CitizenComplaintTimeline = ({ issue }: { issue?: TimelineIssue }) => {
  const { t, i18n } = useTranslation();
  const timelineQuery = useQuery({
    queryKey: ["complaint-timeline", issue?.id],
    enabled: !!issue?.id,
    queryFn: () => fetchComplaintTimeline(issue!.id),
  });

  const timelineEvents = timelineQuery.data?.events ?? [];
  const latestTimelineStatus = timelineEvents[timelineEvents.length - 1]?.status;
  const trackerStatus = mapTimelineStatusToTrackerStatus(latestTimelineStatus ?? issue?.status);
  const completedStatuses = new Set(timelineEvents.map((event) => event.status));
  const formatEventTime = (timestamp: string) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return timestamp;
    return new Intl.DateTimeFormat(i18n.language.startsWith("ar") ? "ar-EG" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  return (
    <Card className="mb-8 border-border/60 bg-card/70">
      <CardHeader>
        <CardTitle className="text-lg">{t("dashboard.timeline_title_live")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("dashboard.timeline_subtitle")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!issue ? (
          <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
            {t("dashboard.timeline_empty_desc")}
          </p>
        ) : timelineQuery.isLoading ? (
          <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
            {t("dashboard.timeline_loading")}
          </p>
        ) : timelineQuery.isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3" role="alert">
            <p className="text-sm font-medium">{t("dashboard.timeline_error_title")}</p>
            <p className="text-xs text-muted-foreground">{t("dashboard.timeline_error_desc")}</p>
            <Button variant="outline" size="sm" onClick={() => timelineQuery.refetch()} className="mt-2">
              {t("dashboard.timeline_retry")}
            </Button>
          </div>
        ) : (
          <>
            <IssueProgressTracker status={trackerStatus} />
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
              {CANONICAL_TIMELINE_STATUSES.map((status) => (
                <div
                  key={status}
                  className={`rounded-lg border p-2 text-center text-xs ${
                    completedStatuses.has(status)
                      ? "border-accent/50 bg-accent/10 text-accent"
                      : "border-border/50 bg-muted/30 text-muted-foreground"
                  }`}
                >
                  {t(`dashboard.timeline_${status}`)}
                </div>
              ))}
            </div>
            {timelineEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("dashboard.timeline_no_events")}</p>
            ) : (
              <div className="space-y-2" aria-live="polite">
                {timelineEvents.map((event, index) => (
                  <div key={`${event.status}-${event.timestamp}-${index}`} className="rounded-lg border border-border/40 p-3">
                    <p className="text-sm font-medium">{t(`dashboard.timeline_${event.status}`)}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(`dashboard.timeline_actor_${event.actor}`, { defaultValue: event.actor })} • {formatEventTime(event.timestamp)}
                    </p>
                    {event.note ? <p className="text-xs mt-1 text-muted-foreground">{event.note}</p> : null}
                  </div>
                ))}
              </div>
            )}
            {timelineQuery.data?.isPartial ? (
              <p className="text-xs text-muted-foreground">{t("dashboard.timeline_partial_hint")}</p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CitizenComplaintTimeline;
