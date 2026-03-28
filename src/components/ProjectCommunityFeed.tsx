import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Newspaper,
  MapPin,
  Calendar,
  Users,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MessageSquare,
  Share2,
  Heart,
  Eye,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

interface ProjectUpdate {
  id: string;
  project_id: string;
  project_title: string;
  project_status: string;
  update_type: 'proposal_submitted' | 'voting_started' | 'voting_ended' | 'funding_started' | 'milestone_completed' | 'project_completed' | 'project_cancelled';
  title: string;
  description: string;
  image_url?: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  user_liked?: boolean;
}

const UPDATE_TYPE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  'proposal_submitted': { label: 'مقترح جديد', color: 'bg-blue-100 text-blue-800', icon: '💡' },
  'voting_started': { label: 'بدء التصويت', color: 'bg-purple-100 text-purple-800', icon: '🗳️' },
  'voting_ended': { label: 'انتهى التصويت', color: 'bg-indigo-100 text-indigo-800', icon: '✅' },
  'funding_started': { label: 'بدء التمويل', color: 'bg-amber-100 text-amber-800', icon: '💰' },
  'milestone_completed': { label: 'مرحلة منجزة', color: 'bg-emerald-100 text-emerald-800', icon: '🎯' },
  'project_completed': { label: 'مشروع منجز', color: 'bg-green-100 text-green-800', icon: '🏆' },
  'project_cancelled': { label: 'مشروع ملغى', color: 'bg-red-100 text-red-800', icon: '❌' }
};

