import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, ShieldCheck, LogIn, ArrowRight, Eye, EyeOff, Lock, Mail, Phone, IdCard, Fingerprint, KeyRound } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import ornament2 from "@/assets/egyptian-ornament-2.png";
import egyptianAnkh from "@/assets/egyptian-ankh.png";
import egyptianNefertiti from "@/assets/egyptian-nefertiti.png";
import ornament1 from "@/assets/egyptian-ornament-1.png";

type AuthMode = "login" | "signup-citizen" | "signup-mp" | "forgot-password";

const Auth = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");

  const resetForm = () => {
    setEmail(""); setPassword(""); setFullName(""); setPhone(""); setRegistrationNumber("");
  };

  const translateError = (msg: string): string => {
    if (msg.includes("Invalid login credentials")) return t("auth.error_credentials");
    if (msg.includes("Email not confirmed")) return t("auth.error_email_not_confirmed");
    if (msg.includes("User already registered")) return t("auth.error_already_registered");
    if (msg.includes("Password should be")) return t("auth.password_weak");
    if (msg.includes("Email rate limit")) return t("auth.error_rate_limit");
    if (msg.includes("For security purposes")) return t("auth.error_security_wait");
    if (msg.includes("Too many requests")) return t("auth.error_too_many");
    return msg;
  };

  const getRoleRedirect = async (userId: string): Promise<string> => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).single();
    if (data?.role === "admin") return "/admin";
    if (data?.role === "mp") return "/mp";
    return "/citizen";
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success(t("auth.login_success"));
      const redirect = await getRoleRedirect(data.user.id);
      navigate(redirect);
    } catch (err: any) {
      toast.error(translateError(err.message || t("auth.login_error")));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error(t("auth.password_min_error")); return; }
    if (!/\d/.test(password) || !/[a-zA-Z\u0600-\u06FF]/.test(password)) {
      toast.error(t("auth.password_mix_error")); return;
    }
    if (!/^01[0-9]{9}$/.test(phone)) { toast.error(t("auth.phone_invalid")); return; }
    setLoading(true);
    const timeoutId = setTimeout(() => {
      setLoading(false);
      toast.error(t("auth.timeout_error"));
    }, 30000);
    try {
      const role = mode === "signup-mp" ? "mp" : "citizen";
      const metadata: Record<string, string> = { full_name: fullName, phone, role };
      if (mode === "signup-mp" && registrationNumber) metadata.registration_number = registrationNumber;

      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: metadata, emailRedirectTo: window.location.origin },
      });
      clearTimeout(timeoutId);
      if (error) throw error;
      toast.success(t("auth.signup_success"));
      setMode("login"); resetForm();
    } catch (err: any) {
      clearTimeout(timeoutId);
      const msg = err.message || t("auth.signup_error");
      if (msg.includes("fetch") || msg.includes("network") || msg.includes("Failed")) {
        toast.error(t("auth.network_error"));
      } else {
        toast.error(translateError(msg));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error(t("auth.enter_email")); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success(t("auth.forgot_success"));
      setMode("login");
    } catch (err: any) {
      toast.error(translateError(err.message || t("auth.forgot_error")));
    } finally {
      setLoading(false);
    }
  };

  const isSignup = mode === "signup-citizen" || mode === "signup-mp";
  const isForgot = mode === "forgot-password";

  const modeConfig = {
    login: { title: t("auth.login_title"), subtitle: t("auth.login_subtitle"), icon: LogIn, gradient: "from-accent to-info" },
    "signup-citizen": { title: t("auth.signup_citizen_title"), subtitle: t("auth.signup_citizen_subtitle"), icon: User, gradient: "from-primary to-accent" },
    "signup-mp": { title: t("auth.signup_mp_title"), subtitle: t("auth.signup_mp_subtitle"), icon: ShieldCheck, gradient: "from-warning to-accent" },
    "forgot-password": { title: t("auth.forgot_title"), subtitle: t("auth.forgot_subtitle"), icon: KeyRound, gradient: "from-accent to-primary" },
  };

  const { title, subtitle, icon: ModeIcon, gradient } = modeConfig[mode];

  const { theme } = useTheme();
  const isDark = theme === "dark";
  const decoStyle = (op: [number, number]) => ({
    opacity: isDark ? op[0] : op[1],
    filter: isDark
      ? "brightness(1.08) drop-shadow(0 0 34px rgba(200,149,60,0.38))"
      : "drop-shadow(0 14px 28px rgba(200,149,60,0.18))",
  });

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
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8 text-center">
            <motion.div
              key={mode}
              initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${gradient} flex items-center justify-center mx-auto mb-5 shadow-xl`}
            >
              <ModeIcon className="w-9 h-9 text-white" />
            </motion.div>
            <motion.h1 key={`title-${mode}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-bold text-foreground mb-2 tracking-tight">
              {title}
            </motion.h1>
            <p className="text-muted-foreground text-sm">{subtitle}</p>
          </div>

          {/* Card */}
          <motion.div layout className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-7 md:p-8">
              <AnimatePresence mode="wait">
                <motion.form
                  key={mode}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={isForgot ? handleForgotPassword : isSignup ? handleSignup : handleLogin}
                  className="space-y-5"
                >
                  {isSignup && (
                    <>
                      <div className="space-y-1.5">
                        <label htmlFor="fullName" className="text-sm font-semibold text-foreground block">{t("auth.full_name")}</label>
                        <div className="relative group">
                          <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t("auth.full_name_placeholder")} required aria-required="true" aria-label={t("auth.full_name")} className="text-right pr-11 h-12 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-colors" />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-muted flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="phone" className="text-sm font-semibold text-foreground block">{t("auth.phone")}</label>
                        <div className="relative group">
                          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("auth.phone_placeholder")} type="tel" required dir="ltr" aria-required="true" aria-label={t("auth.phone")} className="pl-11 text-left h-12 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-colors" maxLength={11} />
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-muted flex items-center justify-center">
                            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                      {mode === "signup-mp" && (
                        <div className="space-y-1.5">
                          <label htmlFor="regNumber" className="text-sm font-semibold text-foreground block">{t("auth.registration_number")}</label>
                          <div className="relative group">
                            <Input id="regNumber" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} placeholder={t("auth.registration_number_placeholder")} required aria-required="true" aria-label={t("auth.registration_number")} className="text-right pr-11 h-12 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-colors" />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-muted flex items-center justify-center">
                              <IdCard className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-sm font-semibold text-foreground block">{t("auth.email")}</label>
                    <div className="relative group">
                      <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("auth.email_placeholder")} type="email" required dir="ltr" aria-required="true" aria-label={t("auth.email")} className="pl-11 text-left h-12 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-colors" />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-muted flex items-center justify-center">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  </div>

                  {!isForgot && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-foreground block">{t("auth.password")}</label>
                        {mode === "login" && (
                          <button type="button" onClick={() => setMode("forgot-password")} className="text-xs text-accent hover:underline font-medium">
                            {t("auth.forgot_password")}
                          </button>
                        )}
                      </div>
                      <div className="relative group">
                        <Input id="password" value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? "text" : "password"} placeholder="••••••••" required minLength={8} dir="ltr" aria-required="true" aria-label={t("auth.password")} className="px-11 text-left h-12 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-colors" />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-muted flex items-center justify-center">
                          <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {isSignup && (
                        <div className="mt-2.5 space-y-1.5">
                          <div className={`text-xs flex items-center gap-2 transition-colors ${password.length >= 8 ? "text-success" : "text-muted-foreground"}`}>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${password.length >= 8 ? "border-success bg-success/10" : "border-muted"}`}>
                              {password.length >= 8 && <div className="w-1.5 h-1.5 rounded-full bg-success" />}
                            </div>
                            {t("auth.password_min")}
                          </div>
                          <div className={`text-xs flex items-center gap-2 transition-colors ${/\d/.test(password) && /[a-zA-Z\u0600-\u06FF]/.test(password) ? "text-success" : "text-muted-foreground"}`}>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${/\d/.test(password) && /[a-zA-Z\u0600-\u06FF]/.test(password) ? "border-success bg-success/10" : "border-muted"}`}>
                              {/\d/.test(password) && /[a-zA-Z\u0600-\u06FF]/.test(password) && <div className="w-1.5 h-1.5 rounded-full bg-success" />}
                            </div>
                            {t("auth.password_mix")}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {mode === "signup-mp" && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-gradient-to-br from-warning/[0.08] to-warning/[0.03] border border-warning/15">
                      <p className="text-xs text-warning flex items-center gap-2.5 leading-relaxed">
                        <div className="w-8 h-8 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        {t("auth.mp_approval_note")}
                      </p>
                    </motion.div>
                  )}

                  <Button type="submit" disabled={loading} className={`w-full gap-2.5 bg-gradient-to-l ${gradient} text-white hover:opacity-90 h-13 text-base font-semibold rounded-xl shadow-lg transition-all hover:-translate-y-0.5`} style={{ height: '52px' }}>
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : isForgot ? (
                      <><Mail className="w-5 h-5" /> {t("auth.submit_forgot")}</>
                    ) : isSignup ? (
                      <><Fingerprint className="w-5 h-5" /> {t("auth.submit_signup")}</>
                    ) : (
                      <><LogIn className="w-5 h-5" /> {t("auth.submit_login")}</>
                    )}
                  </Button>
                </motion.form>
              </AnimatePresence>
            </div>

            {/* Bottom section */}
            <div className="px-7 md:px-8 pb-7 md:pb-8">
              <div className="pt-5 border-t border-border/50">
                {mode === "login" ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground text-center font-medium">{t("auth.no_account")}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                        <Button variant="outline" onClick={() => { setMode("signup-citizen"); resetForm(); }} className="gap-2 h-12 w-full rounded-xl border-border/50 hover:border-accent/30 hover:bg-accent/5 transition-all">
                          <User className="w-4 h-4 text-accent" /> {t("auth.signup_citizen")}
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                        <Button variant="outline" onClick={() => { setMode("signup-mp"); resetForm(); }} className="gap-2 h-12 w-full rounded-xl border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all">
                          <ShieldCheck className="w-4 h-4 text-primary" /> {t("auth.signup_mp")}
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                ) : (
                  <Button variant="ghost" className="w-full gap-2 h-11 rounded-xl hover:bg-accent/5" onClick={() => { setMode("login"); resetForm(); }}>
                    <ArrowRight className="w-4 h-4" /> {isForgot ? t("auth.back_to_login") : t("auth.have_account")}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Security badge */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex items-center justify-center gap-2 mt-6 text-xs text-muted-foreground">
            <Lock className="w-3 h-3" />
            <span>{t("auth.security_note")}</span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
