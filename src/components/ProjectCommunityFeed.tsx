import { useEffect, useMemo, useState } from 'react';
import { Heart, MessageSquare, Newspaper, Share2, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FeedProjectItem {
  project_id: string;
  title: string;
  status: string;
  target_amount: number;
  raised_amount: number;
  founders_display: string;
  distinct_donor_count: number;
  refund_request_percentage: number;
}

export const ProjectCommunityFeed = () => {
  const [filter, setFilter] = useState<'all' | 'funding_active' | 'target_reached' | 'cancelled' | 'transfer_completed'>('all');
  const [items, setItems] = useState<FeedProjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('community_project_public_stats')
      .select('project_id, title, status, target_amount, raised_amount, founders_display, distinct_donor_count, refund_request_percentage')
      .order('project_id', { ascending: false });

    if (error) {
      toast.error('تعذر تحميل موجز المشاريع');
      setItems([]);
      setLoading(false);
      return;
    }

    setItems(
      (data ?? []).map((row) => ({
        project_id: row.project_id,
        title: row.title,
        status: row.status,
        target_amount: Number(row.target_amount ?? 0),
        raised_amount: Number(row.raised_amount ?? 0),
        founders_display: row.founders_display,
        distinct_donor_count: Number(row.distinct_donor_count ?? 0),
        refund_request_percentage: Number(row.refund_request_percentage ?? 0),
      })),
    );
    setLoading(false);
  };

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((item) => item.status === filter);
  }, [filter, items]);

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            مجتمع المشاريع
          </CardTitle>
          <CardDescription>موجز عام مجهّل للهوية: لا تظهر أسماء المؤسسين أو المتبرعين.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>الكل</Button>
          <Button variant={filter === 'funding_active' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('funding_active')}>تمويل نشط</Button>
          <Button variant={filter === 'target_reached' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('target_reached')}>تم بلوغ الهدف</Button>
          <Button variant={filter === 'cancelled' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('cancelled')}>ملغى</Button>
          <Button variant={filter === 'transfer_completed' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('transfer_completed')}>تحويل مكتمل</Button>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="pt-6">جاري التحميل...</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((item, index) => (
            <motion.div key={item.project_id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{item.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">الحالة: {item.status}</p>
                    </div>
                    <Badge variant="secondary">{item.status}</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground">
                    <p>المبلغ المجمع: {item.raised_amount.toLocaleString()} / {item.target_amount.toLocaleString()} ج.م</p>
                    <p className="flex items-center gap-1"><Users className="h-4 w-4" /> {item.founders_display}</p>
                    <p>عدد المتبرعين: {item.distinct_donor_count}</p>
                    <p>نسبة طلبات الاسترداد: {item.refund_request_percentage.toFixed(2)}%</p>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Heart className="h-4 w-4" /> {item.distinct_donor_count}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="h-4 w-4" /> {Math.round(item.refund_request_percentage)}</span>
                    <Button type="button" variant="ghost" size="sm" className="ms-auto gap-2">
                      <Share2 className="h-4 w-4" />
                      مشاركة
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectCommunityFeed;
