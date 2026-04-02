import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Coins,
  Heart,
  Users,
  TrendingUp,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  RotateCcw,
  Lock,
  Unlock
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

interface FundingProject {
  id: string;
  title: string;
  ai_refined_description: string;
  category: string;
  location: string;
  target_amount: number;
  raised_amount: number;
  status: string;
  funding_deadline: string;
  contributors_count?: number;
  user_contribution?: number;
  ai_impact_analysis: string;
}

export const ProjectCrowdfunding: React.FC = () => {
  const { session } = useAuth();
  const user = session?.user ?? null;
  const [projects, setProjects] = useState<FundingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<FundingProject | null>(null);
  const [contributionAmount, setContributionAmount] = useState<number>(100);
  const [submittingContribution, setSubmittingContribution] = useState(false);
  const [showRefundVoting, setShowRefundVoting] = useState(false);

  const PRESET_AMOUNTS = [50, 100, 250, 500, 1000];

  useEffect(() => {
    fetchFundingProjects();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('project_contributions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_contributions'
        },
        () => {
          fetchFundingProjects();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchFundingProjects = async () => {
    // Tables project_proposals and project_contributions not yet created
    setProjects([]);
    setLoading(false);
  };

  const handleContribute = async () => {
    if (!user || !selectedProject) {
      toast.error('يجب تسجيل الدخول للمساهمة');
      return;
    }
    // project_contributions table not yet created
    toast.info('ميزة المساهمة المالية قيد التطوير');
    setSubmittingContribution(false);
  };
      

  const daysRemaining = (deadline: string) => {
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  const getProgressPercentage = (raised: number, target: number) => {
    return Math.min((raised / target) * 100, 100);
  };

  const getStatusBadge = (status: string, fundingDeadline: string) => {
    if (daysRemaining(fundingDeadline) === 0) {
      return <Badge className="bg-red-100 text-red-800">انتهت المهلة الزمنية</Badge>;
    }
    return <Badge className="bg-emerald-100 text-emerald-800">جاري جمع التبرعات</Badge>;
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Coins className="w-6 h-6 text-amber-600" />
            التمويل الجماعي للمشاريع (Crowdfunding)
          </h2>
          <p className="text-muted-foreground">ساهم في تمويل المشاريع المجتمعية بمساهمات صغيرة آمنة وموثوقة</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-600 font-bold uppercase">المشاريع النشطة</p>
                <p className="text-2xl font-bold text-amber-900 mt-1">{projects.length}</p>
              </div>
              <div className="w-10 h-10 bg-amber-200 rounded-lg flex items-center justify-center text-lg">
                🎯
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-600 font-bold uppercase">المبلغ المجمع</p>
                <p className="text-2xl font-bold text-emerald-900 mt-1">
                  {(projects.reduce((sum, p) => sum + p.raised_amount, 0) / 1000).toFixed(0)}K
                </p>
              </div>
              <div className="w-10 h-10 bg-emerald-200 rounded-lg flex items-center justify-center text-lg">
                💰
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-bold uppercase">المساهمون</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {projects.reduce((sum, p) => sum + (p.contributors_count || 0), 0)}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-200 rounded-lg flex items-center justify-center text-lg">
                👥
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-600 font-bold uppercase">مساهمتك</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">
                  {projects.reduce((sum, p) => sum + (p.user_contribution || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="w-10 h-10 bg-purple-200 rounded-lg flex items-center justify-center text-lg">
                ❤️
              </div>
            </div>
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
            <p className="text-muted-foreground">لا توجد مشاريع قيد التمويل حالياً</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {projects.map((project, idx) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{project.category}</Badge>
                        {getStatusBadge(project.status, project.funding_deadline)}
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="w-3 h-3 ml-1" />
                          {daysRemaining(project.funding_deadline)} أيام متبقية
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{project.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{project.ai_refined_description}</p>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {project.location}
                  </div>

                  {project.ai_impact_analysis && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                      <p className="text-xs font-semibold text-blue-900 mb-1">الأثر المتوقع:</p>
                      <p className="text-xs text-blue-800">{project.ai_impact_analysis}</p>
                    </div>
                  )}

                  {/* Funding Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold">الهدف المالي</span>
                      <span className="text-sm text-muted-foreground">
                        {project.raised_amount.toLocaleString()} / {project.target_amount.toLocaleString()} ج.م
                      </span>
                    </div>
                    <Progress 
                      value={getProgressPercentage(project.raised_amount, project.target_amount)} 
                      className="h-3 bg-amber-100"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{Math.round(getProgressPercentage(project.raised_amount, project.target_amount))}% مكتمل</span>
                      <span>{project.contributors_count || 0} مساهم</span>
                    </div>
                  </div>

                  {/* User Contribution */}
                  {project.user_contribution && project.user_contribution > 0 && (
                    <Alert className="border-emerald-200 bg-emerald-50">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <AlertDescription className="text-emerald-800">
                        لقد ساهمت بـ {project.user_contribution.toLocaleString()} جنيه في هذا المشروع
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>

                <CardFooter className="bg-muted/10 border-t pt-4">
                  <Button
                    onClick={() => setSelectedProject(project)}
                    className="w-full gap-2 bg-amber-600 hover:bg-amber-700"
                  >
                    <Heart className="w-4 h-4" />
                    ساهم الآن
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Contribution Modal */}
      {selectedProject && (
        <Card className="border-amber-100 bg-amber-50/30 shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{selectedProject.title}</CardTitle>
                <CardDescription className="mt-2">
                  ساهم في تمويل هذا المشروع المهم لمجتمعك
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedProject(null)}
              >
                ✕
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Preset Amounts */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">اختر مبلغاً من المبالغ المقترحة:</Label>
              <div className="grid grid-cols-5 gap-2">
                {PRESET_AMOUNTS.map((amount) => (
                  <Button
                    key={amount}
                    variant={contributionAmount === amount ? 'default' : 'outline'}
                    onClick={() => setContributionAmount(amount)}
                    className="text-sm"
                  >
                    {amount}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div className="space-y-2">
              <Label htmlFor="customAmount" className="text-sm font-semibold">أو أدخل مبلغاً مخصصاً:</Label>
              <div className="flex gap-2">
                <Input
                  id="customAmount"
                  type="number"
                  min="10"
                  max="100000"
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(parseInt(e.target.value) || 0)}
                  placeholder="أدخل المبلغ"
                  className="flex-1"
                />
                <span className="flex items-center text-muted-foreground">ج.م</span>
              </div>
              <p className="text-xs text-muted-foreground">الحد الأدنى: 10 جنيهات | الحد الأقصى: 100,000 جنيه</p>
            </div>

            {/* Funding Summary */}
            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <div className="space-y-1">
                  <p className="font-semibold">ملخص المساهمة:</p>
                  <p>المبلغ: {contributionAmount.toLocaleString()} جنيه</p>
                  <p className="text-xs">رسوم التحويل: 2.5% ({(contributionAmount * 0.025).toFixed(2)} جنيه)</p>
                  <p className="font-semibold">المبلغ الذي سيصل للمشروع: {(contributionAmount * 0.975).toFixed(2)} جنيه</p>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>

          <CardFooter className="bg-muted/10 border-t pt-4 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedProject(null)}
              className="flex-1"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleContribute}
              disabled={submittingContribution || contributionAmount < 10}
              className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {submittingContribution ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري المعالجة...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  تأكيد المساهمة
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
