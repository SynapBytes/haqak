import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export type TrackerStatus =
  | "received"
  | "under_review"
  | "routed_to_mp"
  | "in_resolution"
  | "resolved";

const STATUS_ORDER: readonly TrackerStatus[] = [
  "received",
  "under_review",
  "routed_to_mp",
  "in_resolution",
  "resolved",
];

export const mapIssueStatusToTrackerStatus = (rawStatus: string | null | undefined): TrackerStatus => {
  const status = (rawStatus || "").toLowerCase();
  if (status === "resolved") return "resolved";
  if (status === "in-progress" || status === "in_progress") return "in_resolution";
  if (status === "received") return "received";
  return "under_review";
};

const IssueProgressTracker = ({
  status,
  compact = false,
  className,
}: {
  status: TrackerStatus;
  compact?: boolean;
  className?: string;
}) => {
  const { t } = useTranslation();
  const currentIndex = STATUS_ORDER.indexOf(status);

  return (
    <div className={cn("space-y-3", className)} data-testid="issue-progress-tracker">
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_ORDER.map((step, index) => {
          const done = index <= currentIndex;
          return (
            <div key={step} className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                  done
                    ? "bg-accent/10 text-accent border-accent/30"
                    : "bg-muted/40 text-muted-foreground border-border/40",
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", done ? "bg-accent" : "bg-muted-foreground/60")} />
                {t(`issue_tracker.${step}`)}
              </span>
              {index < STATUS_ORDER.length - 1 && (
                <span className={cn("h-px w-3", done ? "bg-accent/40" : "bg-border/60")} />
              )}
            </div>
          );
        })}
      </div>
      {!compact ? (
        <p className="text-xs text-muted-foreground">{t("issue_tracker.current_status")}: {t(`issue_tracker.${status}`)}</p>
      ) : null}
    </div>
  );
};

export default IssueProgressTracker;
