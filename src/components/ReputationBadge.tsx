import React from "react";
import { motion } from "framer-motion";
import { Award, Star, ShieldCheck, Zap } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ReputationProps {
  points: number;
  rank: string;
}

const ReputationBadge: React.FC<ReputationProps> = ({ points, rank }) => {
  const getRankConfig = (rankName: string) => {
    switch (rankName) {
      case "مواطن ذهبي":
        return { color: "text-yellow-500", bg: "bg-yellow-500/10", icon: Award, border: "border-yellow-500/20" };
      case "مواطن فضي":
        return { color: "text-slate-300", bg: "bg-slate-300/10", icon: ShieldCheck, border: "border-slate-300/20" };
      case "مواطن نشط":
        return { color: "text-blue-400", bg: "bg-blue-400/10", icon: Zap, border: "border-blue-400/20" };
      default:
        return { color: "text-muted-foreground", bg: "bg-muted/10", icon: Star, border: "border-muted/20" };
    }
  };

  const config = getRankConfig(rank);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.bg} ${config.border} cursor-help transition-all hover:brightness-110`}
          >
            <config.icon className={`w-4 h-4 ${config.color}`} />
            <span className={`text-xs font-bold ${config.color}`}>{rank}</span>
            <div className="h-3 w-[1px] bg-border/50 mx-1"></div>
            <span className="text-xs font-medium text-foreground">{points} نقطة</span>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent className="bg-card border-border text-xs p-3 max-w-[200px]">
          <p className="font-bold mb-1">نظام المواطن الإيجابي</p>
          <p className="text-muted-foreground">كلما كانت شكواك دقيقة وتم حلها، زادت رتبتك في النظام لتكون لشكواك أولوية مستقبلاً.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ReputationBadge;
