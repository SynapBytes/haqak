import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Vote,
  ThumbsUp,
  ThumbsDown,
  Users,
  MapPin,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

interface ProjectProposal {
  id: string;
  title: string;
  ai_refined_description: string;
  category: string;
  location: string;
  ai_impact_analysis: string;
  status: string;
  voting_deadline: string;
  upvotes: number;
  downvotes: number;
  userVote?: 'upvote' | 'downvote' | null;
}

export const ProjectVotingSystem: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingProject, setVotingProject] = useState<string | null>(null);
  const [submittingVote, setSubmittingVote] = useState(false);

  useEffect(() => {
    fetchVotingProjects();
    
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('project_votes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_votes'
        },
        () => {
          fetchVotingProjects();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchVotingProjects = async () => {
    try {
      setLoading(true);
      
      // Fetch projects in voting phase
      const { data: projectsData, error: projectsError } = await supabase
        .from('project_proposals')
        .select('*')
        .eq('status', 'voting_active')
        .gt('voting_deadline', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // Fetch vote counts and user's votes
      const projectsWithVotes = await Promise.all(
        (projectsData || []).map(async (project) => {
          const { data: votesData } = await supabase
            .from('project_votes')
            .select('vote_type')
            .eq('project_id', project.id);

          const upvotes = votesData?.filter(v => v.vote_type === 'upvote').length || 0;
          const downvotes = votesData?.filter(v => v.vote_type === 'downvote').length || 0;

          let userVote = null;
          if (user) {
            const { data: userVoteData } = await supabase
              .from('project_votes')
              .select('vote_type')
              .eq('project_id', project.id)
              .eq('user_id', user.id)
              .single();

            userVote = userVoteData?.vote_type || null;
          }

          return {
            ...project,
            upvotes,
            downvotes,
            userVote
          };
        })
      );

      setProjects(projectsWithVotes);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('فشل في تحميل المشاريع');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (projectId: string, voteType: 'upvote' | 'downvote') => {
    if (!user) {
      toast.error('يجب تسجيل الدخول للتصويت');
      return;
    }

    setSubmittingVote(true);
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      // Check if user already voted
      if (project.userVote) {
        // Delete existing vote
        const { error: deleteError } = await supabase
          .from('project_votes')
          .delete()
          .eq('project_id', projectId)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;

        // If voting for the same option, just remove the vote
        if (project.userVote === voteType) {
          setProjects(prev => prev.map(p => 
            p.id === projectId 
              ? {
                  ...p,
                  [voteType === 'upvote' ? 'upvotes' : 'downvotes']: Math.max(0, (voteType === 'upvote' ? p.upvotes : p.downvotes) - 1),
                  userVote: null
                }
              : p
          ));
          toast.success('تم إلغاء تصويتك');
          return;
        }
      }

      // Add new vote
      const { error: insertError } = await supabase
        .from('project_votes')
        .insert([
          {
            project_id: projectId,
            user_id: user.id,
            vote_type: voteType
          }
        ]);

      if (insertError) throw insertError;

      // Update local state
      setProjects(prev => prev.map(p => 
        p.id === projectId 
          ? {
              ...p,
              upvotes: voteType === 'upvote' ? p.upvotes + 1 : (project.userVote === 'upvote' ? Math.max(0, p.upvotes - 1) : p.upvotes),
              downvotes: voteType === 'downvote' ? p.downvotes + 1 : (project.userVote === 'downvote' ? Math.max(0, p.downvotes - 1) : p.downvotes),
              userVote: voteType
            }
          : p
      ));

      toast.success(`تم تسجيل ${voteType === 'upvote' ? 'تأييدك' : 'رفضك'} للمشروع`);
    } catch (error) {
      console.error('Vote error:', error);
      toast.error('حدث خطأ أثناء التصويت');
    } finally {
      setSubmittingVote(false);
    }
  };

  const daysRemaining = (deadline: string) => {
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  const getVotePercentage = (votes: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((votes / total) * 100);
  };

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      'البنية التحتية': 'bg-blue-100 text-blue-800',
      'الخدمات العامة': 'bg-purple-100 text-purple-800',
      'الخدمات الأساسية': 'bg-green-100 text-green-800',
      'التعليم والثقافة': 'bg-yellow-100 text-yellow-800',
      'الصحة والرعاية الاجتماعية': 'bg-red-100 text-red-800',
      'البيئة والتشجير': 'bg-emerald-100 text-emerald-800',
      'الرياضة والترفيه': 'bg-orange-100 text-orange-800',
      'الأمان والسلامة': 'bg-indigo-100 text-indigo-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Vote className="w-6 h-6 text-primary" />
            التصويت على المشاريع المقترحة
          </h2>
          <p className="text-muted-foreground">صوتك مهم - ساعد في اختيار المشاريع التي ستطور دائرتك</p>
        </div>
        <Badge variant="outline" className="px-3 py-1 gap-1">
          <Users className="w-4 h-4" />
          ديمقراطية تشاركية
        </Badge>
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
            <p className="text-muted-foreground">لا توجد مشاريع قيد التصويت حالياً</p>
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
              <Card className="overflow-hidden border-l-4 border-l-primary hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getCategoryBadgeColor(project.category)}>
                          {project.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <Clock className="w-3 h-3 ml-1" />
                          {daysRemaining(project.voting_deadline)} أيام متبقية
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

                  {/* Vote Stats */}
                  <div className="space-y-3 pt-2">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold flex items-center gap-1">
                          <ThumbsUp className="w-4 h-4 text-emerald-600" />
                          أؤيد المشروع
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {project.upvotes} ({getVotePercentage(project.upvotes, project.upvotes + project.downvotes)}%)
                        </span>
                      </div>
                      <Progress 
                        value={getVotePercentage(project.upvotes, project.upvotes + project.downvotes)} 
                        className="h-2 bg-emerald-100"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold flex items-center gap-1">
                          <ThumbsDown className="w-4 h-4 text-red-600" />
                          لا أؤيد المشروع
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {project.downvotes} ({getVotePercentage(project.downvotes, project.upvotes + project.downvotes)}%)
                        </span>
                      </div>
                      <Progress 
                        value={getVotePercentage(project.downvotes, project.upvotes + project.downvotes)} 
                        className="h-2 bg-red-100"
                      />
                    </div>

                    <div className="text-xs text-muted-foreground text-center pt-1">
                      إجمالي الأصوات: {project.upvotes + project.downvotes}
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="bg-muted/10 border-t pt-4 flex gap-2">
                  <Button
                    variant={project.userVote === 'upvote' ? 'default' : 'outline'}
                    onClick={() => handleVote(project.id, 'upvote')}
                    disabled={submittingVote}
                    className="flex-1 gap-2"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    أؤيد
                  </Button>
                  <Button
                    variant={project.userVote === 'downvote' ? 'destructive' : 'outline'}
                    onClick={() => handleVote(project.id, 'downvote')}
                    disabled={submittingVote}
                    className="flex-1 gap-2"
                  >
                    <ThumbsDown className="w-4 h-4" />
                    لا أؤيد
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
