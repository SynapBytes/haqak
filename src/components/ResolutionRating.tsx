import { useState } from "react";
import { Star, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";

interface ResolutionRatingProps {
  issueId: string;
  onRated?: () => void;
}

const ResolutionRating = ({ issueId, onRated }: ResolutionRatingProps) => {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error(t("rating.select_stars"));
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("issues")
        .update({
          resolution_rating: rating,
          resolution_feedback: feedback,
        })
        .eq("id", issueId);

      if (error) throw error;

      setSubmitted(true);
      toast.success(t("rating.success"));
      if (onRated) onRated();
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast.error(t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-success/5 border border-success/20 rounded-2xl p-6 text-center"
      >
        <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <Star className="w-6 h-6 text-success fill-success" />
        </div>
        <h4 className="font-bold text-foreground mb-1">{t("rating.thank_you")}</h4>
        <p className="text-sm text-muted-foreground">{t("rating.feedback_received")}</p>
      </motion.div>
    );
  }

  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-sm">
      <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
        <Star className="w-5 h-5 text-accent" />
        {t("rating.rate_resolution")}
      </h4>
      
      <div className="flex justify-center gap-2 mb-6">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className="focus:outline-none transition-transform hover:scale-110"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
          >
            <Star
              className={`w-8 h-8 transition-colors ${
                star <= (hover || rating)
                  ? "text-accent fill-accent"
                  : "text-muted-foreground/30"
              }`}
            />
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            {t("rating.feedback_label")}
          </label>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={t("rating.feedback_placeholder")}
            className="min-h-[100px] bg-background/50 border-border/50 rounded-xl resize-none"
          />
        </div>
        
        <Button
          onClick={handleSubmit}
          disabled={submitting || rating === 0}
          className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90 h-11 rounded-xl shadow-lg shadow-accent/10"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {t("rating.submit")}
        </Button>
      </div>
    </div>
  );
};

export default ResolutionRating;
