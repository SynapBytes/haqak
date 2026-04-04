import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Heart, Shield, Zap, CheckCircle2,
  Lock, Sparkles, Star, Users, ArrowLeft,
  Coins, Leaf, Globe, Fingerprint
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeText } from "@/lib/sanitize";

type ExtendedPublicTables = Database["public"]["Tables"] & {
  contributions: {
    Row: {
      id: string;
      name: string | null;
      show_name: boolean;
      status: string;
      created_at: string;
    };
    Insert: {
      amount: number;
      name?: string | null;
      email?: string | null;
      show_name: boolean;
      status: string;
      payment_provider: string;
    };
    Update: {
      amount?: number;
      name?: string | null;
      email?: string | null;
      show_name?: boolean;
      status?: string;
      payment_provider?: string;
    };
    Relationships: [];
  };
  feedbacks: {
    Row: {
      id: string;
      contribution_id: string | null;
      message: string;
      name: string | null;
      email: string | null;
      created_at: string;
    };
    Insert: {
      contribution_id?: string | null;
      message: string;
      name?: string | null;
      email?: string | null;
    };
    Update: {
      contribution_id?: string | null;
      message?: string;
      name?: string | null;
      email?: string | null;
    };
    Relationships: [];
  };
};

type ExtendedDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: ExtendedPublicTables;
  };
};

