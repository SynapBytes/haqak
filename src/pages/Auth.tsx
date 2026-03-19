import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, ShieldCheck, LogIn, ArrowRight, Eye, EyeOff, Lock, Mail, Phone, IdCard } from "lucide-react";

type AuthMode = "login" | "signup-citizen" | "signup-mp";

const Auth = () => {
  const navigate = useNavigate();
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("تم تسجيل الدخول بنجاح");
      navigate("/citizen");
    } catch (err: any) {
      toast.error(err.message || "خطأ في تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل"); return; }
    if (!/\d/.test(password) || !/[a-zA-Z\u0600-\u06FF]/.test(password)) {
      toast.error("كلمة المرور يجب أن تحتوي على أحرف وأرقام"); return;
    }
    if (!/^01[0-9]{9}$/.test(phone)) { toast.error("رقم التليفون غير صحيح (يجب أن يبدأ بـ 01 ويكون 11 رقم)"); return; }
    setLoading(true);
    try {
      const role = mode === "signup-mp" ? "mp" : "citizen";
      const metadata: Record<string, string> = { full_name: fullName, phone, role };
      if (mode === "signup-mp" && registrationNumber) metadata.registration_number = registrationNumber;

      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: metadata, emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      toast.success("تم إنشاء الحساب! تحقق من بريدك الإلكتروني لتأكيد الحساب");
      setMode("login"); resetForm();
    } catch (err: any) {
      toast.error(err.message || "خطأ في إنشاء الحساب");
    } finally {
      setLoading(false);
    }
  };

  const isSignup = mode !== "login";

  const modeConfig = {
    login: { title: "تسجيل الدخول", subtitle: "سجّل دخولك للوصول إلى حسابك", icon: LogIn },
    "signup-citizen": { title: "حساب مواطن جديد", subtitle: "سجّل حسابك لتقديم المشاكل ومتابعتها", icon: User },
    "signup-mp": { title: "حساب نائب جديد", subtitle: "سجّل حسابك كنائب لاستقبال ومعالجة المشاكل", icon: ShieldCheck },
  };

  const { title, subtitle, icon: ModeIcon } = modeConfig[mode];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container py-8 md:py-12 flex justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          {/* Header */}
          <div className="mb-6 text-center">
            <motion.div
              key={mode}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4"
            >
              <ModeIcon className="w-8 h-8 text-accent" />
            </motion.div>
            <h1 className="text-2xl font-bold text-foreground mb-1">{title}</h1>
            <p className="text-muted-foreground text-sm">{subtitle}</p>
          </div>

          <Card className="border-border shadow-sm">
            <CardContent className="pt-6 pb-6">
              <AnimatePresence mode="wait">
                <motion.form
                  key={mode}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={isSignup ? handleSignup : handleLogin}
                  className="space-y-4"
                >
                  {isSignup && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">الاسم الرباعي</label>
                        <div className="relative">
                          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="أحمد محمد علي حسن" required className="text-right pr-10" />
                          <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">رقم التليفون</label>
                        <div className="relative">
                          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01xxxxxxxxx" type="tel" required dir="ltr" className="pl-10 text-left" maxLength={11} />
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                      {mode === "signup-mp" && (
                        <div>
                          <label className="text-sm font-medium text-foreground mb-1.5 block">رقم القيد البرلماني</label>
                          <div className="relative">
                            <Input value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} placeholder="أدخل رقم القيد" required className="text-right pr-10" />
                            <IdCard className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">البريد الإلكتروني</label>
                    <div className="relative">
                      <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" type="email" required dir="ltr" className="pl-10 text-left" />
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">كلمة المرور</label>
                    <div className="relative">
                      <Input value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? "text" : "password"} placeholder="••••••••" required minLength={8} dir="ltr" className="px-10 text-left" />
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {isSignup && (
                      <div className="mt-2 space-y-1">
                        <div className={`text-xs flex items-center gap-1 ${password.length >= 8 ? "text-primary" : "text-muted-foreground"}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" /> 8 أحرف على الأقل
                        </div>
                        <div className={`text-xs flex items-center gap-1 ${/\d/.test(password) && /[a-zA-Z\u0600-\u06FF]/.test(password) ? "text-primary" : "text-muted-foreground"}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" /> أحرف وأرقام معاً
                        </div>
                      </div>
                    )}
                  </div>

                  {mode === "signup-mp" && (
                    <div className="p-3 rounded-xl bg-warning/10 border border-warning/20">
                      <p className="text-xs text-warning flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 shrink-0" />
                        حساب النائب يحتاج موافقة الإدارة قبل التفعيل
                      </p>
                    </div>
                  )}

                  <Button type="submit" disabled={loading} className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90 h-11 text-base">
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                    ) : isSignup ? "إنشاء الحساب" : (
                      <><LogIn className="w-4 h-4" /> تسجيل الدخول</>
                    )}
                  </Button>
                </motion.form>
              </AnimatePresence>

              <div className="mt-6 pt-4 border-t border-border">
                {mode === "login" ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground text-center">ليس لديك حساب؟</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline" onClick={() => { setMode("signup-citizen"); resetForm(); }} className="gap-2 h-11">
                        <User className="w-4 h-4" /> حساب مواطن
                      </Button>
                      <Button variant="outline" onClick={() => { setMode("signup-mp"); resetForm(); }} className="gap-2 h-11">
                        <ShieldCheck className="w-4 h-4" /> حساب نائب
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="ghost" className="w-full gap-2" onClick={() => { setMode("login"); resetForm(); }}>
                    <ArrowRight className="w-4 h-4" /> لديك حساب؟ سجّل دخولك
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
