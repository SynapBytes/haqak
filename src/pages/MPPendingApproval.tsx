import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { Clock, AlertCircle, CheckCircle2, LogOut, RefreshCw } from "lucide-react";
import ornament2 from "@/assets/egyptian-ornament-2.webp";
import egyptianAnkh from "@/assets/egyptian-ankh.webp";
import egyptianNefertiti from "@/assets/egyptian-nefertiti.webp";
import ornament1 from "@/assets/egyptian-ornament-1.webp";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";

const MPPendingApproval = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { signOut, profile, user } = useAuth();
  const { theme } = useTheme();
  const [isChecking, setIsChecking] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<"pending" | "approved" | "rejected">("pending");

  const isDark = theme === "dark";
  const decoStyle = (op: [number, number]) => ({
    opacity: isDark ? op[0] : op[1],
    filter: isDark
      ? "brightness(1.08) drop-shadow(0 0 34px rgba(200,149,60,0.38))"
      : "drop-shadow(0 14px 28px rgba(200,149,60,0.18))",
  });

  // Check approval status periodically
  useEffect(() => {
    const checkApprovalStatus = async () => {
      if (!user) return;

      try {
        const { data } = await supabase
          .from("profiles")
          .select("is_approved")
          .eq("user_id", user.id)
          .single();

        if (data?.is_approved) {
          setApprovalStatus("approved");
          toast.success(t("mp_pending.approved_success"));
          // Redirect to MP dashboard after a short delay
          setTimeout(() => navigate("/mp"), 1500);
        }
      } catch (error) {
        console.error("Error checking approval status:", error);
      }
    };

    // Check immediately and then every 10 seconds
    checkApprovalStatus();
    const interval = setInterval(checkApprovalStatus, 10000);

    return () => clearInterval(interval);
  }, [user, navigate, t]);

  const handleRefresh = async () => {
    setIsChecking(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("is_approved")
        .eq("user_id", user?.id)
        .single();

      if (data?.is_approved) {
        setApprovalStatus("approved");
        toast.success(t("mp_pending.approved_success"));
        setTimeout(() => navigate("/mp"), 1500);
      } else {
        toast.info(t("mp_pending.still_pending"));
      }
    } catch (error) {
      toast.error(t("mp_pending.check_error"));
    } finally {
      setIsChecking(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/auth");
    } catch (error) {
      toast.error(t("auth.logout_error"));
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <AppHeader />

      {/* Egyptian decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <img src={ornament2} alt="" className="absolute top-10 right-6 w-[140px] md:w-[200px] lg:w-[260px] select-none" style={decoStyle([0.22, 0.13])} draggable={false} />
        <img src={egyptianNefertiti} alt="" className="absolute bottom-8 left-4 w-[130px] md:w-[190px] lg:w-[240px] select-none" style={decoStyle([0.2, 0.12])} draggable={false} />
        <img src={egyptianAnkh} alt="" className="absolute top-20 left-8 w-[70px] md:w-[100px] lg:w-[130px] select-none" style={decoStyle([0.18, 0.1])} draggable={false} />
        <img src={ornament1} alt="" className="absolute bottom-12 right-8 w-[100px] md:w-[150px] lg:w-[180px] select-none" style={decoStyle([0.16, 0.09])} draggable={false} />
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full blur-3xl" style={{ background: `radial-gradient(circle, hsl(var(--warning) / ${isDark ? 0.08 : 0.04}), transparent 70%)` }} />
        <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] rounded-full blur-3xl" style={{ background: `radial-gradient(circle, hsl(var(--primary) / ${isDark ? 0.06 : 0.03}), transparent 70%)` }} />
      </div>

      <div className="container py-8 md:py-16 flex justify-center px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Header */}
          <div className="mb-8 text-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${
                approvalStatus === "approved"
                  ? "from-green-500 to-emerald-600"
                  : "from-amber-500 to-orange-600"
              } flex items-center justify-center mx-auto mb-5 shadow-xl`}
            >
              {approvalStatus === "approved" ? (
                <CheckCircle2 className="w-9 h-9 text-white" />
              ) : (
                <Clock className="w-9 h-9 text-white" />
              )}
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold text-foreground mb-2 tracking-tight"
            >
              {approvalStatus === "approved"
                ? t("mp_pending.approved_title")
                : t("mp_pending.pending_title")}
            </motion.h1>
            <p className="text-muted-foreground text-sm">
              {approvalStatus === "approved"
                ? t("mp_pending.approved_subtitle")
                : t("mp_pending.pending_subtitle")}
            </p>
          </div>

          {/* Card */}
          <motion.div layout className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-7 md:p-8">
              {approvalStatus === "pending" ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-6"
                >
                  {/* Status Message */}
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                          {t("mp_pending.pending_message_title")}
                        </h3>
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                          {t("mp_pending.pending_message_body")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="space-y-3 bg-muted/50 rounded-lg p-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("mp_pending.full_name")}</p>
                      <p className="font-medium text-foreground">{profile?.full_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("mp_pending.phone")}</p>
                      <p className="font-medium text-foreground">{profile?.phone}</p>
                    </div>
                    {profile?.registration_number && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("mp_pending.registration_number")}</p>
                        <p className="font-medium text-foreground">{profile.registration_number}</p>
                      </div>
                    )}
                  </div>

                  {/* Timeline */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t("mp_pending.process_timeline")}
                    </p>
                    <div className="space-y-2">
                      <div className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 rounded-full bg-green-500 mt-1.5"></div>
                          <div className="w-0.5 h-8 bg-border"></div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{t("mp_pending.step1_title")}</p>
                          <p className="text-xs text-muted-foreground">{t("mp_pending.step1_desc")}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 rounded-full bg-amber-500 mt-1.5"></div>
                          <div className="w-0.5 h-8 bg-border"></div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{t("mp_pending.step2_title")}</p>
                          <p className="text-xs text-muted-foreground">{t("mp_pending.step2_desc")}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600 mt-1.5"></div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{t("mp_pending.step3_title")}</p>
                          <p className="text-xs text-muted-foreground">{t("mp_pending.step3_desc")}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3 pt-4">
                    <Button
                      onClick={handleRefresh}
                      disabled={isChecking}
                      className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                      size="lg"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isChecking ? "animate-spin" : ""}`} />
                      {isChecking ? t("mp_pending.checking") : t("mp_pending.check_status")}
                    </Button>
                    <Button
                      onClick={handleLogout}
                      variant="outline"
                      className="w-full"
                      size="lg"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      {t("auth.logout")}
                    </Button>
                  </div>

                  {/* Info */}
                  <p className="text-center text-xs text-muted-foreground">
                    {t("mp_pending.auto_check_info")}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-6 text-center"
                >
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-6">
                    <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-500 mx-auto mb-3" />
                    <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                      {t("mp_pending.approved_success")}
                    </h3>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      {t("mp_pending.redirecting")}
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Footer Info */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            {t("mp_pending.contact_support")}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default MPPendingApproval;