type ContributionInsertPayload = ExtendedDatabase["public"]["Tables"]["contributions"]["Insert"];
type FeedbackInsertPayload = ExtendedDatabase["public"]["Tables"]["feedbacks"]["Insert"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const hasStringName = (value: unknown): value is { name: string } =>
  isRecord(value) && typeof value.name === "string";

const supportSupabase = supabase as unknown as SupabaseClient<ExtendedDatabase>;

const Support = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  
  const [amount, setAmount] = useState<number | "other">(100);
  const [customAmount, setCustomAmount] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [showName, setShowName] = useState(false);
  const [step, setStep] = useState<"form" | "success">("form");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [contributionId, setContributionId] = useState<string | null>(null);
  const [contributors, setContributors] = useState<{ name: string }[]>([]);

  const tiers = [
    { id: 50, name: t("contribute.tier_1"), impact: t("contribute.impact_1"), icon: Leaf },
    { id: 100, name: t("contribute.tier_2"), impact: t("contribute.impact_2"), icon: Heart },
    { id: 500, name: t("contribute.tier_3"), impact: t("contribute.impact_3"), icon: Sparkles },
    { id: 1000, name: t("contribute.tier_4"), impact: t("contribute.impact_4"), icon: Star },
  ];

  useEffect(() => {
    const fetchContributors = async () => {
      try {
        const { data } = await supportSupabase
          .from("contributions")
          .select("name")
          .eq("show_name", true)
          .eq("status", "succeeded")
          .order("created_at", { ascending: false })
          .limit(20);
        
        if (Array.isArray(data)) {
          const filteredContributors = data
            .filter(hasStringName)
            .filter(({ name: contributorName }) => contributorName.trim().length > 0)
            .map(({ name: contributorName }) => ({ name: contributorName }));
          setContributors(filteredContributors);
        }
      } catch (error) {
        console.error("Error fetching contributors:", error);
      }
    };
    fetchContributors();
  }, []);

  const handleContribute = async () => {
    const finalAmount: number = amount === "other" ? parseFloat(customAmount) : amount;

    if (Number.isNaN(finalAmount) || finalAmount < 10) {
      toast.error(t("contribute.min_amount_error"));
      return;
    }

    setLoading(true);
    try {
      const payload: ContributionInsertPayload = {
        amount: finalAmount,
        name: name ? sanitizeText(name) : null,
        email: email ? sanitizeText(email) : null,
        show_name: showName,
        status: "succeeded",
        payment_provider: "premium_gateway",
      };

      const { data, error } = await supportSupabase
        .from("contributions")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      if (!isRecord(data) || typeof data.id !== "string") {
        throw new Error("Invalid contribution response");
      }

      setContributionId(data.id);
      setStep("success");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error("Contribution error:", error);
      toast.error(t("dashboard.error_submit"));
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async () => {
    if (!feedback.trim()) return;
    setLoading(true);
    try {
      const payload: FeedbackInsertPayload = {
        contribution_id: contributionId,
        message: sanitizeText(feedback),
        name: name ? sanitizeText(name) : null,
        email: email ? sanitizeText(email) : null,
      };

      const { error } = await supportSupabase
        .from("feedbacks")
        .insert(payload);

      if (error) throw error;
      toast.success(t("contribute.feedback_success"));
      setFeedback("");
    } catch (error) {
      console.error("Feedback error:", error);
      toast.error(t("dashboard.error_submit"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] selection:bg-amber-100">
      {/* Subtle Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-50/50 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-slate-100/50 rounded-full blur-[100px]" />
      </div>

      <AppHeader />
      
      <main className="relative container max-w-4xl mx-auto px-6 py-16 md:py-24">
        <AnimatePresence mode="wait">
          {step === "form" ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-20"
            >
              {/* Hero Section */}
              <div className="text-center space-y-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-100/50 text-amber-800 text-xs font-medium tracking-wide uppercase"
                >
                  <Fingerprint className="w-3 h-3" />
                  {t("contribute.transparency")}
                </motion.div>
                
                <div className="space-y-4">
                  <h1 className="text-4xl md:text-6xl font-serif font-medium tracking-tight leading-tight">
                    {t("contribute.title")}
                  </h1>
                  <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed font-light">
                    {t("contribute.subtitle")}
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-8 pt-4">
                  {[
                    { icon: Shield, text: t("contribute.use_3") },
                    { icon: Globe, text: t("contribute.use_1") },
                    { icon: Zap, text: t("contribute.use_2") },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-slate-400 text-sm">
                      <item.icon className="w-4 h-4 stroke-[1.5]" />
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Impact Tiers */}
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-medium">{t("contribute.amount_label")}</h2>
                  <div className="h-px flex-1 bg-slate-100 mx-6 hidden md:block" />
                  <span className="text-sm text-slate-400 font-light">{t("contribute.currency")}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {tiers.map((tier) => (
                    <motion.div
                      key={tier.id}
                      whileHover={{ translateY: -5, boxShadow: "0 10px 20px rgba(0,0,0,0.05)" }}
                      whileTap={{ scale: 0.98 }}
                      className={`relative p-6 rounded-3xl border cursor-pointer transition-all duration-200
                        ${amount === tier.id ? "border-amber-400 bg-amber-50 shadow-md" : "border-slate-200 bg-white hover:border-amber-200"}`}
                      onClick={() => {
                        setAmount(tier.id);
                        setCustomAmount("");
                      }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100/70 flex items-center justify-center text-amber-600">
                          <tier.icon className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800">{tier.name}</h3>
                      </div>
                      <p className="text-3xl font-bold text-slate-900 mb-2">
                        {tier.id} {t("contribute.egp")}
                      </p>
                      <p className="text-sm text-slate-500 leading-relaxed">{tier.impact}</p>
                    </motion.div>
                  ))}

                  <motion.div
                    whileHover={{ translateY: -5, boxShadow: "0 10px 20px rgba(0,0,0,0.05)" }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative p-6 rounded-3xl border cursor-pointer transition-all duration-200
                      ${amount === "other" ? "border-amber-400 bg-amber-50 shadow-md" : "border-slate-200 bg-white hover:border-amber-200"}`}
                    onClick={() => setAmount("other")}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100/70 flex items-center justify-center text-slate-600">
                        <Coins className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-800">{t("contribute.other_amount")}</h3>
                    </div>
                    <Input
                      type="number"
                      placeholder="500"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="text-3xl font-bold text-slate-900 border-none p-0 h-auto bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                      dir="ltr"
                      onFocus={() => setAmount("other")}
                    />
                    <p className="text-sm text-slate-500 leading-relaxed">{t("contribute.other_amount")}</p>
                  </motion.div>
                </div>
              </div>

              {/* Personal Info & Privacy */}
              <Card className="p-8 rounded-3xl border-slate-200 bg-white shadow-sm">
                <CardContent className="p-0 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="name" className="text-slate-700">{t("contribute.name_label")}</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t("contribute.name_placeholder")}
                        className="mt-2 rounded-xl border-slate-300 focus-visible:ring-amber-400"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-slate-700">{t("contribute.email_label")}</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your.email@example.com"
                        className="mt-2 rounded-xl border-slate-300 focus-visible:ring-amber-400"
                        dir="ltr"
                      />
                      <p className="text-xs text-slate-500 mt-1">{t("contribute.email_helper")}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2" dir={isRTL ? "rtl" : "ltr"}>
                    <Checkbox
                      id="show-name"
                      checked={showName}
                      onCheckedChange={(checked) => setShowName(!!checked)}
                      className="border-slate-300 data-[state=checked]:bg-amber-500 data-[state=checked]:text-white"
                    />
                    <Label htmlFor="show-name" className="text-slate-700 cursor-pointer">
                      {t("contribute.show_name_label")}
                    </Label>
                  </div>

                  <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-start gap-3">
                    <Lock className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
                    <span>{t("contribute.privacy_note")}</span>
                  </p>
                </CardContent>
              </Card>

              {/* Payment Methods & Submit */}
              <div className="space-y-8">
                <h2 className="text-xl font-medium text-slate-800">{t("contribute.payment_methods")}</h2>
                <div className="flex flex-wrap gap-4">
                  <img src="/payment-methods/visa.svg" alt="Visa" className="h-8" />
                  <img src="/payment-methods/mastercard.svg" alt="Mastercard" className="h-8" />
                  <img src="/payment-methods/fawry.svg" alt="Fawry" className="h-8" />
                  <img src="/payment-methods/instapay.svg" alt="Instapay" className="h-8" />
                </div>

                <Button
                  onClick={handleContribute}
                  disabled={loading}
                  className="w-full h-14 rounded-xl text-lg font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-200 transition-all active:scale-98"
                >
                  {loading ? t("contribute.processing") : t("contribute.submit_btn")}
                </Button>
              </div>

              {/* Contributors List */}
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-medium text-slate-800">{t("contribute.contributors_list")}</h2>
                  <div className="h-px flex-1 bg-slate-100 mx-6 hidden md:block" />
                  <Link to="#" className="text-sm text-amber-600 hover:underline flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    {t("contribute.transparency")}
                  </Link>
                </div>

                {contributors.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {contributors.map((contributor, index) => (
                      <motion.span
                        key={index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="px-4 py-2 bg-slate-100 rounded-full text-sm font-medium text-slate-700 shadow-sm"
                      >
                        {contributor.name}
                      </motion.span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-8 bg-slate-50 rounded-xl border border-slate-100">
                    {t("contribute.no_contributors")}
                  </p>
                )}

                <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-start gap-3">
                  <Lock className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
                  <span>{t("contribute.transparency_desc")}</span>
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-center space-y-10 py-20"
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.2 }}
                className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mx-auto shadow-xl"
              >
                <CheckCircle2 className="w-12 h-12 text-emerald-600" />
              </motion.div>
              <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight leading-tight text-slate-900">
                {t("contribute.success_title")}
              </h1>
              <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-light">
                {t("contribute.success_msg")}
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button asChild variant="outline" className="h-12 px-8 rounded-xl text-base font-medium border-slate-300 text-slate-700 hover:bg-slate-50">
                  <Link to="/">{t("contribute.back_home")}</Link>
                </Button>
                <Button asChild className="h-12 px-8 rounded-xl text-base font-medium bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-200">
                  <Link to="https://github.com/SynapBytes/haqak/projects/1" target="_blank" rel="noopener noreferrer">
                    {t("contribute.view_roadmap")}
                  </Link>
                </Button>
              </div>

              {/* Feedback Section */}
              <Card className="mt-20 p-8 rounded-3xl border-slate-200 bg-white shadow-sm max-w-xl mx-auto">
                <CardContent className="p-0 space-y-6">
                  <h2 className="text-xl font-medium text-slate-800">{t("contribute.feedback_title")}</h2>
                  <Textarea
                    placeholder={t("contribute.feedback_placeholder")}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="min-h-[120px] rounded-xl border-slate-300 focus-visible:ring-amber-400"
                  />
                  <Button
                    onClick={handleFeedback}
                    disabled={loading || !feedback.trim()}
                    className="w-full h-12 rounded-xl text-base font-bold bg-slate-900 hover:bg-black text-white shadow-lg shadow-slate-200 transition-all active:scale-98"
                  >
                    {loading ? t("contribute.processing") : t("contribute.feedback_send")}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Support;
