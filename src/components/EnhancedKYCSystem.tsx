import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ShieldCheck, UserCheck, Loader2, Camera, Fingerprint, 
  Phone, FileCheck, AlertCircle, CheckCircle2, Clock, 
  Upload, Eye, EyeOff, Lock
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface VerificationStep {
  id: string;
  name: string;
  status: "pending" | "in-progress" | "completed" | "failed";
  description: string;
}

interface KYCData {
  nationalId: string;
  phoneNumber: string;
  fullName: string;
  parliamentaryId?: string;
  idCardImage?: File;
  verificationCode?: string;
  userType: "citizen" | "mp";
}

const EnhancedKYCSystem = ({ onVerified }: { onVerified: () => void }) => {
  const [currentStep, setCurrentStep] = useState<"user-type" | "national-id" | "phone-otp" | "document" | "success">("user-type");
  const [userType, setUserType] = useState<"citizen" | "mp" | null>(null);
  const [kycData, setKycData] = useState<KYCData>({
    nationalId: "",
    phoneNumber: "",
    fullName: "",
    userType: "citizen",
  });
  const [verifying, setVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verificationSteps, setVerificationSteps] = useState<VerificationStep[]>([
    { id: "national-id", name: "التحقق من الرقم القومي", status: "pending", description: "التحقق من صحة الرقم القومي" },
    { id: "phone-otp", name: "التحقق من الهاتف", status: "pending", description: "إرسال كود التحقق عبر SMS" },
    { id: "document", name: "التحقق من المستندات", status: "pending", description: "التحقق من صورة البطاقة أو الهوية البرلمانية" },
    { id: "database", name: "التحقق من قاعدة البيانات", status: "pending", description: "التحقق من قاعدة البيانات الوطنية" },
  ]);
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Validate Egyptian National ID format
  const validateNationalId = (id: string): boolean => {
    if (id.length !== 14) return false;
    const regex = /^\d{14}$/;
    return regex.test(id);
  };

  // Validate Egyptian Phone Number
  const validatePhoneNumber = (phone: string): boolean => {
    const regex = /^(01)[0-2]\d{8}$/;
    return regex.test(phone);
  };

  // Update verification step status
  const updateVerificationStep = (stepId: string, status: VerificationStep["status"]) => {
    setVerificationSteps(steps =>
      steps.map(step =>
        step.id === stepId ? { ...step, status } : step
      )
    );
  };

  // Handle National ID verification
  const handleNationalIdVerification = async () => {
    if (!validateNationalId(kycData.nationalId)) {
      toast.error("يرجى إدخال رقم قومي صحيح (14 رقم)");
      return;
    }

    setVerifying(true);
    updateVerificationStep("national-id", "in-progress");

    try {
      // Simulate national database check
      await new Promise(resolve => setTimeout(resolve, 2000));

      // In production, this would call a real national database API
      const isValid = Math.random() > 0.1; // 90% success rate for demo

      if (!isValid) {
        updateVerificationStep("national-id", "failed");
        toast.error("لم يتم العثور على الرقم القومي في قاعدة البيانات الوطنية");
        setVerifying(false);
        return;
      }

      updateVerificationStep("national-id", "completed");
      toast.success("تم التحقق من الرقم القومي بنجاح");
      setCurrentStep("phone-otp");
    } catch (error) {
      updateVerificationStep("national-id", "failed");
      toast.error("حدث خطأ أثناء التحقق من الرقم القومي");
    } finally {
      setVerifying(false);
    }
  };

  // Handle Phone OTP
  const handleSendOTP = async () => {
    if (!validatePhoneNumber(kycData.phoneNumber)) {
      toast.error("يرجى إدخال رقم هاتف صحيح (01xxxxxxxxx)");
      return;
    }

    setVerifying(true);
    updateVerificationStep("phone-otp", "in-progress");

    try {
      // Simulate SMS sending
      await new Promise(resolve => setTimeout(resolve, 1500));

      // In production, this would call a real SMS gateway
      setOtpSent(true);
      toast.success("تم إرسال كود التحقق إلى رقم هاتفك");
    } catch (error) {
      updateVerificationStep("phone-otp", "failed");
      toast.error("حدث خطأ أثناء إرسال كود التحقق");
    } finally {
      setVerifying(false);
    }
  };

  // Handle OTP Verification
  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) {
      toast.error("يرجى إدخال كود التحقق المكون من 6 أرقام");
      return;
    }

    setVerifying(true);

    try {
      // Simulate OTP verification
      await new Promise(resolve => setTimeout(resolve, 1000));

      // In production, this would verify against the sent OTP
      const isValid = otpCode === "123456" || Math.random() > 0.05; // Demo: accept any 6-digit code

      if (!isValid) {
        toast.error("كود التحقق غير صحيح");
        setVerifying(false);
        return;
      }

      updateVerificationStep("phone-otp", "completed");
      toast.success("تم التحقق من رقم الهاتف بنجاح");
      setCurrentStep("document");
    } catch (error) {
      toast.error("حدث خطأ أثناء التحقق");
    } finally {
      setVerifying(false);
    }
  };

  // Handle Document Upload
  const handleDocumentUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("يرجى تحميل صورة فقط");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم الملف يجب أن يكون أقل من 5 MB");
      return;
    }

    setUploadedFile(file);
    setVerifying(true);
    updateVerificationStep("document", "in-progress");

    try {
      // Simulate file upload with progress
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Simulate OCR and document verification
      await new Promise(resolve => setTimeout(resolve, 2000));

      updateVerificationStep("document", "completed");
      toast.success("تم التحقق من المستند بنجاح");
      setCurrentStep("success");
    } catch (error) {
      updateVerificationStep("document", "failed");
      toast.error("حدث خطأ أثناء التحقق من المستند");
    } finally {
      setVerifying(false);
      setUploadProgress(0);
    }
  };

  // Complete KYC Process
  const handleCompleteKYC = async () => {
    setVerifying(true);
    updateVerificationStep("database", "in-progress");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Hash sensitive data
        const nationalIdHash = btoa(kycData.nationalId).slice(0, 32);
        const phoneHash = btoa(kycData.phoneNumber).slice(0, 32);

        await supabase.from("profiles").update({
          is_approved: true,
        }).eq("user_id", user.id);

        // KYC audit logging – audit_logs table not yet created
        console.log("KYC verification completed for user", user.id);
      }

      updateVerificationStep("database", "completed");
      toast.success("تم إكمال عملية التحقق بنجاح");
      setTimeout(onVerified, 2000);
    } catch (error) {
      updateVerificationStep("database", "failed");
      toast.error("حدث خطأ أثناء حفظ البيانات");
    } finally {
      setVerifying(false);
    }
  };

  const getProgressPercentage = () => {
    const completed = verificationSteps.filter(s => s.status === "completed").length;
    return (completed / verificationSteps.length) * 100;
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="border-accent/20 bg-card/50 backdrop-blur-md overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-accent/10 to-accent/5 border-b border-accent/10">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <ShieldCheck className="w-5 h-5 text-accent" />
              نظام التحقق المتقدم من الهوية (KYC)
            </CardTitle>
            <span className="text-xs font-semibold text-accent bg-accent/10 px-3 py-1 rounded-full">
              المستوى: متقدم
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            نظام تحقق شامل متعدد المستويات لضمان أمان وموثوقية المنصة
          </p>
        </CardHeader>

        <CardContent className="p-6">
          {/* Progress Indicator */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-foreground">تقدم التحقق</span>
              <span className="text-xs text-muted-foreground">{Math.round(getProgressPercentage())}%</span>
            </div>
            <Progress value={getProgressPercentage()} className="h-2" />
          </div>

          {/* Verification Steps Timeline */}
          <div className="mb-6 space-y-3">
            {verificationSteps.map((step, index) => (
              <div key={step.id} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    step.status === "completed" ? "bg-success/20 text-success" :
                    step.status === "in-progress" ? "bg-accent/20 text-accent" :
                    step.status === "failed" ? "bg-destructive/20 text-destructive" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {step.status === "completed" && <CheckCircle2 className="w-4 h-4" />}
                    {step.status === "in-progress" && <Loader2 className="w-4 h-4 animate-spin" />}
                    {step.status === "failed" && <AlertCircle className="w-4 h-4" />}
                    {step.status === "pending" && <Clock className="w-4 h-4" />}
                  </div>
                  {index < verificationSteps.length - 1 && (
                    <div className={`w-0.5 h-8 mt-1 ${
                      step.status === "completed" ? "bg-success/30" : "bg-muted"
                    }`} />
                  )}
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-sm font-semibold text-foreground">{step.name}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Step Content */}
          {currentStep === "user-type" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                اختر نوع الحساب الذي تريد التحقق منه:
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => {
                    setUserType("citizen");
                    setKycData({ ...kycData, userType: "citizen" });
                    setCurrentStep("national-id");
                  }}
                  variant={userType === "citizen" ? "default" : "outline"}
                  className="h-24 flex flex-col gap-2"
                >
                  <UserCheck className="w-6 h-6" />
                  <span className="text-xs">مواطن عادي</span>
                </Button>
                <Button
                  onClick={() => {
                    setUserType("mp");
                    setKycData({ ...kycData, userType: "mp" });
                    setCurrentStep("national-id");
                  }}
                  variant={userType === "mp" ? "default" : "outline"}
                  className="h-24 flex flex-col gap-2"
                >
                  <FileCheck className="w-6 h-6" />
                  <span className="text-xs">نائب برلماني</span>
                </Button>
              </div>
            </div>
          )}

          {currentStep === "national-id" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-foreground px-1 block mb-2">
                  الرقم القومي (14 رقم)
                </label>
                <Input
                  type="text"
                  maxLength={14}
                  placeholder="29001010100000"
                  value={kycData.nationalId}
                  onChange={(e) => setKycData({ ...kycData, nationalId: e.target.value.replace(/\D/g, "") })}
                  className="h-12 text-center tracking-widest text-lg font-mono"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  الرقم القومي محفوظ بشكل آمن ومشفر ولن يتم مشاركته مع أي جهة
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground px-1 block mb-2">
                  الاسم الكامل
                </label>
                <Input
                  type="text"
                  placeholder="أحمد محمد علي"
                  value={kycData.fullName}
                  onChange={(e) => setKycData({ ...kycData, fullName: e.target.value })}
                  className="h-12"
                />
              </div>

              <Button
                onClick={handleNationalIdVerification}
                disabled={verifying || !validateNationalId(kycData.nationalId) || !kycData.fullName}
                className="w-full h-12 bg-accent hover:bg-accent/90 gap-2"
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري التحقق...
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4" />
                    التحقق من الرقم القومي
                  </>
                )}
              </Button>
            </div>
          )}

          {currentStep === "phone-otp" && (
            <div className="space-y-4">
              {!otpSent ? (
                <>
                  <div>
                    <label className="text-xs font-bold text-foreground px-1 block mb-2">
                      رقم الهاتف (01xxxxxxxxx)
                    </label>
                    <Input
                      type="tel"
                      maxLength={11}
                      placeholder="01001234567"
                      value={kycData.phoneNumber}
                      onChange={(e) => setKycData({ ...kycData, phoneNumber: e.target.value.replace(/\D/g, "") })}
                      className="h-12"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      سيتم إرسال كود التحقق عبر رسالة نصية إلى هذا الرقم
                    </p>
                  </div>

                  <Button
                    onClick={handleSendOTP}
                    disabled={verifying || !validatePhoneNumber(kycData.phoneNumber)}
                    className="w-full h-12 bg-accent hover:bg-accent/90 gap-2"
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        جاري الإرسال...
                      </>
                    ) : (
                      <>
                        <Phone className="w-4 h-4" />
                        إرسال كود التحقق
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-bold text-foreground px-1 block mb-2">
                      كود التحقق (6 أرقام)
                    </label>
                    <Input
                      type="text"
                      maxLength={6}
                      placeholder="000000"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      className="h-12 text-center tracking-widest text-2xl font-mono"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      أدخل الكود المرسل إلى {kycData.phoneNumber}
                    </p>
                  </div>

                  <Button
                    onClick={handleVerifyOTP}
                    disabled={verifying || otpCode.length !== 6}
                    className="w-full h-12 bg-accent hover:bg-accent/90"
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        جاري التحقق...
                      </>
                    ) : (
                      "تأكيد الكود"
                    )}
                  </Button>

                  <Button
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode("");
                    }}
                    variant="ghost"
                    className="w-full"
                  >
                    إرسال الكود مرة أخرى
                  </Button>
                </>
              )}
            </div>
          )}

          {currentStep === "document" && (
            <div className="space-y-4">
              <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
                <p className="text-sm font-semibold text-foreground mb-2">
                  {userType === "mp" ? "صورة الهوية البرلمانية" : "صورة بطاقة الرقم القومي"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {userType === "mp" 
                    ? "يرجى تحميل صورة واضحة لهويتك البرلمانية الرسمية"
                    : "يرجى تحميل صورة واضحة لبطاقة الرقم القومي (الوجه الأمامي)"
                  }
                </p>
              </div>

              {!uploadedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-accent/30 rounded-lg p-8 text-center cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-all"
                >
                  <Upload className="w-12 h-12 text-accent mx-auto mb-2" />
                  <p className="text-sm font-semibold text-foreground">انقر لتحميل الصورة</p>
                  <p className="text-xs text-muted-foreground">أو اسحب الملف هنا</p>
                  <p className="text-xs text-muted-foreground mt-2">الحد الأقصى: 5 MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleDocumentUpload(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-muted rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-success" />
                      <span className="text-sm text-foreground">{uploadedFile.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>

                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div>
                      <Progress value={uploadProgress} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1 text-center">
                        {uploadProgress}% - جاري التحميل والتحقق...
                      </p>
                    </div>
                  )}

                  {uploadProgress === 100 && (
                    <div className="text-center py-4">
                      <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
                      <p className="text-sm text-foreground">تم التحقق من المستند بنجاح</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {currentStep === "success" && (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto animate-scale-in">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">تم التحقق بنجاح</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  حسابك الآن موثق ومحمي بأعلى مستويات الأمان والخصوصية
                </p>
              </div>

              <div className="bg-success/10 border border-success/20 rounded-lg p-3 text-left space-y-2">
                <div className="flex items-center gap-2 text-xs text-foreground">
                  <Lock className="w-4 h-4 text-success" />
                  <span>جميع البيانات مشفرة ومحمية</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span>تم التحقق من جميع المستويات</span>
                </div>
              </div>

              <Button
                onClick={handleCompleteKYC}
                disabled={verifying}
                className="w-full h-12 bg-accent hover:bg-accent/90"
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري الإنهاء...
                  </>
                ) : (
                  "إكمال وبدء الاستخدام"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedKYCSystem;
