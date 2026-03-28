import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Lightbulb,
  Plus,
  Share2,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface CrowdfundingProject {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  targetAmount: number;
  raisedAmount: number;
  contributors: number;
  deadline: string;
  image: string;
  status: 'active' | 'completed' | 'failed';
  impact: string;
}

export const MicroCrowdfundingPlatform: React.FC = () => {
  const [projects, setProjects] = useState<CrowdfundingProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<CrowdfundingProject | null>(null);
  const [contributionAmount, setContributionAmount] = useState<number>(100);

  const mockProjects: CrowdfundingProject[] = [
    {
      id: 'proj-1',
      title: 'إضاءة شارع الجمهورية - المرحلة الثانية',
      description: 'تركيب 20 عمود إنارة LED موفرة للطاقة في شارع الجمهورية لتحسين الأمان الليلي',
      category: 'البنية التحتية',
      location: 'شارع الجمهورية - الحي الأول',
      targetAmount: 50000,
      raisedAmount: 38500,
      contributors: 342,
      deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      image: '💡',
      status: 'active',
      impact: 'تحسين الأمان والإضاءة لـ 5,000 مواطن'
    },
    {
      id: 'proj-2',
      title: 'تطوير حديقة الحي الثالث',
      description: 'إعادة تأهيل حديقة الحي الثالث بإضافة ملعب رياضي وممشى صحي ومساحات خضراء',
      category: 'الخدمات العامة',
      location: 'حديقة الحي الثالث',
      targetAmount: 75000,
      raisedAmount: 62300,
      contributors: 521,
      deadline: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000).toISOString(),
      image: '🌳',
      status: 'active',
      impact: 'توفير مساحة ترفيهية آمنة لـ 8,000 طفل'
    },
    {
      id: 'proj-3',
      title: 'إصلاح شبكة الصرف الصحي - شارع النيل',
      description: 'إصلاح وتطوير شبكة الصرف الصحي القديمة التي تسبب فيضانات متكررة',
      category: 'الخدمات الأساسية',
      location: 'شارع النيل - الحي الثاني',
      targetAmount: 120000,
      raisedAmount: 95700,
      contributors: 678,
      deadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
      image: '🔧',
      status: 'active',
      impact: 'منع الفيضانات والأمراض لـ 12,000 مواطن'
    },
    {
      id: 'proj-4',
      title: 'مكتبة مجتمعية بالحي الرابع',
      description: 'إنشاء مكتبة مجتمعية مجانية توفر كتب وأجهزة كمبيوتر للطلاب والباحثين',
      category: 'التعليم والثقافة',
      location: 'الحي الرابع - مركز الشباب',
      targetAmount: 45000,
      raisedAmount: 45000,
      contributors: 289,
      deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      image: '📚',
      status: 'completed',
      impact: 'توفير مصادر تعليمية لـ 3,000 طالب'
    }
  ];

  const [allProjects] = useState(mockProjects);

  const contribute = (project: CrowdfundingProject) => {
    if (contributionAmount < 10) {
      toast.error('الحد الأدنى للمساهمة 10 جنيهات');
      return;
    }
    toast.success(`شكراً لمساهمتك بـ ${contributionAmount} جنيه في مشروع "${project.title}"`);
    setSelectedProject(null);
    setContributionAmount(100);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'البنية التحتية': return '🏗️';
      case 'الخدمات العامة': return '🏛️';
      case 'الخدمات الأساسية': return '💧';
      case 'التعليم والثقافة': return '📖';
      default: return '💰';
    }
  };

  const getProgressPercentage = (raised: number, target: number) => {
    return Math.min((raised / target) * 100, 100);
  };

  const daysRemaining = (deadline: string) => {
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Coins className="w-6 h-6 text-amber-600" />
            التمويل الجماعي للمشاريع الصغرى (Micro-Crowdfunding)
          </h2>
          <p className="text-muted-foreground">شارك في تمويل مشاريع الدائرة بمساهمات صغيرة وراقب التنفيذ</p>
        </div>
        <Button className="gap-2 bg-amber-600 hover:bg-amber-700">
          <Plus className="w-4 h-4" />
          اقترح مشروعاً جديداً
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-600 font-bold uppercase">إجمالي المشاريع</p>
                <p className="text-2xl font-bold text-amber-900 mt-1">{allProjects.length}</p>
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
                <p className="text-2xl font-bold text-emerald-900 mt-1">241.5K</p>
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
                <p className="text-2xl font-bold text-blue-900 mt-1">1,830</p>
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
                <p className="text-xs text-purple-600 font-bold uppercase">المشاريع المنجزة</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">1</p>
              </div>
              <div className="w-10 h-10 bg-purple-200 rounded-lg flex items-center justify-center text-lg">
                ✅
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-amber-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">المشاريع النشطة</CardTitle>
          <CardDescription>اختر مشروعاً وساهم في تطوير دائرتك</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {allProjects.filter(p => p.status === 'active').map((project, idx) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="border rounded-xl p-4 hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedProject(project)}
              >
                <div className="flex items-start gap-4 mb-3">
                  <div className="text-4xl">{project.image}</div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm mb-1">{project.title}</h4>
                    <p className="text-xs text-muted-foreground mb-2">{project.description}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">
                        {getCategoryIcon(project.category)} {project.category}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        <MapPin className="w-3 h-3 ml-1" /> {project.location}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        <Calendar className="w-3 h-3 ml-1" /> {daysRemaining(project.deadline)} يوم متبقي
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm text-amber-600">{project.raisedAmount.toLocaleString()} ج.م</div>
                    <div className="text-xs text-muted-foreground">من {project.targetAmount.toLocaleString()}</div>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  <Progress value={getProgressPercentage(project.raisedAmount, project.targetAmount)} className="h-2 bg-amber-100" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{Math.round(getProgressPercentage(project.raisedAmount, project.targetAmount))}% مكتمل</span>
                    <span>{project.contributors} مساهم</span>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-lg p-2 text-xs text-amber-700">
                  <Lightbulb className="w-3 h-3 inline ml-1" />
                  <strong>التأثير:</strong> {project.impact}
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedProject && (
        <Card className="border-amber-100 bg-amber-50/30 shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="text-3xl">{selectedProject.image}</span>
                  {selectedProject.title}
                </CardTitle>
                <CardDescription className="mt-2">{selectedProject.description}</CardDescription>
              </div>
              <Badge className="bg-amber-100 text-amber-700 border-amber-200">نشط</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1">الهدف المالي</p>
                <p className="text-2xl font-bold text-amber-600">{selectedProject.targetAmount.toLocaleString()} ج.م</p>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1">المبلغ المجمع</p>
                <p className="text-2xl font-bold text-emerald-600">{selectedProject.raisedAmount.toLocaleString()} ج.م</p>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1">عدد المساهمين</p>
                <p className="text-2xl font-bold text-blue-600">{selectedProject.contributors}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1">الوقت المتبقي</p>
                <p className="text-2xl font-bold text-purple-600">{daysRemaining(selectedProject.deadline)} يوم</p>
              </div>
            </div>

            <div className="bg-white border rounded-lg p-4">
              <p className="text-sm font-bold mb-3">حدد مبلغ المساهمة</p>
              <div className="flex items-center gap-2 mb-3">
                <input 
                  type="number" 
                  min="10" 
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(Number(e.target.value))}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm"
                />
                <span className="text-sm font-bold">ج.م</span>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setContributionAmount(100)}
                  variant="outline"
                  className="text-xs"
                >
                  100
                </Button>
                <Button 
                  onClick={() => setContributionAmount(250)}
                  variant="outline"
                  className="text-xs"
                >
                  250
                </Button>
                <Button 
                  onClick={() => setContributionAmount(500)}
                  variant="outline"
                  className="text-xs"
                >
                  500
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-amber-50/50 border-t gap-2">
            <Button 
              onClick={() => contribute(selectedProject)}
              className="gap-2 bg-amber-600 hover:bg-amber-700 flex-1"
            >
              <Heart className="w-4 h-4" />
              ساهم بـ {contributionAmount} جنيه
            </Button>
            <Button variant="outline" className="gap-2">
              <Share2 className="w-4 h-4" />
              شارك
            </Button>
          </CardFooter>
        </Card>
      )}

      <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 flex gap-3 items-start">
        <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 leading-relaxed">
          <strong>التمويل الجماعي الذكي:</strong> بدلاً من انتظار الحكومة، المواطنون يمولون الإصلاحات مباشرة. كل مساهم يصبح "مراقباً" للمشروع ويتلقى تحديثات لحظية عن التنفيذ. هذا يحول المواطن من "منتظر" إلى "شريك حقيقي".
        </p>
      </div>
    </div>
  );
};
