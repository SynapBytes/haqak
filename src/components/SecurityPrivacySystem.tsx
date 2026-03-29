import { Activity, Lock, Settings, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const auditItems = [
  "آخر جلسة مسجلة بنجاح من جهاز موثوق.",
  "تحديث صلاحيات الإدارة تم التحقق منه.",
  "لا توجد تنبيهات حرجة حالياً داخل النظام.",
];

const settingsItems = [
  "المصادقة متعددة الخطوات",
  "تنبيهات تسجيل الدخول",
  "سياسات الجلسات الآمنة",
];

const SecurityPrivacySystem = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            نظام الأمان والخصوصية
          </CardTitle>
          <CardDescription>عرض مستقر ومختصر لحالة الأمان العامة داخل المنصة.</CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="audit">السجلات</TabsTrigger>
          <TabsTrigger value="settings">الإعدادات</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-3">
            <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Lock className="h-5 w-5 text-primary" /><div><p className="font-medium">التشفير</p><p className="text-sm text-muted-foreground">مفعل</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Shield className="h-5 w-5 text-primary" /><div><p className="font-medium">الدرع الأمني</p><p className="text-sm text-muted-foreground">مستقر</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Activity className="h-5 w-5 text-primary" /><div><p className="font-medium">الحالة</p><p className="text-sm text-muted-foreground">لا توجد أعطال</p></div></div></CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardContent className="pt-6 space-y-3">
              {auditItems.map((item) => (
                <div key={item} className="rounded-lg border p-3 text-sm text-muted-foreground">{item}</div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardContent className="pt-6 space-y-3">
              {settingsItems.map((item) => (
                <div key={item} className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm text-foreground">{item}</span>
                  <Badge variant="secondary"><Settings className="me-1 h-3 w-3" />مفعل</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SecurityPrivacySystem;
