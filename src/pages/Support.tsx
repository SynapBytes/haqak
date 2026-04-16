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
  Heart, Shield, CheckCircle2,
  Lock, Sparkles, Star, Users,
  Coins, Leaf, Globe, Fingerprint,
  ArrowRight, Building2, Code2, Megaphone,
  Server, BadgeCheck, EyeOff, FileText,
  MessageCircleHeart
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

// Animation helper
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number], delay },
});

// Tier config
const TIER_CONFIG = [
  { id: 50,   icon: Leaf,     nameKey: "tier_1" as const, impactKey: "impact_1" as const, taglineKey: "tagline_friend" as const,   recommended: false },
  { id: 100,  icon: Heart,    nameKey: "tier_2" as const, impactKey: "impact_2" as const, taglineKey: "tagline_builder" as const,  recommended: true  },
  { id: 500,  icon: Sparkles, nameKey: "tier_3" as const, impactKey: "impact_3" as const, taglineKey: "tagline_guardian" as const, recommended: false },
  { id: 1000, icon: Star,     nameKey: "tier_4" as const, impactKey: "impact_4" as const, taglineKey: "tagline_founder" as const,  recommended: false },
];

// Fund allocation
const FUND_ITEMS = [
  { icon: Server,    pct: 38, labelKey: "fund_infrastructure" as const, descKey: "fund_infrastructure_desc" as const, color: "#D4AF84" },
  { icon: Shield,    pct: 27, labelKey: "fund_security" as const,       descKey: "fund_security_desc" as const,       color: "#A89070" },
  { icon: Code2,     pct: 25, labelKey: "fund_development" as const,    descKey: "fund_development_desc" as const,    color: "#8A7060" },
  { icon: Megaphone, pct: 10, labelKey: "fund_community" as const,      descKey: "fund_community_desc" as const,      color: "#6A5850" },
];

// Trust indicators
const TRUST_ITEMS = [
  { icon: BadgeCheck,         labelKey: "trust_secure" as const      },
  { icon: EyeOff,             labelKey: "trust_private" as const     },
  { icon: FileText,           labelKey: "trust_transparent" as const },
  { icon: MessageCircleHeart, labelKey: "trust_refund" as const      },
];

// Section header component
const SectionHeader = ({ title }: { title: string }) => (
  <h2 className="text-xl md:text-2xl font-serif font-medium text-[#1A1A1A] tracking-tight">{title}</h2>
);

