import { Camera, CheckCircle2, Fingerprint, MapPin, Shield, Smartphone } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const features = [
  {
    title: "المصادقة البيومترية",
    description: "تسجيل دخول أكثر أمانًا عبر بصمة الوجه أو الإصبع على الأجهزة المدعومة.",
    icon: Fingerprint,
    status: "جاهز",
  },
  {
    title: "الصور المربوطة بالموقع",
    description: "توثيق البلاغات بصور تحمل بيانات الموقع لتسهيل التحقق الميداني.",
    icon: Camera,
    status: "متاح",
  },
  {
    title: "المتابعة الميدانية",
    description: "ربط المواقع الجغرافية بطلبات المواطنين لعرضها بشكل أوضح على الخريطة.",
    icon: MapPin,
    status: "نشط",
  },
];

export const MobileAppFeatures = () => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            ميزات تطبيق الهاتف
          </CardTitle>
          <CardDescription>
            نظرة سريعة على القدرات المتقدمة المتاحة داخل التجربة المحمولة.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.title}>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5 text-primary" />
                  <Badge variant="secondary">{feature.status}</Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start gap-3 rounded-lg border bg-muted/20 p-4">
            <Shield className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-foreground">طبقة حماية إضافية</p>
              <p className="text-sm leading-6 text-muted-foreground">
                تم الحفاظ على بطاقة عرض بسيطة ومستقرة لضمان عمل الصفحة بدون أخطاء وقت البناء.
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" className="w-full gap-2">
            <CheckCircle2 className="h-4 w-4" />
            المزايا جاهزة للعرض
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileAppFeatures;
