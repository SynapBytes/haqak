import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, AlertTriangle, AlertOctagon, Send } from "lucide-react";
import { toast } from "sonner";

interface IssueCreationProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface UrgencyDetection {
  isUrgent: boolean;
  urgencyLevel: "critical" | "high" | "medium" | "low";
  keywords: string[];
}

const CRITICAL_KEYWORDS = ["قتل", "اغتصاب", "عنف مسلح", "كارثة", "حريق"];
const HIGH_KEYWORDS = ["عنف", "تهديد", "حادث", "طوارئ"];
const MEDIUM_KEYWORDS = ["مشكلة خطيرة", "حالة حرجة", "عاجل"];

const IssueCreationWithUrgency = ({ onSuccess, onError }: IssueCreationProps) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [urgencyLevel, setUrgencyLevel] = useState<"critical" | "high" | "medium" | "low">("low");
  const [urgencyKeywords, setUrgencyKeywords] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Detect urgency from content
  const detectUrgency = (titleText: string, descriptionText: string): UrgencyDetection => {
    const combinedText = `${titleText} ${descriptionText}`.toLowerCase();
    const detectedKeywords: string[] = [];

    // Check critical keywords
    for (const keyword of CRITICAL_KEYWORDS) {
      if (combinedText.includes(keyword)) {
        detectedKeywords.push(keyword);
      }
    }

    if (detectedKeywords.length > 0) {
      return { isUrgent: true, urgencyLevel: "critical", keywords: detectedKeywords };
    }

    // Check high keywords
    for (const keyword of HIGH_KEYWORDS) {
      if (combinedText.includes(keyword)) {
        detectedKeywords.push(keyword);
      }
    }

    if (detectedKeywords.length > 0) {
      return { isUrgent: true, urgencyLevel: "high", keywords: detectedKeywords };
    }

    // Check medium keywords
    for (const keyword of MEDIUM_KEYWORDS) {
      if (combinedText.includes(keyword)) {
        detectedKeywords.push(keyword);
      }
    }

    if (detectedKeywords.length > 0) {
      return { isUrgent: true, urgencyLevel: "medium", keywords: detectedKeywords };
    }

    return { isUrgent: false, urgencyLevel: "low", keywords: [] };
  };

  // Handle content change
  const handleContentChange = (newTitle: string, newDescription: string) => {
    setTitle(newTitle);
    setDescription(newDescription);

    const urgency = detectUrgency(newTitle, newDescription);
    if (urgency.keywords.length > 0) {
      setIsUrgent(true);
      setUrgencyLevel(urgency.urgencyLevel);
      setUrgencyKeywords(urgency.keywords);
    } else {
      setIsUrgent(false);
      setUrgencyLevel("low");
      setUrgencyKeywords([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim() || !category || !location) {
      toast.error(t("issues.fill_required_fields"));
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create issue
      const { data: issue, error: issueError } = await supabase
        .from("issues")
        .insert({
          user_id: user.id,
          title,
          description,
          category,
          location,
          status: "received",
          is_urgent: isUrgent,
          urgency_level: urgencyLevel,
          urgent_reason: urgencyKeywords.join(", "),
        })
        .select()
        .single();

      if (issueError) throw issueError;

      // If urgent, send alert (authenticated)
      if (isUrgent) {
        try {
          await supabase.functions.invoke("send-urgent-alert", {
            body: {
              issueId: issue.id,
              title,
              description,
              urgencyLevel,
            },
          });
        } catch (error) {
          console.error("Error sending urgent alert:", error);
        }
      }

      toast.success(t("issues.created_successfully"));
      setTitle("");
      setDescription("");
      setCategory("");
      setLocation("");
      setIsUrgent(false);
      setUrgencyLevel("low");
      setUrgencyKeywords([]);

      onSuccess?.();
    } catch (error: any) {
      const errorMsg = error.message || t("issues.creation_error");
      toast.error(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyIcon = () => {
    switch (urgencyLevel) {
      case "critical":
        return <AlertOctagon className="w-5 h-5 text-red-600" />;
      case "high":
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case "medium":
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getUrgencyColor = () => {
    switch (urgencyLevel) {
      case "critical":
        return "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800";
      case "high":
        return "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800";
      case "medium":
        return "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800";
      default:
        return "bg-muted";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit a New Issue</CardTitle>
        <CardDescription>Describe your issue in detail. Urgent keywords are detected automatically.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Issue Title</label>
            <Input
              placeholder="Brief title of your issue"
              value={title}
              onChange={(e) => handleContentChange(e.target.value, description)}
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              placeholder="Provide detailed information about your issue"
              value={description}
              onChange={(e) => handleContentChange(title, e.target.value)}
              disabled={loading}
              rows={5}
            />
          </div>

          {/* Urgency Detection Alert */}
          <AnimatePresence>
            {isUrgent && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`border rounded-lg p-4 ${getUrgencyColor()}`}
              >
                <div className="flex items-start gap-3">
                  {getUrgencyIcon()}
                  <div className="flex-1">
                    <p className="font-semibold mb-2">
                      Urgent Issue Detected - {urgencyLevel.toUpperCase()}
                    </p>
                    <p className="text-sm mb-3">
                      Your issue contains keywords indicating urgency. Admins and relevant MPs will be notified immediately.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {urgencyKeywords.map((keyword) => (
                        <Badge key={keyword} variant="secondary" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Category and Location */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Input
                placeholder="e.g., Infrastructure, Health"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Input
                placeholder="e.g., Cairo, Giza"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Manual Urgent Flag */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Checkbox
              id="manual-urgent"
              checked={isUrgent}
              onCheckedChange={(checked) => {
                setIsUrgent(checked as boolean);
                if (!checked) {
                  setUrgencyLevel("low");
                  setUrgencyKeywords([]);
                }
              }}
              disabled={loading}
            />
            <label htmlFor="manual-urgent" className="text-sm font-medium cursor-pointer">
              Mark as urgent (even if not auto-detected)
            </label>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading || !title.trim() || !description.trim()}
            className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
            size="lg"
          >
            {loading ? "Submitting..." : "Submit Issue"}
            <Send className="w-4 h-4 ml-2" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default IssueCreationWithUrgency;
