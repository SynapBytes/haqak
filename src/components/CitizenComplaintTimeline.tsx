import IssueProgressTracker, { mapIssueStatusToTrackerStatus } from "@/components/IssueProgressTracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

type TimelineIssue = {
  id: string;
  status: string;
  title: string;
};

const mockLifecycle: Array<{
  key: "submitted" | "under_review" | "assigned" | "in_progress" | "resolved";
}> = [
  { key: "submitted" },
  { key: "under_review" },
  { key: "assigned" },
  { key: "in_progress" },
  { key: "resolved" },
];

const CitizenComplaintTimeline = ({ issue }: { issue?: TimelineIssue }) => {
  const { t } = useTranslation();
  const trackerStatus = mapIssueStatusToTrackerStatus(issue?.status || "received");

  return (
    <Card className="mb-8 border-border/60 bg-card/70">
      <CardHeader>
        <CardTitle className="text-lg">{t("dashboard.timeline_title")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("dashboard.timeline_subtitle")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <IssueProgressTracker status={trackerStatus} />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {mockLifecycle.map((step) => (
            <div key={step.key} className="rounded-lg border border-border/50 bg-muted/30 p-2 text-center text-xs">
              {t(`dashboard.timeline_${step.key}`)}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {t("dashboard.timeline_api_contract")}
        </p>
      </CardContent>
    </Card>
  );
};

export default CitizenComplaintTimeline;