export const ProjectCommunityFeed: React.FC = () => {
  const { user } = useAuth();
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent');

  useEffect(() => {
    fetchUpdates();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('project_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_updates'
        },
        () => {
          fetchUpdates();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUpdates = async () => {
    try {
      setLoading(true);

      // Fetch project updates (we'll create this table in the migration)
      // For now, we'll simulate data from project_proposals
      const { data: projectsData, error: projectsError } = await supabase
        .from('project_proposals')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(20);

      if (projectsError) throw projectsError;

      // Transform projects into updates
      const transformedUpdates: ProjectUpdate[] = (projectsData || []).map((project, idx) => ({
        id: project.id,
        project_id: project.id,
        project_title: project.title,
        project_status: project.status,
        update_type: getUpdateType(project.status),
        title: getUpdateTitle(project.status, project.title),
        description: project.ai_refined_description || project.description,
        created_at: project.updated_at,
        likes_count: Math.floor(Math.random() * 100),
        comments_count: Math.floor(Math.random() * 20),
        user_liked: false
      }));

      setUpdates(transformedUpdates);
    } catch (error) {
      console.error('Error fetching updates:', error);
      toast.error('فشل في تحميل التحديثات');
    } finally {
      setLoading(false);
    }
  };

  const getUpdateType = (status: string): ProjectUpdate['update_type'] => {
    const typeMap: Record<string, ProjectUpdate['update_type']> = {
      'pending_review': 'proposal_submitted',
      'voting_active': 'voting_started',
      'voting_failed': 'voting_ended',
      'funding_active': 'funding_started',
      'funding_completed': 'funding_started',
      'in_progress': 'milestone_completed',
      'completed': 'project_completed',
      'cancelled': 'project_cancelled'
    };
    return typeMap[status] || 'proposal_submitted';
  };

  const getUpdateTitle = (status: string, projectTitle: string): string => {
    const titles: Record<string, string> = {
      'pending_review': `تم اقتراح مشروع جديد: ${projectTitle}`,
      'voting_active': `بدأ التصويت على: ${projectTitle}`,
      'voting_failed': `انتهى التصويت على: ${projectTitle}`,
      'funding_active': `بدأ جمع التبرعات لـ: ${projectTitle}`,
      'funding_completed': `اكتملت الميزانية لـ: ${projectTitle}`,
      'in_progress': `بدأ تنفيذ: ${projectTitle}`,
      'completed': `اكتمل المشروع: ${projectTitle}`,
      'cancelled': `تم إلغاء: ${projectTitle}`
    };
    return titles[status] || projectTitle;
  };

  const handleLike = async (updateId: string) => {
    if (!user) {
      toast.error('يجب تسجيل الدخول لتقييم التحديث');
      return;
    }

    setUpdates(prev => prev.map(update =>
      update.id === updateId
        ? {
            ...update,
            likes_count: update.user_liked ? update.likes_count - 1 : update.likes_count + 1,
            user_liked: !update.user_liked
          }
        : update
    ));
  };

  const filteredUpdates = updates.filter(update => {
    if (filter === 'all') return true;
    return update.update_type === filter;
  });

  const sortedUpdates = [...filteredUpdates].sort((a, b) => {
    if (sortBy === 'recent') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else {
      return b.likes_count - a.likes_count;
    }
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} أيام`;
    return date.toLocaleDateString('ar-EG');
  };

  return (\n    <div className=\"space-y-6\" dir=\"rtl\">\n      <div className=\"flex items-center justify-between\">\n        <div>\n          <h2 className=\"text-2xl font-bold flex items-center gap-2\">\n            <Newspaper className=\"w-6 h-6 text-primary\" />\n            مجتمع المشاريع\n          </h2>\n          <p className=\"text-muted-foreground\">تابع آخر التحديثات والمستجدات على المشاريع المجتمعية</p>\n        </div>\n      </div>\n\n      {/* Filter and Sort Controls */}\n      <Card>\n        <CardContent className=\"pt-6\">\n          <div className=\"flex flex-col md:flex-row gap-4\">\n            <div className=\"flex-1\">\n              <label className=\"text-sm font-semibold mb-2 block\">تصفية حسب النوع:</label>\n              <select\n                value={filter}\n                onChange={(e) => setFilter(e.target.value)}\n                className=\"w-full px-3 py-2 border border-input rounded-md text-sm\"\n              >\n                <option value=\"all\">جميع التحديثات</option>\n                {Object.entries(UPDATE_TYPE_LABELS).map(([key, { label }]) => (\n                  <option key={key} value={key}>{label}</option>\n                ))}\n              </select>\n            </div>\n            <div className=\"flex-1\">\n              <label className=\"text-sm font-semibold mb-2 block\">ترتيب حسب:</label>\n              <select\n                value={sortBy}\n                onChange={(e) => setSortBy(e.target.value as 'recent' | 'popular')}\n                className=\"w-full px-3 py-2 border border-input rounded-md text-sm\"\n              >\n                <option value=\"recent\">الأحدث أولاً</option>\n                <option value=\"popular\">الأكثر تفاعلاً</option>\n              </select>\n            </div>\n          </div>\n        </CardContent>\n      </Card>\n\n      {/* Updates Feed */}\n      {loading ? (\n        <Card>\n          <CardContent className=\"pt-6 flex flex-col items-center justify-center py-12\">\n            <Loader2 className=\"w-8 h-8 animate-spin text-primary mb-4\" />\n            <p className=\"text-muted-foreground\">جاري تحميل التحديثات...</p>\n          </CardContent>\n        </Card>\n      ) : sortedUpdates.length === 0 ? (\n        <Card>\n          <CardContent className=\"pt-6 flex flex-col items-center justify-center py-12\">\n            <Newspaper className=\"w-12 h-12 text-muted-foreground opacity-20 mb-4\" />\n            <p className=\"text-muted-foreground\">لا توجد تحديثات متطابقة مع معايير البحث</p>\n          </CardContent>\n        </Card>\n      ) : (\n        <div className=\"space-y-4\">\n          {sortedUpdates.map((update, idx) => {\n            const typeInfo = UPDATE_TYPE_LABELS[update.update_type];\n            return (\n              <motion.div\n                key={update.id}\n                initial={{ opacity: 0, y: 10 }}\n                animate={{ opacity: 1, y: 0 }}\n                transition={{ delay: idx * 0.05 }}\n              >\n                <Card className=\"overflow-hidden hover:shadow-lg transition-shadow\">\n                  <CardHeader className=\"pb-3\">\n                    <div className=\"flex justify-between items-start gap-4\">\n                      <div className=\"flex-1\">\n                        <div className=\"flex items-center gap-2 mb-2\">\n                          <span className=\"text-2xl\">{typeInfo.icon}</span>\n                          <Badge className={typeInfo.color}>{typeInfo.label}</Badge>\n                          <span className=\"text-xs text-muted-foreground\">{formatDate(update.created_at)}</span>\n                        </div>\n                        <CardTitle className=\"text-lg\">{update.title}</CardTitle>\n                      </div>\n                    </div>\n                  </CardHeader>\n\n                  <CardContent className=\"space-y-3\">\n                    <p className=\"text-sm text-muted-foreground\">{update.description}</p>\n\n                    {/* Engagement Stats */}\n                    <div className=\"flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t\">\n                      <button\n                        onClick={() => handleLike(update.id)}\n                        className=\"flex items-center gap-1 hover:text-primary transition-colors\"\n                      >\n                        <Heart\n                          className={`w-4 h-4 ${update.user_liked ? 'fill-current text-red-500' : ''}`}\n                        />\n                        {update.likes_count}\n                      </button>\n                      <div className=\"flex items-center gap-1\">\n                        <MessageSquare className=\"w-4 h-4\" />\n                        {update.comments_count}\n                      </div>\n                      <div className=\"flex items-center gap-1 ml-auto\">\n                        <Eye className=\"w-4 h-4\" />\n                        {Math.floor(Math.random() * 1000)}\n                      </div>\n                    </div>\n                  </CardContent>\n\n                  <div className=\"bg-muted/10 border-t px-6 py-3 flex gap-2\">\n                    <Button variant=\"ghost\" size=\"sm\" className=\"flex-1 gap-2\">\n                      <MessageSquare className=\"w-4 h-4\" />\n                      تعليق\n                    </Button>\n                    <Button variant=\"ghost\" size=\"sm\" className=\"flex-1 gap-2\">\n                      <Share2 className=\"w-4 h-4\" />\n                      مشاركة\n                    </Button>\n                  </div>\n                </Card>\n              </motion.div>\n            );\n          })}\n        </div>\n      )}\n    </div>\n  );\n};\n\nexport default ProjectCommunityFeed;\n
