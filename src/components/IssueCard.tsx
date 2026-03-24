import { motion } from "framer-motion";
import StatusBadge, { type IssueStatus } from "./StatusBadge";
import { MapPin, Clock, Users, User, Flag, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

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
  user_id?: string;
}

interface IssueCardProps {
  issue: Issue;
  onClick?: () => void;
}

const IssueCard = ({ issue, onClick }: IssueCardProps) => {
  const { t } = useTranslation();
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
      onClick={onClick}
      className="bg-card/80 backdrop-blur-sm border border-border/50 p-5 md:p-6 rounded-2xl transition-all duration-300 hover:shadow-xl hover:border-border cursor-pointer group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={issue.status} />
          {issue.issue_type === "collective" && (
            <Badge variant="outline" className="gap-1 text-xs border-accent/20 text-accent rounded-lg bg-accent/[0.06]">
              <Users className="w-3 h-3" />
              {t("issue_card.collective")}
            </Badge>
          )}
          {issue.is_flagged && (
            <Badge variant="outline" className="gap-1 text-xs border-destructive/20 text-destructive rounded-lg bg-destructive/[0.06]">
              <Flag className="w-3 h-3" />
              {t("issue_card.flagged")}
            </Badge>
          )}
          {issue.citizen_confirmed && (
            <Badge variant="outline" className="gap-1 text-xs border-success/20 text-success rounded-lg bg-success/[0.06]">
              <CheckCircle2 className="w-3 h-3" />
              {t("issue_card.confirmed")}
            </Badge>
          )}
        </div>
        <span className="text-muted-foreground text-xs flex items-center gap-1.5 bg-muted/50 rounded-lg px-2.5 py-1">
          <Clock className="w-3 h-3" />
          {issue.timeAgo}
        </span>
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-accent transition-colors">{issue.title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mb-3">
        {issue.description}
      </p>
      {issue.ai_summary && (
        <p className="text-xs text-accent bg-accent/[0.06] border border-accent/10 rounded-xl p-3 mb-3 leading-relaxed">
          ✨ {issue.ai_summary}
        </p>
      )}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="px-2.5 py-1 rounded-lg bg-muted/50 text-foreground text-xs font-medium">
          {issue.category}
        </span>
        {issue.location && (
          <span className="flex items-center gap-1 text-xs">
            <MapPin className="w-3.5 h-3.5" />
            {issue.location}
          </span>
        )}
        <span className="flex items-center gap-1 text-xs">
          {issue.issue_type === "collective" ? <Users className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
          {issue.issue_type === "collective" ? "جماعية" : "فردية"}
        </span>
      </div>
    </motion.div>
  );
};

export default IssueCard;