const Support = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  const [amount, setAmount]                 = useState<number | "other">(100);
  const [customAmount, setCustomAmount]     = useState("");
  const [name, setName]                     = useState("");
  const [email, setEmail]                   = useState("");
  const [showName, setShowName]             = useState(false);
  const [step, setStep]                     = useState<"form" | "success">("form");
  const [loading, setLoading]               = useState(false);
  const [feedback, setFeedback]             = useState("");
  const [contributionId, setContributionId] = useState<string | null>(null);
  const [contributors, setContributors]     = useState<{ name: string }[]>([]);

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
          setContributors(
            data
              .filter(hasStringName)
              .filter(({ name: n }) => n.trim().length > 0)
              .map(({ name: n }) => ({ name: n }))
          );
        }
      } catch (err) {
        console.error("Error fetching contributors:", err);
      }
    };
    fetchContributors();
  }, []);

  const handleContribute = async () => {
    const finalAmount = amount === "other" ? parseFloat(customAmount) : amount;

    if (isNaN(finalAmount) || finalAmount < 10) {
      toast.error(t("contribute.min_amount_error"));
      return;
    }

    setLoading(true);
    try {
      const payload: ContributionInsertPayload = {
        amount:           finalAmount,
        name:             name  ? sanitizeText(name)  : null,
        email:            email ? sanitizeText(email) : null,
        show_name:        showName,
        status:           "succeeded",
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
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Contribution error:", err);
      toast.error(t("dashboard.error_submit"));
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async () => {
    if (!feedback.trim()) return;
    setLoading(true);
    try {
      const feedbackPayload: FeedbackInsertPayload = {
        contribution_id: contributionId,
        message:         sanitizeText(feedback),
        name:            name  ? sanitizeText(name)  : null,
        email:           email ? sanitizeText(email) : null,
      };
      const { error } = await supportSupabase.from("feedbacks").insert(feedbackPayload);
      if (error) throw error;
      toast.success(t("contribute.feedback_success"));
      setFeedback("");
    } catch (err) {
      console.error("Feedback error:", err);
      toast.error(t("dashboard.error_submit"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] selection:bg-amber-100/60" dir={isRTL ? "rtl" : "ltr"}>
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-[15%] -left-[10%] w-[50%] h-[50%] bg-amber-50/60 rounded-full blur-[140px]" />
        <div className="absolute -bottom-[10%] -right-[5%] w-[35%] h-[35%] bg-slate-100/60 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] left-[50%] w-[20%] h-[20%] bg-amber-50/30 rounded-full blur-[100px]" />
      </div>

      <AppHeader />

      <main className="relative container max-w-4xl mx-auto px-5 sm:px-8 py-16 md:py-24">
        <AnimatePresence mode="wait">

          {step === "form" ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-24"
            >

              {/* ── Hero ── */}
              <section className="text-center space-y-8">
                <motion.div {...fadeUp(0.15)} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4AF84]/10 border border-[#D4AF84]/25 text-[#8A6A3A] text-xs font-medium tracking-widest uppercase">
                  <Fingerprint className="w-3 h-3" />
                  {t("contribute.transparency")}
                </motion.div>

                <motion.div {...fadeUp(0.25)} className="space-y-5">
                  <h1 className="text-4xl md:text-6xl font-serif font-medium tracking-tight leading-[1.15]">
                    {t("contribute.title")}
                  </h1>
                  <p className="text-lg md:text-xl text-[#5A5A5A] max-w-2xl mx-auto leading-relaxed font-light">
                    {t("contribute.subtitle")}
                  </p>
                </motion.div>

                <motion.div {...fadeUp(0.38)} className="flex flex-wrap justify-center gap-6 pt-2">
                  {[
                    { icon: Shield, text: t("contribute.use_3") },
                    { icon: Globe,  text: t("contribute.use_1") },
                    { icon: Users,  text: t("contribute.use_2") },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-[#7A7A7A] text-sm">
                      <item.icon className="w-4 h-4 stroke-[1.5] text-[#D4AF84]" />
                      <span>{item.text}</span>
                    </div>
                  ))}
                </motion.div>

                <motion.div {...fadeUp(0.45)} className="flex items-center justify-center gap-4 pt-2">
                  <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#D4AF84]/40" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF84]/60" />
                  <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#D4AF84]/40" />
                </motion.div>
              </section>

              {/* ── Why We Need Support ── */}
              <motion.section {...fadeUp(0)} className="space-y-8">
                <SectionHeader title={t("contribute.why_title")} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl border border-[#E8E4DF] p-7 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
                    <p className="text-[#5A5A5A] leading-relaxed font-light">
                      {t("contribute.why_desc")}
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl border border-[#E8E4DF] p-7 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
                    <ul className="space-y-3">
                      {[
                        t("contribute.why_point_1"),
                        t("contribute.why_point_2"),
                        t("contribute.why_point_3"),
                        t("contribute.why_point_4"),
                      ].map((point, i) => (
                        <li key={i} className="flex items-start gap-3 text-[#3A3A3A] text-sm">
                          <CheckCircle2 className="w-4 h-4 text-[#D4AF84] flex-shrink-0 mt-0.5" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.section>

              {/* ── Contribution Tiers ── */}
              <motion.section {...fadeUp(0)} className="space-y-8">
                <div className="flex items-center gap-4">
                  <SectionHeader title={t("contribute.amount_label")} />
                  <span className="hidden md:block text-sm text-[#9A9A9A] font-light whitespace-nowrap">
                    {t("contribute.currency")}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {TIER_CONFIG.map((tier) => {
                    const isSelected = amount === tier.id;
                    const TierIcon = tier.icon;
                    return (
                      <motion.button
                        key={tier.id}
                        type="button"
                        whileHover={{ y: -4, boxShadow: "0 12px 32px rgba(0,0,0,0.08)" }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => { setAmount(tier.id); setCustomAmount(""); }}
                        className={[
                          "relative text-start p-6 rounded-[20px] border cursor-pointer transition-all duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF84] focus-visible:ring-offset-2",
                          isSelected
                            ? "border-[#D4AF84] bg-gradient-to-b from-[#FDF8F0] to-white shadow-[0_6px_24px_rgba(212,175,132,0.18)]"
                            : "border-[#E8E4DF] bg-white hover:border-[#D4AF84]/60 shadow-[0_2px_12px_rgba(0,0,0,0.04)]",
                        ].join(" ")}
                        aria-pressed={isSelected}
                      >
                        {tier.recommended && (
                          <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#1A1A1A] text-white text-[10px] font-medium tracking-wide uppercase whitespace-nowrap">
                            {t("contribute.recommended")}
                          </span>
                        )}

                        <div className={[
                          "w-9 h-9 rounded-full flex items-center justify-center mb-4",
                          isSelected ? "bg-[#D4AF84]/20 text-[#8A6A3A]" : "bg-[#F5F3F0] text-[#9A9A9A]",
                        ].join(" ")}>
                          <TierIcon className="w-[18px] h-[18px]" />
                        </div>

                        <p className={["text-base font-semibold mb-0.5", isSelected ? "text-[#1A1A1A]" : "text-[#3A3A3A]"].join(" ")}>
                          {t(`contribute.${tier.nameKey}`)}
                        </p>

                        <p className="text-[11px] text-[#9A9A9A] mb-3 font-light italic">
                          {t(`contribute.${tier.taglineKey}`)}
                        </p>

                        <p className={["text-2xl font-bold mb-1", isSelected ? "text-[#1A1A1A]" : "text-[#3A3A3A]"].join(" ")}>
                          {tier.id}
                          <span className="text-sm font-normal text-[#9A9A9A] ms-1">{t("contribute.egp")}</span>
                        </p>

                        <p className={["text-xs leading-relaxed mt-2", isSelected ? "text-[#5A5A5A]" : "text-[#9A9A9A]"].join(" ")}>
                          {t(`contribute.${tier.impactKey}`)}
                        </p>

                        {isSelected && (
                          <motion.div
                            layoutId="tier-selected"
                            className="absolute bottom-4 end-4 w-5 h-5 rounded-full bg-[#D4AF84] flex items-center justify-center"
                            initial={false}
                          >
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Custom amount */}
                <motion.div
                  whileHover={{ y: -2 }}
                  onClick={() => setAmount("other")}
                  className={[
                    "p-6 rounded-[20px] border cursor-pointer transition-all duration-250",
                    amount === "other"
                      ? "border-[#D4AF84] bg-gradient-to-b from-[#FDF8F0] to-white shadow-[0_6px_24px_rgba(212,175,132,0.15)]"
                      : "border-[#E8E4DF] bg-white hover:border-[#D4AF84]/60 shadow-[0_2px_12px_rgba(0,0,0,0.04)]",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={[
                      "w-9 h-9 rounded-full flex items-center justify-center",
                      amount === "other" ? "bg-[#D4AF84]/20 text-[#8A6A3A]" : "bg-[#F5F3F0] text-[#9A9A9A]",
                    ].join(" ")}>
                      <Coins className="w-[18px] h-[18px]" />
                    </div>
                    <p className="text-base font-semibold text-[#3A3A3A]">{t("contribute.other_amount")}</p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder={t("contribute.other_amount_placeholder")}
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      onFocus={() => setAmount("other")}
                      className="text-2xl font-bold text-[#1A1A1A] border-none p-0 h-auto bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-[#C8C4C0] max-w-[160px]"
                      dir="ltr"
                    />
                    <span className="text-sm text-[#9A9A9A]">{t("contribute.egp")}</span>
                  </div>
                  <p className="text-xs text-[#9A9A9A] mt-2 font-light">{t("contribute.other_amount_desc")}</p>
                </motion.div>
              </motion.section>

              {/* ── Where Your Support Goes ── */}
              <motion.section {...fadeUp(0)} className="space-y-8">
                <div className="space-y-2">
                  <SectionHeader title={t("contribute.fund_title")} />
                  <p className="text-sm text-[#7A7A7A] font-light">{t("contribute.fund_subtitle")}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {FUND_ITEMS.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <div
                        key={item.labelKey}
                        className="bg-white rounded-2xl border border-[#E8E4DF] p-6 shadow-[0_2px_16px_rgba(0,0,0,0.03)] flex items-start gap-4"
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${item.color}18` }}
                        >
                          <ItemIcon className="w-5 h-5" style={{ color: item.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-[#1A1A1A] text-sm">{t(`contribute.${item.labelKey}`)}</p>
                            <span className="text-xs font-bold ms-2 flex-shrink-0" style={{ color: item.color }}>{item.pct}%</span>
                          </div>
                          <p className="text-xs text-[#7A7A7A] leading-relaxed font-light">{t(`contribute.${item.descKey}`)}</p>
                          <div className="mt-3 h-1 bg-[#F0EDE8] rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              whileInView={{ width: `${item.pct}%` }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.section>

              {/* ── Your Legacy (Personal Info) ── */}
              <motion.section {...fadeUp(0)} className="space-y-6">
                <div className="space-y-2">
                  <SectionHeader title={t("contribute.your_legacy_title")} />
                  <p className="text-sm text-[#7A7A7A] font-light">{t("contribute.your_legacy_desc")}</p>
                </div>

                <Card className="rounded-[20px] border-[#E8E4DF] bg-white shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
                  <CardContent className="p-7 space-y-7">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-[#3A3A3A] text-sm font-medium">
                          {t("contribute.name_label")}
                        </Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder={t("contribute.name_placeholder")}
                          className="rounded-xl border-[#D8D4CF] focus-visible:ring-[#D4AF84] bg-[#FDFCFB] text-[#1A1A1A] placeholder:text-[#B8B4B0]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-[#3A3A3A] text-sm font-medium">
                          {t("contribute.email_label")}
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          className="rounded-xl border-[#D8D4CF] focus-visible:ring-[#D4AF84] bg-[#FDFCFB] text-[#1A1A1A] placeholder:text-[#B8B4B0]"
                          dir="ltr"
                        />
                        <p className="text-[11px] text-[#9A9A9A] font-light">{t("contribute.email_helper")}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="show-name"
                        checked={showName}
                        onCheckedChange={(checked) => setShowName(!!checked)}
                        className="mt-0.5 border-[#D8D4CF] data-[state=checked]:bg-[#D4AF84] data-[state=checked]:border-[#D4AF84]"
                      />
                      <div>
                        <Label htmlFor="show-name" className="text-[#3A3A3A] cursor-pointer text-sm font-medium">
                          {t("contribute.show_name_label")}
                        </Label>
                        <p className="text-[11px] text-[#9A9A9A] font-light mt-0.5">{t("contribute.show_name_desc")}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 rounded-xl bg-[#F8F5F0] border border-[#EDE8E0]">
                      <Lock className="w-4 h-4 text-[#D4AF84] flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-[#6A6A6A] leading-relaxed">{t("contribute.privacy_note")}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.section>

              {/* ── Trust Indicators ── */}
              <motion.section {...fadeUp(0)} className="space-y-6">
                <SectionHeader title={t("contribute.trust_title")} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {TRUST_ITEMS.map((item) => {
                    const TrustIcon = item.icon;
                    return (
                      <div
                        key={item.labelKey}
                        className="flex items-center gap-3 p-4 rounded-xl bg-white border border-[#E8E4DF] shadow-[0_1px_8px_rgba(0,0,0,0.03)]"
                      >
                        <TrustIcon className="w-4 h-4 text-[#D4AF84] flex-shrink-0" />
                        <p className="text-sm text-[#3A3A3A]">{t(`contribute.${item.labelKey}`)}</p>
                      </div>
                    );
                  })}
                </div>
              </motion.section>

              {/* ── Payment Methods & Submit ── */}
              <motion.section {...fadeUp(0)} className="space-y-7">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-medium text-[#3A3A3A]">{t("contribute.payment_methods")}</p>
                    <div className="h-px flex-1 bg-[#E8E4DF]" />
                    <Shield className="w-4 h-4 text-[#D4AF84]" />
                  </div>
                  <div className="flex flex-wrap gap-3 items-center">
                    <img src="/payment-methods/visa.svg"       alt="Visa"       className="h-7 opacity-70 hover:opacity-100 transition-opacity" />
                    <img src="/payment-methods/mastercard.svg" alt="Mastercard" className="h-7 opacity-70 hover:opacity-100 transition-opacity" />
                    <img src="/payment-methods/fawry.svg"      alt="Fawry"      className="h-7 opacity-70 hover:opacity-100 transition-opacity" />
                    <img src="/payment-methods/instapay.svg"   alt="Instapay"   className="h-7 opacity-70 hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xs text-[#9A9A9A] flex items-center gap-1.5 font-light">
                    <Lock className="w-3 h-3 text-[#D4AF84]" />
                    {t("contribute.secure_checkout")}
                  </p>
                </div>

                <Button
                  onClick={handleContribute}
                  disabled={loading}
                  className="w-full h-14 rounded-2xl text-base font-semibold bg-[#1A1A1A] hover:bg-black text-white shadow-[0_8px_32px_rgba(0,0,0,0.15)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.2)] transition-all duration-300 disabled:opacity-60 active:scale-[0.99] group"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full block"
                      />
                      {t("contribute.processing")}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {t("contribute.submit_btn")}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  )}
                </Button>
              </motion.section>

              {/* ── Community of Supporters ── */}
              <motion.section {...fadeUp(0)} className="space-y-8">
                <div className="flex items-center gap-4">
                  <SectionHeader title={t("contribute.contributors_list")} />
                  <Link
                    to="#"
                    className="hidden md:flex items-center gap-1.5 text-xs text-[#8A6A3A] hover:text-[#D4AF84] transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {t("contribute.transparency")}
                  </Link>
                </div>

                {contributors.length > 0 ? (
                  <div className="flex flex-wrap gap-2.5">
                    {contributors.map((contributor, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                        className="px-4 py-1.5 bg-white border border-[#E8E4DF] rounded-full text-sm font-medium text-[#3A3A3A] shadow-[0_1px_6px_rgba(0,0,0,0.04)]"
                      >
                        {contributor.name}
                      </motion.span>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-10 bg-white border border-[#E8E4DF] rounded-2xl text-center">
                    <Building2 className="w-8 h-8 text-[#D4AF84]/60" />
                    <p className="text-sm text-[#9A9A9A] font-light">{t("contribute.no_contributors")}</p>
                  </div>
                )}

                <div className="flex items-start gap-3 p-4 rounded-xl bg-[#F8F5F0] border border-[#EDE8E0]">
                  <Lock className="w-4 h-4 text-[#D4AF84] flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-[#6A6A6A] leading-relaxed">{t("contribute.transparency_desc")}</p>
                </div>
              </motion.section>

            </motion.div>

          ) : (

            /* ── Success State ── */
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
              className="text-center space-y-12 py-16 max-w-2xl mx-auto"
            >
              <motion.div
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 180, damping: 13, delay: 0.15 }}
                className="mx-auto w-24 h-24 rounded-full bg-gradient-to-b from-[#FDF8F0] to-[#F5EFE0] border border-[#D4AF84]/30 flex items-center justify-center shadow-[0_8px_40px_rgba(212,175,132,0.2)]"
              >
                <CheckCircle2 className="w-11 h-11 text-[#D4AF84]" />
              </motion.div>

              <div className="space-y-5">
                <motion.h1
                  {...fadeUp(0.3)}
                  className="text-3xl md:text-5xl font-serif font-medium tracking-tight leading-tight text-[#1A1A1A]"
                >
                  {t("contribute.success_title")}
                </motion.h1>
                <motion.p {...fadeUp(0.4)} className="text-lg text-[#5A5A5A] leading-relaxed font-light">
                  {t("contribute.success_msg")}
                </motion.p>
                <motion.p {...fadeUp(0.5)} className="text-sm text-[#8A6A3A] font-medium">
                  {t("contribute.success_join")}
                </motion.p>
              </div>

              <motion.div {...fadeUp(0.55)} className="flex flex-col sm:flex-row justify-center gap-4">
                <Button asChild variant="outline" className="h-12 px-8 rounded-xl border-[#D8D4CF] text-[#3A3A3A] hover:bg-[#F8F5F0] font-medium">
                  <Link to="/">{t("contribute.back_home")}</Link>
                </Button>
                <Button asChild className="h-12 px-8 rounded-xl bg-[#1A1A1A] hover:bg-black text-white font-medium shadow-[0_4px_20px_rgba(0,0,0,0.12)] group">
                  <Link to="https://github.com/Axonexiis/haqak/projects/1" target="_blank" rel="noopener noreferrer">
                    <span className="flex items-center gap-2">
                      {t("contribute.view_roadmap")}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </Link>
                </Button>
              </motion.div>

              <motion.div {...fadeUp(0.65)}>
                <Card className="rounded-[20px] border-[#E8E4DF] bg-white shadow-[0_2px_20px_rgba(0,0,0,0.04)] text-start">
                  <CardContent className="p-7 space-y-5">
                    <h2 className="text-lg font-medium text-[#1A1A1A]">{t("contribute.feedback_title")}</h2>
                    <Textarea
                      placeholder={t("contribute.feedback_placeholder")}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="min-h-[110px] rounded-xl border-[#D8D4CF] focus-visible:ring-[#D4AF84] bg-[#FDFCFB] text-[#1A1A1A] placeholder:text-[#B8B4B0] resize-none"
                    />
                    <Button
                      onClick={handleFeedback}
                      disabled={loading || !feedback.trim()}
                      className="w-full h-11 rounded-xl text-sm font-semibold bg-[#1A1A1A] hover:bg-black text-white disabled:opacity-50"
                    >
                      {loading ? t("contribute.processing") : t("contribute.feedback_send")}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
};

export default Support;
