import { Award, BarChart3, Calendar, Clock, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const monthlyRows = [
  { month: "يناير", total: 22, resolved: 18, pending: 4, satisfaction: "84%" },
  { month: "فبراير", total: 27, resolved: 23, pending: 4, satisfaction: "88%" },
  { month: "مارس", total: 31, resolved: 28, pending: 3, satisfaction: "91%" },
];

const TransparencyReports = ({ mpId }: { mpId?: string }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            تقارير الشفافية والإنجازات
          </CardTitle>
          <CardDescription>
            ملخص بصري مبسط لأداء المتابعة العامة{mpId ? ` — ${mpId}` : ""}.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Award className="h-5 w-5 text-primary" /><div><p className="text-sm text-muted-foreground">درجة الأداء</p><p className="text-2xl font-bold">92</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><TrendingUp className="h-5 w-5 text-primary" /><div><p className="text-sm text-muted-foreground">معدل الحل</p><p className="text-2xl font-bold">87%</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Clock className="h-5 w-5 text-primary" /><div><p className="text-sm text-muted-foreground">متوسط الوقت</p><p className="text-2xl font-bold">5 أيام</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-primary" /><div><p className="text-sm text-muted-foreground">رضا المواطنين</p><p className="text-2xl font-bold">90%</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            تقرير شهري مختصر
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-right">
                  <th className="py-3">الشهر</th>
                  <th className="py-3">الإجمالي</th>
                  <th className="py-3">المحلول</th>
                  <th className="py-3">المعلّق</th>
                  <th className="py-3">الرضا</th>
                </tr>
              </thead>
              <tbody>
                {monthlyRows.map((row) => (
                  <tr key={row.month} className="border-b text-right">
                    <td className="py-3">{row.month}</td>
                    <td className="py-3"><Badge variant="outline">{row.total}</Badge></td>
                    <td className="py-3"><Badge>{row.resolved}</Badge></td>
                    <td className="py-3"><Badge variant="secondary">{row.pending}</Badge></td>
                    <td className="py-3">{row.satisfaction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransparencyReports;
