import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, ShieldCheck, LogIn, ArrowRight, Eye, EyeOff, Lock, Phone, IdCard, Fingerprint, KeyRound, MapPin, Building2, Landmark, AlertCircle, CheckCircle2, Clock, Globe } from "lucide-react";
import { 
  getDistrictOptions, 
  getElectoralDistrictOptions, 
  getGovernorateOptions, 
  isValidDistrictForGovernorate, 
  isValidElectoralDistrictForGovernorate, 
  isValidGovernorate 
} from "@/utils/egyptianElectoralData";
import countryCodes from "@/data/countryCodes.json";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import ornament2 from "@/assets/egyptian-ornament-2.webp";
import egyptianAnkh from "@/assets/egyptian-ankh.webp";
import egyptianNefertiti from "@/assets/egyptian-nefertiti.webp";
import ornament1 from "@/assets/egyptian-ornament-1.webp";
import { validateEgyptianId, extractEgyptianIdInfo } from "@/lib/egyptianIdValidation";

type AuthMode = "login" | "login-otp" | "signup-citizen" | "signup-citizen-otp" | "signup-mp" | "signup-mp-otp" | "forgot-password" | "forgot-password-otp";

const Auth = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [canResendOtp, setCanResendOtp] = useState(false);

  // Form states
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("EG");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [district, setDistrict] = useState("");
  const [electoralDistrict, setElectoralDistrict] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [nationalIdError, setNationalIdError] = useState("");
  const [userLocation, setUserLocation] = useState<{ country: string; countryCode: string } | null>(null);

  // Validation states
  const [phoneError, setPhoneError] = useState("");
  const [membershipNumberError, setMembershipNumberError] = useState("");
  const [governorateError, setGovernorateError] = useState("");
  const [districtError, setDistrictError] = useState("");
  const [electoralError, setElectoralError] = useState("");
  const [isFormValid, setIsFormValid] = useState(false);

  // Get user's location on component mount
  useEffect(() => {
    const detectLocation = async () => {
      try {
        const response = await fetch("https://ipapi.co/json/");
        const data = await response.json();
        if (data.country_code) {
          setUserLocation({
            country: data.country_name || "",
            countryCode: data.country_code,
          });
          setCountryCode(data.country_code);
        }
      } catch (err) {
        console.error("Failed to detect location:", err);
        setCountryCode("EG");
      }
    };
    detectLocation();
  }, []);

  const phoneRegex = /^01[0125][0-9]{8}$/;
  const membershipNumberRegex = /^[0-9]+$/;
  const MAX_MEMBERSHIP_NUMBER = 568;
  const governorateOptions = useMemo(() => getGovernorateOptions(), []);
  const districtOptions = useMemo(() => getDistrictOptions(governorate), [governorate]);
  const electoralOptions = useMemo(
    () => getElectoralDistrictOptions(governorate, district),
    [governorate, district],
  );

  // OTP Timer effect
  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (otpTimer === 0 && (mode.includes("otp"))) {
      setCanResendOtp(true);
    }
  }, [otpTimer, mode]);

  useEffect(() => {
    if (phone && !phoneRegex.test(phone)) {
      setPhoneError(t("auth.phone_invalid"));
    } else {
      setPhoneError("");
    }
  }, [phone, t]);

  useEffect(() => {
    if (nationalId && mode.includes("signup-citizen")) {
      if (!validateEgyptianId(nationalId)) {
        setNationalIdError(t("auth.national_id_invalid"));
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
      if (!membershipNumberRegex.test(registrationNumber)) {
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
      if (mode === "login") {
        return phoneRegex.test(phone) && password.length > 0;
      }
      if (mode === "forgot-password") {
        return phoneRegex.test(phone);
      }
      if (mode === "signup-citizen" || mode === "signup-mp") {
        const commonValid = phoneRegex.test(phone) && 
                           password.length >= 8 && 
                           /\d/.test(password) && 
                           /[a-zA-Z\u0600-\u06FF]/.test(password) &&
                           fullName.length > 0;
        
        if (mode === "signup-citizen") {
          const nationalIdValid = nationalId.length === 14 && 
                                 validateEgyptianId(nationalId) && 
                                 nationalIdError === "";
          return commonValid && nationalIdValid;
        }
        
        if (mode === "signup-mp") {
          const membershipValid = registrationNumber.length > 0 && 
                                 membershipNumberRegex.test(registrationNumber) &&
                                 parseInt(registrationNumber, 10) >= 1 &&
                                 parseInt(registrationNumber, 10) <= MAX_MEMBERSHIP_NUMBER &&
                                 membershipNumberError === "";
          const geoValid =
            isValidGovernorate(governorate) &&
            isValidDistrictForGovernorate(governorate, district) &&
            isValidElectoralDistrictForGovernorate(governorate, electoralDistrict, district) &&
            !governorateError &&
            !districtError &&
            !electoralError;
          return commonValid && geoValid && membershipValid;
        }
        return commonValid;
      }
      return false;
    };
    setIsFormValid(validateForm());
  }, [mode, phone, password, fullName, governorate, district, electoralDistrict, registrationNumber, membershipNumberError, nationalId, nationalIdError, governorateError, districtError, electoralError]);

  useEffect(() => {
    if (!mode.includes("signup-mp")) {
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
    setPhone("");
    setCountryCode("EG");
    setPassword("");
    setFullName("");
    setRegistrationNumber("");
    setDisplayName("");
    setGovernorate("");
    setDistrict("");
    setElectoralDistrict("");
    setNationalId("");
    setPhoneError("");
    setNationalIdError("");
    setGovernorateError("");
    setDistrictError("");
    setElectoralError("");
    setOtpCode("");
    setOtpTimer(0);
    setCanResendOtp(false);
  };

  const translateError = (msg: string): string => {
    if (msg.includes("Invalid login credentials")) return t("auth.error_credentials");
    if (msg.includes("Phone not confirmed")) return t("auth.error_phone_not_confirmed");
    if (msg.includes("User already registered")) return t("auth.error_already_registered");
    if (msg.includes("Password should be")) return t("auth.password_weak");
    if (msg.includes("OTP invalid")) return t("auth.error_otp_invalid");
    if (msg.includes("OTP expired")) return t("auth.error_otp_expired");
    if (msg.includes("rate limit")) return t("auth.error_rate_limit");
    if (msg.includes("Too many requests")) return t("auth.error_too_many");
    return msg;
  };

  const getRoleRedirect = async (userId: string): Promise<string> => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).single();
    if (data?.role === "admin") return "/admin";
    if (data?.role === "mp") {
      // Check if MP is approved
      const { data: profile } = await supabase.from("profiles").select("is_approved").eq("user_id", userId).single();
      if (!profile?.is_approved) {
        return "/mp-pending";
      }
      return "/mp";
    }
    return "/citizen";
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneRegex.test(phone)) {
      setPhoneError(t("auth.phone_invalid"));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/.netlify/functions/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, countryCode, mode: mode.replace("-otp", "") }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to send OTP");

      toast.success(t("auth.otp_sent"));
      setOtpTimer(300); // 5 minutes
      setCanResendOtp(false);
      
      // Move to OTP verification mode
      if (mode === "login") setMode("login-otp");
      else if (mode === "signup-citizen") setMode("signup-citizen-otp");
      else if (mode === "signup-mp") setMode("signup-mp-otp");
      else if (mode === "forgot-password") setMode("forgot-password-otp");
    } catch (err: any) {
      toast.error(translateError(err.message || t("auth.otp_send_error")));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      toast.error(t("auth.otp_invalid_length"));
      return;
    }

    setOtpLoading(true);
    try {
      const response = await fetch("/.netlify/functions/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          phone, 
          countryCode,
          otp: otpCode, 
          mode: mode.replace("-otp", ""),
          ...(mode.includes("signup") && { fullName, password, governorate, district, electoralDistrict, registrationNumber, displayName, nationalId })
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to verify OTP");

      toast.success(t("auth.otp_verified"));
      
      if (mode === "login-otp") {
        // Perform login
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: password,
        });
        if (error) throw error;
        const redirect = await getRoleRedirect(data.userId);
        navigate(redirect);
      } else if (mode.includes("signup")) {
        // Perform signup
        const { error } = await supabase.auth.signUp({
          email: data.email,
          password: password,
          options: {
            data: {
              full_name: fullName,
              phone,
              countryCode,
              role: mode.includes("mp") ? "mp" : "citizen",
              ...(mode.includes("citizen") && {
                national_id: nationalId,
              }),
              ...(mode.includes("mp") && {
                display_name: displayName,
                governorate,
                district,
                electoral_district: electoralDistrict,
                registration_number: registrationNumber,
              }),
            },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success(t("auth.signup_success"));
        resetForm();
        setMode("login");
      } else if (mode === "forgot-password-otp") {
        // Reset password
        const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success(t("auth.forgot_success"));
        resetForm();
        setMode("login");
      }
    } catch (err: any) {
      toast.error(translateError(err.message || t("auth.otp_verify_error")));
    } finally {
      setOtpLoading(false);
    }
  };

  const isSignup = mode.includes("signup");
  const isForgot = mode.includes("forgot-password");
  const isOtpMode = mode.includes("otp");

  const modeConfig = {
    login: { title: t("auth.login_title"), subtitle: t("auth.login_subtitle"), icon: LogIn, gradient: "from-accent to-info" },
    "login-otp": { title: t("auth.verify_otp"), subtitle: t("auth.verify_otp_subtitle"), icon: Fingerprint, gradient: "from-accent to-info" },
    "signup-citizen": { title: t("auth.signup_citizen_title"), subtitle: t("auth.signup_citizen_subtitle"), icon: User, gradient: "from-primary to-accent" },
    "signup-citizen-otp": { title: t("auth.verify_otp"), subtitle: t("auth.verify_otp_subtitle"), icon: Fingerprint, gradient: "from-primary to-accent" },
    "signup-mp": { title: t("auth.signup_mp_title"), subtitle: t("auth.signup_mp_subtitle"), icon: ShieldCheck, gradient: "from-warning to-accent" },
    "signup-mp-otp": { title: t("auth.verify_otp"), subtitle: t("auth.verify_otp_subtitle"), icon: Fingerprint, gradient: "from-warning to-accent" },
    "forgot-password": { title: t("auth.forgot_title"), subtitle: t("auth.forgot_subtitle"), icon: KeyRound, gradient: "from-accent to-primary" },
    "forgot-password-otp": { title: t("auth.verify_otp"), subtitle: t("auth.verify_otp_subtitle"), icon: Fingerprint, gradient: "from-accent to-primary" },
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
                {isOtpMode ? (
                  <motion.form
                    key={mode}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    onSubmit={handleVerifyOtp}
                    className="space-y-5"
                  >
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">{t("auth.otp_code")}</label>
                      <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} disabled={otpLoading} />
                      <p className="text-xs text-muted-foreground">{t("auth.otp_sent_to")} {phone}</p>
                    </div>

                    {otpTimer > 0 && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {t("auth.otp_expires_in")} {Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, "0")}
                        </span>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={otpCode.length !== 6 || otpLoading}
                      className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                      size="lg"
                    >
                      {otpLoading ? t("auth.verifying") : t("auth.verify_otp")}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      disabled={!canResendOtp || loading}
                      onClick={handleSendOtp}
                      className="w-full"
                    >
                      {canResendOtp ? t("auth.resend_otp") : t("auth.resend_otp_wait")}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setMode(mode.replace("-otp", "") as AuthMode);
                        setOtpCode("");
                        setOtpTimer(0);
                      }}
                      className="w-full"
                    >
                      {t("auth.back")}
                    </Button>
                  </motion.form>
                ) : (
                  <motion.form
                    key={mode}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    onSubmit={handleSendOtp}
                    className="space-y-5"
                  >
                    {/* Country Code and Phone Field */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {t("auth.phone")}
                      </label>
                      <div className="flex gap-2">
                        <Select value={countryCode} onValueChange={setCountryCode} disabled={loading}>
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {countryCodes.countries
                              .sort((a, b) => a.priority - b.priority)
                              .map((country) => (
                                <SelectItem key={country.code} value={country.code}>
                                  {country.flag} +{country.dialCode.replace("+", "")}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="tel"
                          placeholder="01012345678"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          disabled={loading}
                          className={`flex-1 ${phoneError ? "border-destructive" : ""}`}
                        />
                      </div>
                      {phoneError && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {phoneError}</p>}
                    </div>

                    {/* Password Field (for login and signup) */}
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
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {mode.includes("signup") && password && (
                          <p className="text-xs text-muted-foreground">
                            {password.length >= 8 && /\d/.test(password) && /[a-zA-Z\u0600-\u06FF]/.test(password) ? (
                              <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {t("auth.password_strong")}</span>
                            ) : (
                              <span className="text-amber-600">{t("auth.password_requirements")}</span>
                            )}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Full Name (for signup) */}
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
                          onChange={(e) => setFullName(e.target.value)}
                          disabled={loading}
                        />
                      </div>
                    )}

                    {/* National ID (for citizen signup) */}
                    {mode === "signup-citizen" && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground flex items-center gap-2">
                          <IdCard className="w-4 h-4" />
                          {t("auth.national_id")}
                        </label>
                        <Input
                          type="text"
                          placeholder="14 رقم من الرقم القومي"
                          value={nationalId}
                          onChange={(e) => setNationalId(e.target.value.replace(/\D/g, "").slice(0, 14))}
                          disabled={loading}
                          maxLength={14}
                          className={nationalIdError ? "border-destructive" : ""}
                        />
                        {nationalIdError && (
                          <p className="text-xs text-destructive flex items-center gap-1">
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

                    {/* MP-specific fields */}
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
                            onChange={(e) => setDisplayName(e.target.value)}
                            disabled={loading}
                          />
                        </div>

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
                            <SelectTrigger>
                              <SelectValue placeholder={t("auth.select_governorate")} />
                            </SelectTrigger>
                            <SelectContent>
                              {governorateOptions.map((gov) => (
                                <SelectItem key={gov.value} value={gov.value}>{gov.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {governorateError && (
                            <p className="text-sm text-destructive flex items-center gap-1">
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
                              <SelectTrigger>
                                <SelectValue placeholder={t("auth.select_district")} />
                              </SelectTrigger>
                              <SelectContent>
                                {districtOptions.map((dist) => (
                                  <SelectItem key={dist.value} value={dist.value}>{dist.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {districtError && (
                              <p className="text-sm text-destructive flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                {districtError}
                              </p>
                            )}
                          </div>
                        )}

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
                            <SelectTrigger>
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
                            <p className="text-sm text-destructive flex items-center gap-1">
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
                            onChange={(e) => setRegistrationNumber(e.target.value)}
                            disabled={loading}
                            className={membershipNumberError ? "border-destructive" : ""}
                          />
                          {membershipNumberError && (
                            <p className="text-sm text-destructive flex items-center gap-1">
                              <AlertCircle className="w-4 h-4" />
                              {membershipNumberError}
                            </p>
                          )}
                        </div>
                      </>
                    )}

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={!isFormValid || loading}
                      className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                      size="lg"
                    >
                      {loading ? t("auth.loading") : mode === "login" ? t("auth.send_otp") : mode === "forgot-password" ? t("auth.send_otp") : t("auth.send_otp")}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>

                    {/* Mode Switcher */}
                    <div className="space-y-3 pt-2">
                      {mode === "login" && (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setMode("forgot-password");
                              resetForm();
                            }}
                            className="w-full text-sm"
                          >
                            {t("auth.forgot_password")}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setMode("signup-citizen");
                              resetForm();
                            }}
                            className="w-full"
                          >
                            {t("auth.signup_citizen")}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setMode("signup-mp");
                              resetForm();
                            }}
                            className="w-full"
                          >
                            {t("auth.signup_mp")}
                          </Button>
                        </>
                      )}
                      {isSignup && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setMode("login");
                            resetForm();
                          }}
                          className="w-full text-sm"
                        >
                          {t("auth.back_to_login")}
                        </Button>
                      )}
                      {isForgot && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setMode("login");
                            resetForm();
                          }}
                          className="w-full text-sm"
                        >
                          {t("auth.back_to_login")}
                        </Button>
                      )}
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Footer Info */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            {t("auth.terms_agreement")}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
