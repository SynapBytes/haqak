import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock, Eye, EyeOff, CheckCircle2, ArrowRight } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("تم تغيير كلمة المرور بنجاح!");
      navigate("/auth");
    } catch (err: any) {
      toast.error(err.message || "خطأ في تغيير كلمة المرور");
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container py-16 flex justify-center px-4">
          <div className="text-center">
            <p className="text-muted-foreground">رابط غير صالح أو منتهي الصلاحية</p>
            <Button variant="ghost" className="mt-4 gap-2" onClick={() => navigate("/auth")}>
              <ArrowRight className="w-4 h-4" /> العودة لتسجيل الدخول
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <AppHeader />
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 8, repeat: Infinity }} className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-accent/[0.05] blur-3xl" />
      </div>

      <div className="container py-8 md:py-16 flex justify-center px-4 relative z-10">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-accent to-info flex items-center justify-center mx-auto mb-5 shadow-xl">
              <Lock className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">تعيين كلمة مرور جديدة</h1>
            <p className="text-muted-foreground text-sm">أدخل كلمة المرور الجديدة</p>
          </div>

          <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl shadow-2xl p-7 md:p-8">
            <form onSubmit={handleReset} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground block">كلمة المرور الجديدة</label>
                <div className="relative">
                  <Input value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? "text" : "password"} placeholder="••••••••" required minLength={8} dir="ltr" className="px-11 text-left h-12 rounded-xl border-border/50 bg-background/50" />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-muted flex items-center justify-center">
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground block">تأكيد كلمة المرور</label>
                <div className="relative">
                  <Input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type={showPassword ? "text" : "password"} placeholder="••••••••" required minLength={8} dir="ltr" className="px-11 text-left h-12 rounded-xl border-border/50 bg-background/50" />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-muted flex items-center justify-center">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${password && confirmPassword && password === confirmPassword ? "text-success" : "text-muted-foreground"}`} />
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full gap-2.5 bg-gradient-to-l from-accent to-info text-white hover:opacity-90 h-13 text-base font-semibold rounded-xl shadow-lg" style={{ height: '52px' }}>
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "تغيير كلمة المرور"}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ResetPassword;
