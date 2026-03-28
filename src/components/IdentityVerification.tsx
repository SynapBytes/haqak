import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, UserCheck, Loader2, Camera, Fingerprint } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const IdentityVerification = ({ onVerified }: { onVerified: () => void }) => {
  const [nationalId, setNationalId] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [step, setStep] = useState<"input" | "scan" | "success">("input");

  const handleVerify = async () => {
    if (nationalId.length !== 14) {
      toast.error("يرجى إدخال رقم قومي صحيح مكون من 14 رقم");
      return;
    }

    setVerifying(true);
    // Simulate OCR and National Database check
    setTimeout(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("profiles").update({
            is_verified: true,
            national_id_hash: btoa(nationalId), // Simulated hash
            verification_date: new Date().toISOString()
          }).eq("user_id", user.id);
        }
        setStep("success");
        toast.success("تم التحقق من هويتك بنجاح");
        setTimeout(onVerified, 2000);
      } catch (err) {
        toast.error("حدث خطأ أثناء التحقق");
      } finally {
        setVerifying(false);
      }
    }, 2000);
  };

  return (
    <Card className="border-accent/20 bg-card/50 backdrop-blur-md overflow-hidden">
      <CardHeader className="bg-accent/5 border-b border-accent/10">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <ShieldCheck className="w-5 h-5 text-accent" />
          نظام التحقق من الهوية السيادي
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {step === "input" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              لضمان جدية الشكاوى ومنع الحسابات الوهمية، يتطلب النظام التحقق من الرقم القومي لمرة واحدة فقط.
            </p>
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground px-1">الرقم القومي (14 رقم)</label>
              <Input 
                type="text" 
                maxLength={14} 
                placeholder="29001010100000" 
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ""))}
                className="h-12 text-center tracking-widest text-lg font-mono"
              />
            </div>
            <Button 
              onClick={() => setStep("scan")} 
              variant="outline" 
              className="w-full h-12 gap-2 border-accent/20"
            >
              <Camera className="w-4 h-4" />
              مسح بطاقة الرقم القومي (OCR)
            </Button>
            <Button 
              onClick={handleVerify} 
              disabled={verifying || nationalId.length !== 14} 
              className="w-full h-12 bg-accent hover:bg-accent/90"
            >
              {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4 mr-2" />}
              بدء التحقق الرقمي
            </Button>
          </div>
        )}

        {step === "scan" && (
          <div className="space-y-4 text-center">
            <div className="aspect-video bg-muted rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-accent/30 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-accent/10 via-transparent to-accent/10 animate-pulse"></div>
              <Camera className="w-12 h-12 text-accent mb-2" />
              <p className="text-sm font-medium">ضع البطاقة داخل الإطار</p>
            </div>
            <p className="text-xs text-muted-foreground">سيتم معالجة الصورة آلياً لاستخراج البيانات دون تخزين الصورة الأصلية حفاظاً على الخصوصية.</p>
            <Button onClick={() => setStep("input")} variant="ghost" className="w-full">إلغاء والعودة</Button>
          </div>
        )}

        {step === "success" && (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto">
              <UserCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">تم التحقق بنجاح</h3>
              <p className="text-sm text-muted-foreground">حسابك الآن موثق وله حجية قانونية في تقديم الشكاوى.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default IdentityVerification;
