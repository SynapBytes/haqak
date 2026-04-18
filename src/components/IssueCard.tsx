import { motion } from "framer-motion";
import StatusBadge, { type IssueStatus } from "./StatusBadge";
import { MapPin, Clock, Users, User, Flag, CheckCircle2, AlertTriangle, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { getIssueCategoryLabel } from "@/lib/issueCategories";

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
  priority?: "urgent" | "humanitarian" | "normal";
  resolution_rating?: number;
  refined_title?: string;
  refined_description?: string;
}

interface IssueCardProps {
  issue: Issue;
  onClick?: () => void;
}

const IssueCard = ({ issue, onClick }: IssueCardProps) => {
  const { t, i18n } = useTranslation();
  
  // Use refined title if available, otherwise use original
  const displayTitle = issue.refined_title || issue.title;
  const displayDescription = issue.refined_description || issue.description;
  const issueDate = new Date(issue.timeAgo);
  const timeLocale = i18n.language.startsWith("ar") ? ar : enUS;
  const displayTime =
    Number.isNaN(issueDate.getTime())
      ? issue.timeAgo
      : formatDistanceToNow(issueDate, { addSuffix: true, locale: timeLocale });
  
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
      onClick={onClick}
      className={`bg-card/80 backdrop-blur-sm border p-5 md:p-6 rounded-2xl transition-all duration-300 hover:shadow-xl cursor-pointer group ${
        issue.priority === "urgent" 
          ? "border-destructive/30 hover:border-destructive/50" 
          : issue.priority === "humanitarian"
          ? "border-orange-500/30 hover:border-orange-500/50"
          : "border-border/50 hover:border-border"
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={issue.status} />
          
          {/* Priority Badges */}
          {issue.priority === "urgent" && (
            <Badge variant="outline" className="gap-1 text-xs border-destructive/30 text-destructive rounded-lg bg-destructive/[0.1] font-semibold animate-pulse">
              <AlertTriangle className="w-3 h-3" />
              {t("issue_card.urgent") || "ضروري"}
            </Badge>
          )}
          {issue.priority === "humanitarian" && (
            <Badge variant="outline" className="gap-1 text-xs border-orange-500/30 text-orange-600 rounded-lg bg-orange-500/[0.1] font-semibold">
              <Heart className="w-3 h-3" />
              {t("issue_card.humanitarian") || "إنساني"}
            </Badge>
          )}
          
          {/* Type Badge */}
          {issue.issue_type === "collective" && (
            <Badge variant="outline" className="gap-1 text-xs border-accent/20 text-accent rounded-lg bg-accent/[0.06]">
              <Users className="w-3 h-3" />
              {t("issue_card.collective")}
            </Badge>
          )}
          
          {/* Flagged Badge */}
          {issue.is_flagged && (
            <Badge variant="outline" className="gap-1 text-xs border-destructive/20 text-destructive rounded-lg bg-destructive/[0.06]">
              <Flag className="w-3 h-3" />
              {t("issue_card.flagged")}
            </Badge>
          )}
          
          {/* Confirmed Badge */}
          {issue.citizen_confirmed && (
            <Badge variant="outline" className="gap-1 text-xs border-success/20 text-success rounded-lg bg-success/[0.06]">
              <CheckCircle2 className="w-3 h-3" />
              {t("issue_card.confirmed")}
            </Badge>
          )}
        </div>
        <span className="text-muted-foreground text-xs flex items-center gap-1.5 bg-muted/50 rounded-lg px-2.5 py-1 whitespace-nowrap">
          <Clock className="w-3 h-3" />
          {displayTime}
        </span>
      </div>
      
      {/* Title */}
      <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-accent transition-colors line-clamp-2">
        {displayTitle}
      </h3>
      
      {/* Description */}
      <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mb-3">
        {displayDescription}
      </p>
      
      {/* AI Summary */}
      {issue.ai_summary && (
        <p className="text-xs text-accent bg-accent/[0.06] border border-accent/10 rounded-xl p-3 mb-3 leading-relaxed">
          ✨ {issue.ai_summary}
        </p>
      )}
      
      {/* Footer Info */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
        <span className="px-2.5 py-1 rounded-lg bg-muted/50 text-foreground text-xs font-medium">
          {getIssueCategoryLabel(issue.category, t)}
        </span>
        {issue.location && (
          <span className="flex items-center gap-1 text-xs">
            <MapPin className="w-3.5 h-3.5" />
            {issue.location}
          </span>
        )}
        <span className="flex items-center gap-1 text-xs">
          {issue.issue_type === "collective" ? <Users className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
          {issue.issue_type === "collective" ? t("issue_card.collective") : t("issue_card.individual")}
        </span>
      </div>
    </motion.div>
  );
};

export default IssueCard;
