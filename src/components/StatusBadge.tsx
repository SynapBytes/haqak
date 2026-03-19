import { cn } from "@/lib/utils";

export type IssueStatus = "received" | "in-progress" | "resolved";

const statusConfig: Record<IssueStatus, { label: string; className: string }> = {
  received: { label: "تم الاستلام", className: "status-received" },
  "in-progress": { label: "قيد المعالجة", className: "status-in-progress" },
  resolved: { label: "تم الحل", className: "status-resolved" },
};

interface StatusBadgeProps {
  status: IssueStatus;
  className?: string;
}

const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const config = statusConfig[status];
  return (
    <span className={cn("status-badge", config.className, className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
};

export default StatusBadge;
