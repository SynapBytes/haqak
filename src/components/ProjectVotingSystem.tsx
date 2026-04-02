import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Vote, ThumbsUp, Users, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

interface CommunityProjectSummary {
  project_id: string;
  title: string;
  status: string;
  founders_verified_count: number;
  founders_display: string;
  distinct_donor_count: number;
  refund_request_percentage: number;
}

interface NominationItem {
  id: string;
  project_id: string;
  nominated_mp_user_id: string;
  status: string;
}

export const ProjectVotingSystem: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<CommunityProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [nominatingProject, setNominatingProject] = useState<string | null>(null);
  const [approvingNomination, setApprovingNomination] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ center_id: string | null; verification_status: string | null } | null>(null);
  const [hasMpRole, setHasMpRole] = useState(false);

  const isVerifiedCitizenOnly = !!user && profile?.verification_status === 'verified' && !!profile?.center_id && !hasMpRole;

  useEffect(() => {
    fetchMe();
    fetchProjects();
  }, [user?.id]);

  const fetchMe = async () => {
    if (!user) {
      setProfile(null);
      setHasMpRole(false);
      return;
    }

    const [{ data: profileData }, { data: roles }] = await Promise.all([
      supabase.from('profiles').select('center_id, verification_status').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', user.id),
    ]);

    setProfile(profileData ?? null);
    setHasMpRole((roles ?? []).some((r) => r.role === 'mp'));
  };

  const fetchProjects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('community_project_public_stats')
      .select('project_id, title, status, founders_verified_count, founders_display, distinct_donor_count, refund_request_percentage')
      .eq('status', 'target_reached');

    if (error) {
      toast.error('تعذر تحميل المشاريع الجاهزة لترشيح النائب');
      setProjects([]);
      setLoading(false);
      return;
    }

    setProjects(
      (data ?? []).map((row) => ({
        project_id: row.project_id,
        title: row.title,
        status: row.status,
        founders_verified_count: Number(row.founders_verified_count ?? 0),
        founders_display: row.founders_display,
        distinct_donor_count: Number(row.distinct_donor_count ?? 0),
        refund_request_percentage: Number(row.refund_request_percentage ?? 0),
      })),
    );
    setLoading(false);
  };

  const nominateRandomCenterMp = async (projectId: string) => {
    if (!user || !isVerifiedCitizenOnly || !profile?.center_id) {
      toast.error('الترشيح متاح فقط للمؤسسين المواطنين الموثقين من نفس المركز');
      return;
    }

    setNominatingProject(projectId);
    const { data: mpRoleRows, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'mp');

    if (rolesError || !mpRoleRows || mpRoleRows.length === 0) {
      toast.error('لا يوجد نائب موثق متاح في نفس المركز');
      setNominatingProject(null);
      return;
    }

    const mpUserIds = mpRoleRows.map((row) => row.user_id);
    const { data: mpCandidates, error: candidatesError } = await supabase
      .from('profiles')
      .select('user_id')
      .in('user_id', mpUserIds)
      .eq('center_id', profile.center_id)
      .eq('verification_status', 'verified')
      .limit(1);

    if (candidatesError || !mpCandidates || mpCandidates.length === 0) {
      toast.error('لا يوجد نائب موثق متاح في نفس المركز');
      setNominatingProject(null);
      return;
    }

    const nominatedMpUserId = mpCandidates[0].user_id;

    const { error } = await supabase.from('project_mp_nominations').insert({
      project_id: projectId,
      nominated_mp_user_id: nominatedMpUserId,
      nominated_by_founder_user_id: user.id,
      status: 'pending_founder_approvals',
    });

    if (error) {
      toast.error(error.message || 'تعذر إنشاء ترشيح النائب');
      setNominatingProject(null);
      return;
    }

    toast.success('تم إنشاء ترشيح نائب من نفس المركز، ويحتاج موافقة 3/5 مؤسسين');
    setNominatingProject(null);
  };

  const approveLatestNomination = async (projectId: string) => {
    if (!user || !isVerifiedCitizenOnly) {
      toast.error('الموافقة متاحة فقط للمؤسسين المواطنين الموثقين');
      return;
    }

    setApprovingNomination(projectId);

    const { data: nominations, error: nominationError } = await supabase
      .from('project_mp_nominations')
      .select('id, project_id, nominated_mp_user_id, status')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (nominationError || !nominations || nominations.length === 0) {
      toast.error('لا يوجد ترشيح نشط لهذا المشروع');
      setApprovingNomination(null);
      return;
    }

    const nomination = nominations[0] as NominationItem;
    if (nomination.status !== 'pending_founder_approvals') {
      toast.info('هذا الترشيح لم يعد في مرحلة الموافقات');
      setApprovingNomination(null);
      return;
    }

    const { error: approvalError } = await supabase.from('project_mp_nomination_approvals').insert({
      nomination_id: nomination.id,
      founder_user_id: user.id,
    });

    if (approvalError) {
      toast.error(approvalError.message || 'تعذر تسجيل الموافقة');
      setApprovingNomination(null);
      return;
    }

    toast.success('تم تسجيل موافقتك على ترشيح النائب');
    setApprovingNomination(null);
    fetchProjects();
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Vote className="w-6 h-6 text-primary" />
            ترشيح نائب التحويل والموافقات
          </h2>
          <p className="text-muted-foreground">بعد بلوغ الهدف: يلزم ترشيح نائب من نفس المركز + موافقة 3/5 مؤسسين.</p>
        </div>
        <Badge variant="outline" className="px-3 py-1 gap-1">
          <Users className="w-4 h-4" />
          حوكمة المؤسسين
        </Badge>
      </div>

      {!isVerifiedCitizenOnly && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            الترشيح والموافقة متاحان فقط للمؤسسين المواطنين الموثقين.
          </AlertDescription>
        </Alert>
      )}

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
            <p className="text-muted-foreground">لا توجد مشاريع وصلت للهدف بعد</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {projects.map((project, idx) => (
            <motion.div key={project.project_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
              <Card className="overflow-hidden border-l-4 border-l-primary hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{project.status}</Badge>
                        <Badge variant="secondary">{project.founders_display}</Badge>
                        <Badge variant="outline">{project.distinct_donor_count} متبرع</Badge>
                      </div>
                      <CardTitle className="text-lg">{project.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-2">
                  <Alert className="border-blue-200 bg-blue-50">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800 text-xs">
                      عند قبول النائب يجب تسجيل الإقرار القانوني مع التاريخ، ولا يتم أي تحويل بدون موافقة الإدارة.
                    </AlertDescription>
                  </Alert>
                  <p className="text-xs text-muted-foreground">
                    نسبة طلبات الاسترداد: {project.refund_request_percentage.toFixed(2)}%
                  </p>
                </CardContent>

                <CardFooter className="bg-muted/10 border-t pt-4 flex gap-2">
                  <Button
                    onClick={() => nominateRandomCenterMp(project.project_id)}
                    disabled={nominatingProject === project.project_id || !isVerifiedCitizenOnly}
                    className="flex-1 gap-2"
                  >
                    {nominatingProject === project.project_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                    ترشيح نائب من نفس المركز
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => approveLatestNomination(project.project_id)}
                    disabled={approvingNomination === project.project_id || !isVerifiedCitizenOnly}
                    className="flex-1"
                  >
                    {approvingNomination === project.project_id ? '...' : 'موافقة مؤسس'}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectVotingSystem;
