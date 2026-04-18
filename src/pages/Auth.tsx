import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, ShieldCheck, LogIn, ArrowRight, Eye, EyeOff, Lock, IdCard, KeyRound, MapPin, Building2, Landmark, AlertCircle, CheckCircle2, Mail, Globe, Scale, FileText } from "lucide-react";
import { 
  getDistrictOptions, 
  getElectoralDistrictOptions, 
  getGovernorateOptions, 
  isValidDistrictForGovernorate, 
  isValidElectoralDistrictForGovernorate, 
  isValidGovernorate,
} from "@/utils/egyptianElectoralData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { analytics } from "@/lib/analytics";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";

import { validateEgyptianId, validateEgyptianIdWithReason, extractEgyptianIdInfo } from "@/lib/egyptianIdValidation";
import { cn } from "@/lib/utils";
import { isNetworkFailureMessage } from "@/lib/authError";
import TurnstileCaptcha from "@/components/TurnstileCaptcha";
import { APP_CONFIG } from "@/lib/config";

type AuthMode = "login" | "signup-citizen" | "signup-mp" | "forgot-password";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MEMBERSHIP_NUMBER_REGEX = /^[0-9]+$/;
const MAX_MEMBERSHIP_NUMBER = 568;

const Auth = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [district, setDistrict] = useState("");
  const [electoralDistrict, setElectoralDistrict] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [nationalId, setNationalId] = useState("");

  const [emailError, setEmailError] = useState("");
  const [nationalIdError, setNationalIdError] = useState("");
  const [membershipNumberError, setMembershipNumberError] = useState("");
  const [governorateError, setGovernorateError] = useState("");
  const [districtError, setDistrictError] = useState("");
  const [electoralError, setElectoralError] = useState("");
  const [isFormValid, setIsFormValid] = useState(false);
  const [signupSuccessful, setSignupSuccessful] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const isCaptchaRequired = !!APP_CONFIG.TURNSTILE_SITE_KEY;
  const hasValidCaptcha = !isCaptchaRequired || !!turnstileToken;

  const passwordHasNumber = useMemo(() => /\d/.test(password), [password]);
  const passwordHasLetter = useMemo(() => /[a-zA-Z\u0600-\u06FF]/.test(password), [password]);
  const governorateOptions = useMemo(() => getGovernorateOptions(), []);
  const districtOptions = useMemo(() => getDistrictOptions(governorate), [governorate]);
  const electoralOptions = useMemo(
    () => getElectoralDistrictOptions(governorate, district),
    [governorate, district],
  );

  useEffect(() => {
    const normalized = email.trim();
    if (normalized && !EMAIL_REGEX.test(normalized)) {
      setEmailError(t("auth.email_invalid"));
      return;
    }
    setEmailError("");
  }, [email, t]);

  useEffect(() => {
    if (nationalId && mode === "signup-citizen") {
      const validation = validateEgyptianIdWithReason(nationalId);
      if (!validation.valid) {
        setNationalIdError(validation.reason || t("auth.national_id_invalid"));
      } else {
        const idInfo = extractEgyptianIdInfo(nationalId);
        if (idInfo && !idInfo.isEgyptian) {
          setNationalIdError(t("auth.not_egyptian_citizen"));
        } else {
          setNationalIdError("");
        }
      }
    } else {
      setNationalIdError("");
    }
  }, [nationalId, mode, t]);

  useEffect(() => {
    if (registrationNumber && mode === "signup-mp") {
      if (!MEMBERSHIP_NUMBER_REGEX.test(registrationNumber)) {
        setMembershipNumberError(t("auth.membership_number_invalid"));
      } else {
        const num = parseInt(registrationNumber, 10);
        if (num < 1 || num > MAX_MEMBERSHIP_NUMBER) {
          setMembershipNumberError(t("auth.membership_number_out_of_range"));
        } else {
          setMembershipNumberError("");
        }
      }
    } else {
      setMembershipNumberError("");
    }
  }, [registrationNumber, mode, t]);

  useEffect(() => {
    const validateForm = () => {
      const emailValid = EMAIL_REGEX.test(email.trim());

      if (mode === "login") {
        return emailValid && password.length > 0 && hasValidCaptcha;
      }

      if (mode === "forgot-password") {
        return emailValid && hasValidCaptcha;
      }

      if (mode === "signup-citizen" || mode === "signup-mp") {
        const passwordValid = password.length >= 8 && passwordHasNumber && passwordHasLetter;
        const fullNameValid = fullName.trim().length > 0;
        const commonValid = emailValid && passwordValid && fullNameValid;

        const geoValid =
          isValidGovernorate(governorate) &&
          isValidDistrictForGovernorate(governorate, district) &&
          !governorateError &&
          !districtError;

        if (mode === "signup-citizen") {
          const nationalIdValid =
            nationalId.length === 14 &&
            validateEgyptianId(nationalId) &&
            nationalIdError === "";
          return commonValid && nationalIdValid && geoValid && hasValidCaptcha;
        }

        const mpGeoValid =
          isValidGovernorate(governorate) &&
          isValidDistrictForGovernorate(governorate, district) &&
          isValidElectoralDistrictForGovernorate(governorate, electoralDistrict, district) &&
          !governorateError &&
          !districtError &&
          !electoralError;

        const membershipValid =
          registrationNumber.length > 0 &&
          MEMBERSHIP_NUMBER_REGEX.test(registrationNumber) &&
          parseInt(registrationNumber, 10) >= 1 &&
          parseInt(registrationNumber, 10) <= MAX_MEMBERSHIP_NUMBER &&
          membershipNumberError === "";

        const displayNameValid = displayName.trim().length > 0;

        return commonValid && mpGeoValid && membershipValid && displayNameValid && hasValidCaptcha;
      }

      return false;
    };

    setIsFormValid(validateForm());
  }, [
    mode,
    email,
    password,
    passwordHasNumber,
    passwordHasLetter,
    fullName,
    displayName,
    governorate,
    district,
    electoralDistrict,
    registrationNumber,
    membershipNumberError,
    nationalId,
    nationalIdError,
    governorateError,
    districtError,
    electoralError,
    hasValidCaptcha,
  ]);

  useEffect(() => {
    if (!mode.includes("signup")) {
      setGovernorateError("");
      setDistrictError("");
      setElectoralError("");
      return;
    }

    if (governorate && !isValidGovernorate(governorate)) {
      setGovernorateError(t("auth.governorate_invalid"));
    } else {
      setGovernorateError("");
    }

    if (district) {
      if (!isValidDistrictForGovernorate(governorate, district)) {
        setDistrictError(t("auth.district_invalid"));
      } else {
        setDistrictError("");
      }
    } else {
      setDistrictError("");
    }

    if (electoralDistrict) {
      if (!isValidElectoralDistrictForGovernorate(governorate, electoralDistrict, district)) {
        setElectoralError(t("auth.electoral_district_invalid"));
      } else {
        setElectoralError("");
      }
    } else {
      setElectoralError("");
    }
  }, [governorate, district, electoralDistrict, mode, t]);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setFullName("");
    setRegistrationNumber("");
    setDisplayName("");
    setGovernorate("");
    setDistrict("");
    setElectoralDistrict("");
    setNationalId("");
    setEmailError("");
    setNationalIdError("");
    setMembershipNumberError("");
    setGovernorateError("");
    setDistrictError("");
    setElectoralError("");
    setIsFormValid(false);
    setShowPassword(false);
    setTurnstileToken(null);
  };

  const switchMode = (nextMode: AuthMode) => {
    resetForm();
    setMode(nextMode);
  };

  const translateError = (msg: string): string => {
    if (isNetworkFailureMessage(msg)) return t("auth.error_network");
    if (msg.includes("Invalid login credentials")) return t("auth.error_credentials");
    if (msg.includes("User already registered")) return t("auth.error_already_registered");
    if (msg.includes("already been registered")) return t("auth.error_already_registered");
    if (msg.includes("Password should be")) return t("auth.password_weak");
    if (msg.includes("Email not confirmed")) return t("auth.error_email_not_confirmed");
    if (msg.includes("Invalid email")) return t("auth.email_invalid");
    if (msg.includes("rate limit") || msg.includes("Too many requests")) return t("auth.error_too_many");
    return msg;
  };

  const getRoleRedirect = async (userId: string): Promise<string> => {
    try {
      const [{ data: roleData, error: roleError }, { data: profileData, error: profileError }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
        supabase.from("profiles").select("is_approved").eq("user_id", userId).maybeSingle(),
      ]);

      if (roleError) {
        throw roleError;
      }

      if (profileError) {
        throw profileError;
      }

      if (roleData?.role === "admin") return "/admin";
      if (roleData?.role === "mp") {
        if (!profileData?.is_approved) {
          return "/mp-pending";
        }
        return "/mp";
      }
      return "/citizen";
    } catch (error) {
      console.error("Failed to resolve role redirect", error);
      return "/citizen";
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      toast.error(t("auth.form_invalid"));
      return;
    }
    if (isCaptchaRequired && !turnstileToken) {
      toast.error(t("support.fill_all_captcha"));
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const signupRole = mode === "signup-mp" ? "mp" : "citizen";

    setLoading(true);
    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (error) throw error;

        analytics.track("login_success");
        if (!data.user) throw new Error(t("auth.error_credentials"));

        const redirect = await getRoleRedirect(data.user.id);
        navigate(redirect);
        return;
      }

      if (mode === "forgot-password") {
        const redirectTo = `${window.location.origin}/reset-password`;
        const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, { redirectTo });
        if (error) throw error;

        toast.success(t("auth.reset_link_sent"));
        switchMode("login");
        return;
      }

      const metadata: Record<string, string> = {
        full_name: fullName,
        role: signupRole,
        governorate,
        district,
        phone: "",
      };

      if (mode === "signup-citizen") {
        metadata.national_id = nationalId;
      }

      if (mode === "signup-mp") {
        metadata.electoral_district = electoralDistrict;
        metadata.membership_number = registrationNumber;
        metadata.display_name = displayName;
      }

      const { error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: metadata,
        },
      });

      if (error) throw error;

      analytics.track("signup_success", { role: signupRole });
      setSignupSuccessful(true);
      toast.success(t("auth.signup_check_email"));
      resetForm();
      setTimeout(() => {
        setSignupSuccessful(false);
        switchMode("login");
      }, 3000);
    } catch (err: unknown) {
      if (mode === "login") {
        analytics.track("login_failure");
      } else if (mode.includes("signup")) {
        analytics.track("signup_failure", { role: signupRole });
      }

      toast.error(translateError((err instanceof Error ? err.message : String(err)) || t("auth.generic_error")));
    } finally {
      setLoading(false);
    }
  };

  const isSignup = mode.includes("signup");
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

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <AppHeader />

      <AnimatePresence>
        {signupSuccessful && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-black/60 z-50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 200, damping: 18 }}
              className="bg-card rounded-3xl p-8 text-center shadow-2xl max-w-sm mx-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 20 }}
                className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground mb-2">{t("auth.signup_success_title")}</h2>
              <p className="text-muted-foreground mb-4">{t("auth.signup_success_body")}</p>
              <p className="text-sm text-muted-foreground">{t("auth.signup_success_redirect")}</p>
              <div className="mt-4 h-1 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 3 }}
                  className="h-full bg-green-600 rounded-full"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-10 right-6 w-32 md:w-48 lg:w-64 select-none" style={{ opacity: isDark ? 0.08 : 0.05 }}>
          <Scale className="w-full h-full text-foreground" strokeWidth={0.75} />
        </div>
        <div className="absolute bottom-8 left-4 w-28 md:w-40 lg:w-52 select-none" style={{ opacity: isDark ? 0.07 : 0.04 }}>
          <ShieldCheck className="w-full h-full text-foreground" strokeWidth={0.75} />
        </div>
        <div className="absolute top-20 left-8 w-16 md:w-24 lg:w-32 select-none" style={{ opacity: isDark ? 0.06 : 0.04 }}>
          <FileText className="w-full h-full text-foreground" strokeWidth={0.75} />
        </div>
        <div className="absolute bottom-12 right-8 w-14 md:w-20 lg:w-28 select-none" style={{ opacity: isDark ? 0.06 : 0.03 }}>
          <Globe className="w-full h-full text-foreground" strokeWidth={0.75} />
        </div>
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full blur-3xl" style={{ background: `radial-gradient(circle, hsl(var(--warning) / ${isDark ? 0.08 : 0.04}), transparent 70%)` }} />
        <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] rounded-full blur-3xl" style={{ background: `radial-gradient(circle, hsl(var(--primary) / ${isDark ? 0.06 : 0.03}), transparent 70%)` }} />
      </div>

      <div className="container py-8 md:py-16 flex justify-center px-4 relative z-10">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-md">
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

          <motion.div layout className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-7 md:p-8">
              <motion.form
                key={mode}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleAuthSubmit}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {t("auth.email")}
                  </label>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder={t("auth.email_placeholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className={cn(emailError && "border-destructive")}
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? "auth-email-error" : undefined}
                  />
                  {emailError && (
                    <p id="auth-email-error" role="alert" className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {emailError}
                    </p>
                  )}
                </div>

                {!isForgot && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      {t("auth.password")}
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder={t("auth.password_placeholder")}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {isSignup && password && (
                      <p className="text-xs text-muted-foreground">
                        {password.length >= 8 && passwordHasNumber && passwordHasLetter ? (
                          <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {t("auth.password_strong")}</span>
                        ) : (
                          <span className="text-amber-600">{t("auth.password_requirements")}</span>
                        )}
                      </p>
                    )}
                  </div>
                )}

                {isForgot && (
                  <p className="text-xs text-muted-foreground">{t("auth.forgot_email_hint")}</p>
                )}

                {isSignup && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {t("auth.full_name")}
                    </label>
                    <Input
                      type="text"
                      placeholder={t("auth.full_name_placeholder")}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value.replace(/^\s+/, ""))}
                      disabled={loading}
                    />
                  </div>
                )}

                {mode === "signup-citizen" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <IdCard className="w-4 h-4" />
                      {t("auth.national_id")}
                    </label>
                    <Input
                      type="text"
                      placeholder={t("auth.national_id_placeholder")}
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value.replace(/\D/g, "").slice(0, 14))}
                      disabled={loading}
                      maxLength={14}
                      className={nationalIdError ? "border-destructive" : ""}
                      aria-invalid={!!nationalIdError}
                      aria-describedby={nationalIdError ? "auth-national-id-error" : undefined}
                    />
                    {nationalIdError && (
                      <p id="auth-national-id-error" role="alert" className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {nationalIdError}
                      </p>
                    )}
                    {nationalId && !nationalIdError && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {t("auth.national_id_valid")}
                      </p>
                    )}
                  </div>
                )}

                {isSignup && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {t("auth.governorate")}
                      </label>
                      <Select
                        value={governorate}
                        onValueChange={(value) => {
                          setGovernorate(value);
                          setDistrict("");
                          setElectoralDistrict("");
                        }}
                        disabled={loading}
                      >
                        <SelectTrigger aria-invalid={!!governorateError} aria-describedby={governorateError ? "auth-governorate-error" : undefined}>
                          <SelectValue placeholder={t("auth.select_governorate")} />
                        </SelectTrigger>
                        <SelectContent>
                          {governorateOptions.map((gov) => (
                            <SelectItem key={gov.value} value={gov.value}>{gov.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {governorateError && (
                        <p id="auth-governorate-error" role="alert" className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {governorateError}
                        </p>
                      )}
                    </div>

                    {governorate && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          {t("auth.district")}
                        </label>
                        <Select
                          value={district}
                          onValueChange={(value) => {
                            setDistrict(value);
                            setElectoralDistrict("");
                          }}
                          disabled={loading || districtOptions.length === 0}
                        >
                          <SelectTrigger aria-invalid={!!districtError} aria-describedby={districtError ? "auth-district-error" : undefined}>
                            <SelectValue placeholder={t("auth.select_district")} />
                          </SelectTrigger>
                          <SelectContent>
                            {districtOptions.map((dist) => (
                              <SelectItem key={dist.value} value={dist.value}>{dist.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {districtError && (
                          <p id="auth-district-error" role="alert" className="text-sm text-destructive flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {districtError}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}

                {mode.includes("signup-mp") && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {t("auth.display_name")}
                      </label>
                      <Input
                        type="text"
                        placeholder={t("auth.display_name_placeholder")}
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value.replace(/^\s+/, ""))}
                        disabled={loading}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Landmark className="w-4 h-4" />
                        {t("auth.electoral_district")}
                      </label>
                      <Select
                        value={electoralDistrict}
                        onValueChange={setElectoralDistrict}
                        disabled={loading || !governorate}
                      >
                        <SelectTrigger aria-invalid={!!electoralError} aria-describedby={electoralError ? "auth-electoral-error" : undefined}>
                          <SelectValue placeholder={t("auth.select_electoral_district")} />
                        </SelectTrigger>
                        <SelectContent>
                          {electoralOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {electoralError && (
                        <p id="auth-electoral-error" role="alert" className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {electoralError}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <IdCard className="w-4 h-4" />
                        {t("auth.registration_number")}
                      </label>
                      <Input
                        type="text"
                        placeholder={t("auth.registration_number_placeholder")}
                        value={registrationNumber}
                        onChange={(e) => setRegistrationNumber(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        disabled={loading}
                        className={membershipNumberError ? "border-destructive" : ""}
                        aria-invalid={!!membershipNumberError}
                        aria-describedby={membershipNumberError ? "auth-membership-number-error" : undefined}
                      />
                      {membershipNumberError && (
                        <p id="auth-membership-number-error" role="alert" className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {membershipNumberError}
                        </p>
                      )}
                    </div>
                  </>
                )}

                <TurnstileCaptcha
                  onVerify={setTurnstileToken}
                  onExpire={() => setTurnstileToken(null)}
                />

                <Button
                  type="submit"
                  disabled={!isFormValid || loading}
                  className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  size="lg"
                >
                  {loading
                    ? t("auth.loading")
                    : mode === "login"
                    ? t("auth.login_button")
                    : mode === "forgot-password"
                    ? t("auth.send_reset_link")
                    : t("auth.create_account")}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>

                <div className="space-y-3 pt-2">
                  {mode === "login" && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          switchMode("forgot-password");
                        }}
                        className="w-full text-sm"
                      >
                        {t("auth.forgot_password")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          switchMode("signup-citizen");
                        }}
                        className="w-full"
                      >
                        {t("auth.signup_citizen")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          switchMode("signup-mp");
                        }}
                        className="w-full"
                      >
                        {t("auth.signup_mp")}
                      </Button>
                    </>
                  )}
                  {(isSignup || isForgot) && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        switchMode("login");
                      }}
                      className="w-full text-sm"
                    >
                      {t("auth.back_to_login")}
                    </Button>
                  )}
                </div>
              </motion.form>
            </div>
          </motion.div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            {t("auth.terms_agreement")}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
