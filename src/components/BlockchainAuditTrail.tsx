import { useMemo, useState } from "react";
import { Eye, Lock, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const mockBlocks = [
  {
    id: "1",
    index: 412,
    table: "issues",
    action: "UPDATE",
    hash: "0x9f2e72b4a18cc73f",
    previousHash: "0x8d1e61ab91bc54de",
    createdAt: "منذ 3 دقائق",
    payload: "تم تحديث حالة طلب إلى قيد المعالجة",
  },
  {
    id: "2",
    index: 411,
    table: "notifications",
    action: "INSERT",
    hash: "0x7ba844ad1c2e5670",
    previousHash: "0x6ce7339ef0bb4501",
    createdAt: "منذ 12 دقيقة",
    payload: "تم إنشاء إشعار متابعة للمواطن",
  },
  {
    id: "3",
    index: 410,
    table: "profiles",
    action: "UPDATE",
    hash: "0x52dc613ae90a77bf",
    previousHash: "0x48ca51ee72af61c2",
    createdAt: "منذ 26 دقيقة",
    payload: "تم تحديث بيانات اعتماد ممثل الدائرة",
  },
];

export const BlockchainAuditTrail = () => {
  const [expandedId, setExpandedId] = useState<string | null>(mockBlocks[0]?.id ?? null);

  const stats = useMemo(
    () => ({
      total: mockBlocks.length,
      latest: mockBlocks[0]?.createdAt ?? "الآن",
    }),
    [],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            سجل التدقيق المشفّر
          </CardTitle>
          <CardDescription>
            عرض مبسط لآخر العمليات المسجلة لضمان التتبع والشفافية.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">إجمالي الكتل المعروضة</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">آخر تحديث</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{stats.latest}</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {mockBlocks.map((block) => {
          const isExpanded = expandedId === block.id;
          return (
            <Card key={block.id}>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">#{block.index}</Badge>
                      <Badge>{block.action}</Badge>
                      <span className="text-sm text-muted-foreground">{block.table}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{block.createdAt}</p>
                    <p className="text-sm text-foreground">{block.payload}</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setExpandedId(isExpanded ? null : block.id)}>
                    <Eye className="mr-2 h-4 w-4" />
                    {isExpanded ? "إخفاء" : "عرض"}
                  </Button>
                </div>

                {isExpanded && (
                  <div className="mt-4 grid gap-3 rounded-lg border bg-muted/20 p-4 text-sm md:grid-cols-2">
                    <div>
                      <p className="mb-1 font-medium text-foreground">الهاش الحالي</p>
                      <p className="font-mono text-muted-foreground">{block.hash}</p>
                    </div>
                    <div>
                      <p className="mb-1 font-medium text-foreground">الهاش السابق</p>
                      <p className="font-mono text-muted-foreground">{block.previousHash}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-primary" />
        تم تبسيط العرض لإرجاع الواجهة للعمل مع الحفاظ على ملخص بصري واضح.
      </div>
    </div>
  );
};

export default BlockchainAuditTrail;
