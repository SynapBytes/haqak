import { motion } from "framer-motion";
import StatusBadge, { type IssueStatus } from "./StatusBadge";
import { MapPin, Clock } from "lucide-react";

export interface Issue {
  id: string;
  title: string;
  description: string;
  status: IssueStatus;
  category: string;
  location?: string;
  timeAgo: string;
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
        <StatusBadge status={issue.status} />
        <span className="text-muted-foreground text-sm flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {issue.timeAgo}
        </span>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{issue.title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mb-3">
        {issue.description}
      </p>
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
      </div>
    </motion.div>
  );
};

export default IssueCard;
