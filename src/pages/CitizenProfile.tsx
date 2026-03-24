import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  User, Phone, Mail, Camera, Loader2, Save, Shield,
  Calendar, CheckCircle2, AlertCircle, Clock, BarChart3
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { stripExifFromFile } from "@/lib/stripExif";

const CitizenProfile = () => {
  const { user, profile, role } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [issueStats, setIssueStats] = useState({ total: 0, resolved: 0, inProgress: 0, received: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, phone, avatar_url")
        .eq("user_id", user.id)
        .single();

      if (profileData) {
        setFullName(profileData.full_name);
        setPhone(profileData.phone);
        setAvatarUrl(profileData.avatar_url);
      }

      const { data: issues } = await supabase
        .from("issues")
        .select("status")
        .eq("user_id", user.id);

      if (issues) {
        setIssueStats({
          total: issues.length,
          resolved: issues.filter(i => i.status === "resolved").length,
          inProgress: issues.filter(i => i.status === "in-progress").length,
          received: issues.filter(i => i.status === "received").length,
        });
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("حجم الصورة يجب ألا يتجاوز 2 ميجابايت");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlWithCacheBust })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(urlWithCacheBust);
      toast.success("تم تحديث الصورة بنجاح ✨");
    } catch (err: any) {
      toast.error(err.message || "خطأ في رفع الصورة");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!/^01[0-9]{9}$/.test(phone)) {
      toast.error("رقم التليفون غير صحيح (يجب أن يبدأ بـ 01 ويكون 11 رقم)");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, phone })
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("تم حفظ البيانات بنجاح ✅");
    } catch (err: any) {
      toast.error(err.message || "خطأ في حفظ البيانات");
    } finally {
      setSaving(false);
    }
  };

  const statCards = [
    { label: "إجمالي الشكاوى", value: issueStats.total, icon: BarChart3, color: "text-accent", bg: "from-accent/10 to-accent/5" },
    { label: "تم الحل", value: issueStats.resolved, icon: CheckCircle2, color: "text-success", bg: "from-success/10 to-success/5" },
    { label: "قيد المعالجة", value: issueStats.inProgress, icon: Clock, color: "text-warning", bg: "from-warning/10 to-warning/5" },
    { label: "بانتظار المراجعة", value: issueStats.received, icon: AlertCircle, color: "text-info", bg: "from-info/10 to-info/5" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-accent/[0.04] blur-3xl" />
        <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.3, 0.15] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-primary/[0.04] blur-3xl" />
      </div>

      <AppHeader />
      <div className="container py-6 md:py-8 px-4 max-w-2xl relative z-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1 tracking-tight">الملف الشخصي</h1>
          <p className="text-muted-foreground text-sm">عدّل بياناتك الشخصية وصورتك</p>
        </motion.div>

        {/* Avatar Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-3xl p-6 md:p-8 mb-6 text-center"
        >
          <div className="relative inline-block mb-4">
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-3xl bg-gradient-to-br from-accent to-primary flex items-center justify-center overflow-hidden shadow-xl ring-4 ring-background">
              {avatarUrl ? (
                <img src={avatarUrl} alt="الصورة الشخصية" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl md:text-5xl font-bold text-white">
                  {fullName?.charAt(0) || "م"}
                </span>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-2 -left-2 w-10 h-10 rounded-2xl bg-accent text-white flex items-center justify-center shadow-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          <h2 className="text-xl font-bold text-foreground">{fullName}</h2>
          <div className="flex items-center justify-center gap-2 mt-1.5">
            <Shield className="w-3.5 h-3.5 text-accent" />
            <span className="text-sm text-muted-foreground">{role === "mp" ? "نائب" : role === "admin" ? "مسؤول" : "مواطن"}</span>
          </div>
          {user?.email && (
            <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
              <Mail className="w-3 h-3" />
              <span dir="ltr">{user.email}</span>
            </div>
          )}
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {statCards.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.06 }}
              className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-3 md:p-4 text-center group hover:shadow-lg transition-all duration-300"
            >
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${stat.bg} flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Edit Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-3xl p-6 md:p-8"
        >
          <h3 className="text-lg font-bold text-foreground mb-5 flex items-center gap-2">
            <User className="w-5 h-5 text-accent" />
            البيانات الشخصية
          </h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground block">الاسم الرباعي</label>
              <div className="relative">
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="text-right pr-11 h-12 rounded-xl border-border/50 bg-background/50 focus:bg-background"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-muted flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground block">رقم التليفون</label>
              <div className="relative">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  className="pl-11 text-left h-12 rounded-xl border-border/50 bg-background/50 focus:bg-background"
                  maxLength={11}
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-muted flex items-center justify-center">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground block">البريد الإلكتروني</label>
              <div className="relative">
                <Input
                  value={user?.email || ""}
                  disabled
                  dir="ltr"
                  className="pl-11 text-left h-12 rounded-xl border-border/50 bg-muted/50 text-muted-foreground cursor-not-allowed"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-muted flex items-center justify-center">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving || !fullName || !phone}
              className="w-full gap-2.5 bg-gradient-to-l from-accent to-info text-white hover:opacity-90 h-12 rounded-xl font-semibold shadow-lg shadow-accent/20 mt-2"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              حفظ التغييرات
            </Button>
          </div>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 gap-3 mt-6"
        >
          <Button
            variant="outline"
            className="h-14 rounded-2xl gap-2 border-border/50 hover:border-accent/30 hover:bg-accent/5"
            onClick={() => navigate("/citizen")}
          >
            <AlertCircle className="w-5 h-5 text-accent" />
            <span className="text-sm font-semibold">مشاكلي</span>
          </Button>
          <Button
            variant="outline"
            className="h-14 rounded-2xl gap-2 border-border/50 hover:border-accent/30 hover:bg-accent/5"
            onClick={() => navigate("/mps")}
          >
            <Shield className="w-5 h-5 text-accent" />
            <span className="text-sm font-semibold">دليل النواب</span>
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default CitizenProfile;
