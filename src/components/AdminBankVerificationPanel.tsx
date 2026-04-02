import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface BankQueueRow {
  id: string;
  mp_user_id: string;
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  iban: string;
  swift: string;
  branch_name: string | null;
  country: string;
  status: "pending_verification" | "verified" | "rejected";
  rejection_reason: string | null;
  created_at: string;
}

const mask = (value: string) => (value.length <= 4 ? value : `${"*".repeat(value.length - 4)}${value.slice(-4)}`);
const DEFAULT_REJECTION_REASON = "بيانات غير مكتملة";

const AdminBankVerificationPanel = () => {
  const [rows, setRows] = useState<BankQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [reasonById, setReasonById] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("mp_bank_accounts")
      .select("id, mp_user_id, account_holder_name, bank_name, account_number, iban, swift, branch_name, country, status, rejection_reason, created_at")
      .order("created_at", { ascending: true });
    if (error) {
      toast.error(error.message);
      setRows([]);
      setLoading(false);
      return;
    }
    setRows((data as BankQueueRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const decide = async (row: BankQueueRow, status: "verified" | "rejected") => {
    setProcessingId(row.id);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const rejection = status === "rejected" ? (reasonById[row.id] || DEFAULT_REJECTION_REASON) : null;
      const { error } = await supabase
        .from("mp_bank_accounts")
        .update({
          status,
          verified_by: user?.id ?? null,
          verified_at: new Date().toISOString(),
          rejection_reason: rejection,
        })
        .eq("id", row.id);
      if (error) throw error;
      toast.success(status === "verified" ? "تم اعتماد الحساب البنكي" : "تم رفض الحساب البنكي");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تنفيذ القرار");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>مراجعة الحسابات البنكية للنواب</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد طلبات حالياً.</p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="border rounded-xl p-4 space-y-2">
              <div className="grid md:grid-cols-2 gap-2 text-sm">
                <p><strong>MP:</strong> {row.mp_user_id}</p>
                <p><strong>Status:</strong> {row.status}</p>
                <p><strong>Holder:</strong> {row.account_holder_name}</p>
                <p><strong>Bank:</strong> {row.bank_name}</p>
                <p><strong>Account:</strong> {mask(row.account_number)}</p>
                <p><strong>IBAN:</strong> {mask(row.iban)}</p>
                <p><strong>SWIFT:</strong> {mask(row.swift)}</p>
                <p><strong>Country:</strong> {row.country}</p>
              </div>
              <Input
                placeholder="سبب الرفض (مطلوب عند الرفض)"
                value={reasonById[row.id] ?? ""}
                onChange={(e) => setReasonById((prev) => ({ ...prev, [row.id]: e.target.value }))}
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => void decide(row, "verified")}
                  disabled={processingId === row.id || row.status === "verified"}
                >
                  اعتماد
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => void decide(row, "rejected")}
                  disabled={processingId === row.id || row.status === "rejected"}
                >
                  رفض
                </Button>
              </div>
              {row.rejection_reason && (
                <Textarea value={row.rejection_reason} readOnly className="text-xs" />
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default AdminBankVerificationPanel;
