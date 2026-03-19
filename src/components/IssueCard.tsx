import { motion } from "framer-motion";
import StatusBadge, { type IssueStatus } from "./StatusBadge";
import { MapPin, Clock, Users, User, Flag, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface Issue {
  id: string;
  title: string;
  description: string;
  status: IssueStatus;
  category: string;
  location?: string;
  timeAgo: string;
  issue_type?: "individual" | "collective";
  is_flagged?: boolean;
  citizen_confirmed?: boolean;
  ai_summary?: string;
}

interface IssueCardProps {
  issue: Issue;
  onClick?: () => void;
}

const IssueCard = ({ issue, onClick }: IssueCardProps) => {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="civic-card-hover cursor-pointer"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <StatusBadge status={issue.status} />
          {issue.issue_type === "collective" && (
            <Badge variant="outline" className="gap-1 text-xs border-accent/30 text-accent">
              <Users className="w-3 h-3" />
              جماعية
            </Badge>
          )}
          {issue.is_flagged && (
            <Badge variant="outline" className="gap-1 text-xs border-destructive/30 text-destructive">
              <Flag className="w-3 h-3" />
              تم التنقيح
            </Badge>
          )}
          {issue.citizen_confirmed && (
            <Badge variant="outline" className="gap-1 text-xs border-primary/30 text-primary">
              <CheckCircle2 className="w-3 h-3" />
              مؤكد
            </Badge>
          )}
        </div>
        <span className="text-muted-foreground text-sm flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {issue.timeAgo}
        </span>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{issue.title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mb-3">
        {issue.description}
      </p>
      {issue.ai_summary && (
        <p className="text-xs text-accent bg-accent/5 border border-accent/10 rounded-lg p-2 mb-3">
          ✨ {issue.ai_summary}
        </p>
      )}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs">
          {issue.category}
        </span>
        {issue.location && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {issue.location}
          </span>
        )}
        <span className="flex items-center gap-1">
          {issue.issue_type === "collective" ? <Users className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
          {issue.issue_type === "collective" ? "جماعية" : "فردية"}
        </span>
      </div>
    </motion.div>
  );
};

export default IssueCard;
