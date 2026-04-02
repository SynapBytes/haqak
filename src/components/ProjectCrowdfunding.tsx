import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Coins, Heart, Users, MapPin, Calendar, CheckCircle2, AlertCircle, Loader2, Send, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

interface FundingProject {
  id: string;
  center_id: string;
  title: string;
  description: string;
  target_amount: number;
  raised_amount: number;
  status: string;
  founders_display: string;
  distinct_donor_count: number;
  refund_request_percentage: number;
}

export const ProjectCrowdfunding: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<FundingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<FundingProject | null>(null);
  const [contributionAmount, setContributionAmount] = useState<number | ''>(100);
  const [submittingContribution, setSubmittingContribution] = useState(false);
  const [submittingRefundVote, setSubmittingRefundVote] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ center_id: string | null; verification_status: string | null } | null>(null);
  const [hasMpRole, setHasMpRole] = useState(false);

  const PRESET_AMOUNTS = [50, 100, 250, 500, 1000];

  const isVerifiedCitizenOnly = !!user && profile?.verification_status === 'verified' && !!profile?.center_id && !hasMpRole;

  useEffect(() => {
    fetchMe();
    fetchFundingProjects();

    const subscription = supabase
      .channel('community_project_public_stats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_projects',
        },
        () => {
          fetchFundingProjects();
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  const fetchMe = async () => {
    if (!user) {
      setProfile(null);
      setHasMpRole(false);
      return;
    }

    const [{ data: profileData }, { data: roleRows }] = await Promise.all([
      supabase.from('profiles').select('center_id, verification_status').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', user.id),
    ]);

    setProfile(profileData ?? null);
    setHasMpRole((roleRows ?? []).some((r) => r.role === 'mp'));
  };

  const fetchFundingProjects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('community_project_public_stats')
      .select('project_id, center_id, title, description, target_amount, raised_amount, status, founders_display, distinct_donor_count, refund_request_percentage');

    if (error) {
      toast.error('تعذر تحميل مشاريع التمويل المجتمعي');
      setProjects([]);
      setLoading(false);
      return;
    }

    const mapped = (data ?? []).map((row) => ({
      id: row.project_id,
      center_id: row.center_id,
      title: row.title,
      description: row.description,
      target_amount: Number(row.target_amount ?? 0),
      raised_amount: Number(row.raised_amount ?? 0),
      status: row.status,
      founders_display: row.founders_display,
      distinct_donor_count: Number(row.distinct_donor_count ?? 0),
      refund_request_percentage: Number(row.refund_request_percentage ?? 0),
    }));

    setProjects(mapped);
    setLoading(false);
  };

  const handleContribute = async () => {
    if (!user || !selectedProject) {
      toast.error('يجب تسجيل الدخول للتبرع');
      return;
    }

    if (!isVerifiedCitizenOnly) {
      toast.error('التبرع متاح فقط للمواطنين الموثقين');
      return;
    }

    if (Number(contributionAmount) <= 0) {
      toast.error('أدخل مبلغ تبرع صالح');
      return;
    }

    setSubmittingContribution(true);
    const { data, error } = await supabase.rpc('create_project_donation_pledge', {
      _project_id: selectedProject.id,
      _amount: Number(contributionAmount),
    });

    if (error) {
      toast.error(error.message || 'تعذر إنشاء طلب التبرع');
      setSubmittingContribution(false);
      return;
    }

    const referenceCode = (data as { reference_code?: string } | null)?.reference_code;
    toast.success(`تم إنشاء تعهد التبرع بنجاح${referenceCode ? ` (المرجع: ${referenceCode})` : ''}`);
    toast.info('Instapay SOON: سيتم تفعيل الدفع لاحقاً والتحقق يدوياً من الإدارة');
    setSubmittingContribution(false);
    setSelectedProject(null);
    fetchFundingProjects();
  };

  const handleRefundVote = async (projectId: string) => {
    if (!user) {
      toast.error('يجب تسجيل الدخول لطلب الاسترداد');
      return;
    }

    if (!isVerifiedCitizenOnly) {
      toast.error('طلب الاسترداد متاح فقط للمواطنين الموثقين المتبرعين');
      return;
    }

    setSubmittingRefundVote(projectId);
    const { error } = await supabase.from('project_refund_requests').insert({
      project_id: projectId,
      requester_user_id: user.id,
    });

    if (error) {
      toast.error(error.message || 'تعذر تسجيل طلب الاسترداد');
      setSubmittingRefundVote(null);
      return;
    }

    toast.success('تم تسجيل طلب الاسترداد بنجاح');
    setSubmittingRefundVote(null);
    fetchFundingProjects();
  };

  const getProgressPercentage = (raised: number, target: number) => {
    if (target <= 0) return 0;
    return Math.min((raised / target) * 100, 100);
  };

  const projectStats = useMemo(() => {
    return {
      totalRaised: projects.reduce((sum, p) => sum + p.raised_amount, 0),
      totalDonors: projects.reduce((sum, p) => sum + p.distinct_donor_count, 0),
    };
  }, [projects]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Coins className="w-6 h-6 text-amber-600" />
            التمويل المجتمعي للمشاريع
          </h2>
          <p className="text-muted-foreground">تعهد بالتبرع الآن - Instapay SOON</p>
        </div>
      </div>

      {!isVerifiedCitizenOnly && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            التبرع، طلب الاسترداد، والمشاركة في ترشيحات التحويل متاحة فقط للمواطنين الموثقين.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <p className="text-xs text-amber-600 font-bold uppercase">المشاريع النشطة</p>
            <p className="text-2xl font-bold text-amber-900 mt-1">{projects.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-4">
            <p className="text-xs text-emerald-600 font-bold uppercase">إجمالي المبلغ</p>
            <p className="text-2xl font-bold text-emerald-900 mt-1">{projectStats.totalRaised.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <p className="text-xs text-blue-600 font-bold uppercase">إجمالي المتبرعين</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">{projectStats.totalDonors}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card>
          <CardContent className="pt-6 flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">جاري تحميل المشاريع...</p>
          </CardContent>
        </Card>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="pt-6 flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-muted-foreground opacity-20 mb-4" />
            <p className="text-muted-foreground">لا توجد مشاريع تمويل مجتمعي حالياً</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {projects.map((project, idx) => (
            <motion.div key={project.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
              <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">
                          <Calendar className="w-3 h-3 ml-1" />
                          {project.status}
                        </Badge>
                        <Badge variant="secondary">
                          <Users className="w-3 h-3 ml-1" />
                          {project.founders_display}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{project.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{project.description}</p>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    المركز المرتبط بالمشروع
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold">التقدم المالي</span>
                      <span className="text-sm text-muted-foreground">
                        {project.raised_amount.toLocaleString()} / {project.target_amount.toLocaleString()} ج.م
                      </span>
                    </div>
                    <Progress value={getProgressPercentage(project.raised_amount, project.target_amount)} className="h-3 bg-amber-100" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{Math.round(getProgressPercentage(project.raised_amount, project.target_amount))}% مكتمل</span>
                      <span>{project.distinct_donor_count} متبرع</span>
                    </div>
                  </div>

                  <Alert className="border-blue-200 bg-blue-50">
                    <AlertDescription className="text-blue-800 text-xs">
                      نسبة طلبات الاسترداد الحالية: {project.refund_request_percentage.toFixed(2)}% (يتم الإلغاء تلقائياً عند 51%+)
                    </AlertDescription>
                  </Alert>
                </CardContent>

                <CardFooter className="bg-muted/10 border-t pt-4 flex gap-2">
                  <Button onClick={() => setSelectedProject(project)} className="flex-1 gap-2 bg-amber-600 hover:bg-amber-700">
                    <Heart className="w-4 h-4" />
                    تعهد بالتبرع
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleRefundVote(project.id)}
                    disabled={submittingRefundVote === project.id}
                    className="flex-1 gap-2"
                  >
                    {submittingRefundVote === project.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                    طلب استرداد
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {selectedProject && (
        <Card className="border-amber-100 bg-amber-50/30 shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{selectedProject.title}</CardTitle>
                <CardDescription className="mt-2">تعهد بالتبرع الآن - Instapay SOON</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedProject(null)}>
                ✕
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">اختر مبلغاً مقترحاً:</Label>
              <div className="grid grid-cols-5 gap-2">
                {PRESET_AMOUNTS.map((amount) => (
                  <Button key={amount} variant={contributionAmount === amount ? 'default' : 'outline'} onClick={() => setContributionAmount(amount)} className="text-sm">
                    {amount}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customAmount" className="text-sm font-semibold">أو أدخل مبلغاً مخصصاً:</Label>
              <div className="flex gap-2">
                <Input
                  id="customAmount"
                  type="number"
                  min="10"
                  max="100000"
                  value={contributionAmount}
                  onChange={(e) => {
                    const next = e.target.value;
                    setContributionAmount(next === '' ? '' : parseInt(next, 10) || 0);
                  }}
                  placeholder="أدخل المبلغ"
                  className="flex-1"
                />
                <span className="flex items-center text-muted-foreground">ج.م</span>
              </div>
            </div>

            <Alert className="border-emerald-200 bg-emerald-50">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-800">
                سيتم إنشاء تعهد تبرع بحالة <strong>payment_soon</strong> مع رقم مرجعي. لا توجد تعليمات دفع أو بيانات بنكية حالياً.
              </AlertDescription>
            </Alert>
          </CardContent>

          <CardFooter className="bg-muted/10 border-t pt-4 flex gap-2">
            <Button variant="outline" onClick={() => setSelectedProject(null)} className="flex-1">
              إلغاء
            </Button>
            <Button onClick={handleContribute} disabled={submittingContribution || Number(contributionAmount) < 10} className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700">
              {submittingContribution ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري المعالجة...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  إنشاء تعهد التبرع
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default ProjectCrowdfunding;
