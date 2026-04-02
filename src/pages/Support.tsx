import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  Heart, Shield, Smartphone, Zap, ArrowRight, CheckCircle2, 
  CreditCard, Wallet, Building2, MessageSquare, ArrowLeft,
  Info, Globe, Lock
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeText } from "@/lib/sanitize";

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
  const [loadingContributors, setLoadingContributors] = useState(true);

  const suggestedAmounts = [50, 100, 200, 500];

  useEffect(() => {
    const fetchContributors = async () => {
      try {
        const { data } = await (supabase
          .from("contributions" as any)
          .select("name")
          .eq("show_name", true)
          .eq("status", "succeeded")
          .order("created_at", { ascending: false })
          .limit(20) as any);
        
        if (data) setContributors((data as any[]).filter((c: any) => c.name) as { name: string }[]);
      } catch (error) {
        console.error("Error fetching contributors:", error);
      } finally {
        setLoadingContributors(false);
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

    if (finalAmount > 100000) {
      toast.error(t("contribute.max_amount_error"));
      return;
    }

    setLoading(true);
    
    try {
      // In a real app, we would call a payment provider here.
      // For now, we'll simulate a successful contribution.
      const { data, error } = await supabase.from("contributions").insert({
        amount: finalAmount,
        name: name ? sanitizeText(name) : null,
        email: email ? sanitizeText(email) : null,
        show_name: showName,
        status: "succeeded", // Simulated success
        payment_provider: "placeholder",
      }).select().single();

      if (error) throw error;

      setContributionId(data.id);
      setStep("success");
      toast.success(t("contribute.success_title"));
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
      const { error } = await supabase.from("feedbacks").insert({
        contribution_id: contributionId,
        message: sanitizeText(feedback),
        name: name ? sanitizeText(name) : null,
        email: email ? sanitizeText(email) : null,
      });

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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-100/70 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -left-32 -top-20 w-80 h-80 rounded-full bg-amber-200 blur-3xl" />
        <div className="absolute right-[-10%] top-10 w-[320px] h-[320px] rounded-full bg-emerald-200 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[15%] w-[240px] h-[240px] rounded-full bg-amber-100 blur-2xl" />
      </div>

      <AppHeader />
      
      <main className="relative container max-w-5xl mx-auto px-4 py-12 md:py-20">
        <AnimatePresence mode="wait">
          {step === "form" ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              {/* Header Section */}
              <div className="text-center space-y-4">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-xl shadow-amber-200/60 ring-8 ring-white/70 mb-4"
                >
                  <Heart className="w-8 h-8 fill-current" />
                </motion.div>
                <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
                  {t("contribute.title")}
                </h1>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                  {t("contribute.subtitle")}
                </p>
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/70 backdrop-blur shadow-lg shadow-amber-100/50 border border-white/80 text-sm text-amber-700 font-semibold">
                  <Shield className="w-4 h-4" />
                  <span>{t("contribute.transparency_desc")}</span>
                </div>
              </div>

              {/* Usage Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { icon: Zap, text: t("contribute.use_1") },
                  { icon: Smartphone, text: t("contribute.use_2") },
                  { icon: Shield, text: t("contribute.use_3") },
                ].map((item, i) => (
                  <Card 
                    key={i} 
                    className="border border-white/70 bg-white/70 backdrop-blur-xl shadow-[0_20px_80px_rgba(15,23,42,0.07)]"
                  >
                    <CardContent className="pt-6 flex flex-col items-center text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-100 to-white flex items-center justify-center text-amber-700 shadow-inner shadow-amber-100">
                        <item.icon className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">{item.text}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Main Form */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 space-y-8">
                  {/* Amount Selection */}
                  <section className="space-y-4">
                    <Label className="text-base font-bold">{t("contribute.amount_label")}</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {suggestedAmounts.map((amt) => (
                        <Button
                          key={amt}
                          variant={amount === amt ? "default" : "outline"}
                          className={`h-14 text-lg font-bold rounded-xl transition-all border-2 ${
                            amount === amt
                              ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-[0_20px_60px_rgba(245,158,11,0.35)] border-amber-200"
                              : "bg-white/70 backdrop-blur border-white/80 hover:border-amber-200 hover:shadow-lg hover:shadow-amber-100/60"
                          }`}
                          onClick={() => setAmount(amt)}
                        >
                          <span className="flex items-baseline gap-1">
                            <span className="text-sm opacity-80">{t("contribute.egp")}</span>
                            {amt}
                          </span>
                          {amount === amt && <CheckCircle2 className="w-5 h-5 ml-2" />}
                        </Button>
                      ))}
                    </div>
                    <div className="relative">
                      <Button
                        variant={amount === "other" ? "default" : "outline"}
                        className={`w-full h-14 justify-between px-4 rounded-xl font-medium border-2 ${
                          amount === "other"
                            ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white border-amber-200 shadow-[0_20px_60px_rgba(245,158,11,0.35)]"
                            : "bg-white/70 backdrop-blur border-white/80 hover:border-amber-200"
                        }`}
                        onClick={() => setAmount("other")}
                      >
                        <span>{t("contribute.other_amount")}</span>
                        {amount === "other" && <CheckCircle2 className="w-5 h-5" />}
                      </Button>
                      {amount === "other" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="mt-3"
                        >
                          <div className="relative">
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={customAmount}
                              onChange={(e) => setCustomAmount(e.target.value)}
                              className="h-14 text-lg pr-12 rounded-xl"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                              {t("contribute.egp")}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </section>

                  {/* Personal Info */}
                  <section className="space-y-6 p-6 rounded-2xl border border-white/70 bg-white/70 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.07)]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">{t("contribute.name_label")}</Label>
                        <Input
                          id="name"
                          placeholder={t("contribute.name_placeholder")}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">{t("contribute.email_label")}</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="example@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="rounded-xl"
                        />
                        <p className="text-[10px] text-muted-foreground">{t("contribute.email_helper")}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3 space-x-reverse pt-2">
                      <Checkbox
                        id="showName"
                        checked={showName}
                        onCheckedChange={(checked) => setShowName(!!checked)}
                        className="mt-1"
                      />
                      <div className="grid gap-1.5 leading-none">
                        <Label htmlFor="showName" className="text-sm font-medium cursor-pointer">
                          {t("contribute.show_name_label")}
                        </Label>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 rounded-lg bg-info/5 text-info text-xs">
                      <Info className="w-4 h-4 shrink-0" />
                      <p>{t("contribute.privacy_note")}</p>
                    </div>
                  </section>
                </div>

                 {/* Payment & Summary */}
                 <div className="lg:col-span-2 space-y-6">
                   <Card className="border border-white/70 bg-white/80 backdrop-blur-2xl shadow-[0_24px_80px_rgba(245,158,11,0.15)] rounded-2xl overflow-hidden">
                     <CardHeader className="bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border-b border-white/60">
                       <CardTitle className="text-lg flex items-center gap-2">
                         <Lock className="w-4 h-4 text-amber-600" />
                         {t("contribute.payment_methods")}
                       </CardTitle>
                     </CardHeader>
                     <CardContent className="p-6 space-y-6">
                       <div className="grid grid-cols-2 gap-3">
                         {[
                           { icon: CreditCard, label: "Visa/Master" },
                          { icon: Building2, label: "InstaPay" },
                          { icon: Wallet, label: "Wallets" },
                          { icon: Zap, label: "Fawry" },
                        ].map((method, i) => (
                          <div 
                            key={i} 
                            className="flex flex-col items-center p-3 rounded-xl border-2 border-white/70 bg-white/70 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-100/70 transition-all cursor-pointer group"
                          >
                            <method.icon className="w-6 h-6 mb-2 text-amber-600 group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-semibold text-foreground">{method.label}</span>
                          </div>
                        ))}
                       </div>

                      <div className="pt-4 border-t border-white/60 space-y-4">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">{t("dashboard.total_issues").replace("إجمالي المشاكل", "المبلغ")}</span>
                          <span className="font-bold text-xl text-amber-700">
                            {amount === "other" ? customAmount || "0" : amount} {t("contribute.egp")}
                          </span>
                        </div>
                        
                        <Button 
                          className="w-full h-14 text-lg font-bold rounded-xl gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-[0_20px_60px_rgba(245,158,11,0.35)]"
                          onClick={handleContribute}
                          disabled={loading}
                        >
                          {loading ? t("contribute.processing") : t("contribute.submit_btn")}
                          {!loading && (isRTL ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />)}
                        </Button>
                        
                        <div className="flex items-center justify-center gap-4 opacity-40 grayscale">
                          <CreditCard className="w-6 h-6" />
                          <Lock className="w-5 h-5" />
                          <Globe className="w-5 h-5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Link to="/" className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                    {t("contribute.back_home")}
                  </Link>
                </div>
              </div>

              {/* Contributors List Section */}
              <section className="pt-12 border-t">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                  <div className="text-center md:text-right">
                    <h3 className="text-2xl font-bold text-foreground">{t("contribute.contributors_list")}</h3>
                    <p className="text-sm text-muted-foreground">{t("contribute.transparency")}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-accent/5 px-4 py-2 rounded-full">
                    <Shield className="w-3 h-3" />
                    {t("contribute.transparency_desc")}
                  </div>
                </div>

                {loadingContributors ? (
                  <div className="flex justify-center py-12">
                    <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : contributors.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {contributors.map((c, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-4 rounded-xl bg-card border text-center text-sm font-medium shadow-sm"
                      >
                        {c.name}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed rounded-3xl text-muted-foreground">
                    <p>{t("contribute.no_contributors")}</p>
                  </div>
                )}
              </section>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-2xl mx-auto text-center space-y-12 py-10"
            >
              <div className="space-y-6">
                <div className="relative inline-block">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 12, stiffness: 200 }}
                    className="w-24 h-24 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto"
                  >
                    <CheckCircle2 className="w-12 h-12" />
                  </motion.div>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-full bg-success/20 -z-10"
                  />
                </div>
                
                <div className="space-y-3">
                  <h2 className="text-3xl md:text-4xl font-bold">{t("contribute.success_title")}</h2>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {t("contribute.success_msg")}
                  </p>
                </div>
              </div>

              <Card className="border-none bg-accent/5 shadow-none p-8 rounded-[2rem]">
                <div className="space-y-6">
                  <div className="flex items-center justify-center gap-3 text-accent">
                    <MessageSquare className="w-6 h-6" />
                    <h3 className="text-xl font-bold">{t("contribute.feedback_title")}</h3>
                  </div>
                  <Textarea
                    placeholder={t("contribute.feedback_placeholder")}
                    className="min-h-[120px] rounded-2xl bg-background border-none shadow-inner resize-none"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                  <Button 
                    className="w-full h-12 rounded-xl font-bold"
                    onClick={handleFeedback}
                    disabled={loading || !feedback.trim()}
                  >
                    {loading ? t("contribute.processing") : t("contribute.feedback_send")}
                  </Button>
                </div>
              </Card>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/" className="w-full sm:w-auto">
                  <Button variant="outline" className="w-full h-12 px-8 rounded-xl font-bold">
                    {t("contribute.back_home")}
                  </Button>
                </Link>
                <Button variant="ghost" className="w-full sm:w-auto h-12 px-8 rounded-xl font-bold gap-2 text-accent">
                  {t("contribute.view_roadmap")}
                  {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Support;
