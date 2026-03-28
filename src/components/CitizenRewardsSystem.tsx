import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Star, 
  Award, 
  Zap, 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  Gift, 
  ShieldCheck, 
  Medal,
  ChevronRight,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Achievement {
  id: string;
  title: string;
  description: string;
  points: number;
  icon: React.ReactNode;
  completed: boolean;
  progress: number;
}

interface LeaderboardUser {
  rank: number;
  name: string;
  points: number;
  level: number;
  avatar: string;
  isCurrentUser?: boolean;
}

export const CitizenRewardsSystem: React.FC = () => {
  const [userPoints, setUserPoints] = useState(1250);
  const [userLevel, setUserLevel] = useState(5);
  const [loading, setLoading] = useState(true);

  const achievements: Achievement[] = [
    { 
      id: '1', 
      title: 'المواطن المسؤول', 
      description: 'تقديم 5 شكاوى حقيقية تم حلها', 
      points: 500, 
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />, 
      completed: false, 
      progress: 80 
    },
    { 
      id: '2', 
      title: 'صانع الحلول', 
      description: 'تقديم مقترح بناء تم تنفيذه في الدائرة', 
      points: 1000, 
      icon: <Zap className="w-5 h-5 text-amber-500" />, 
      completed: true, 
      progress: 100 
    },
    { 
      id: '3', 
      title: 'المتطوع النشط', 
      description: 'المشاركة في 3 استطلاعات رأي متتالية', 
      points: 300, 
      icon: <Users className="w-5 h-5 text-blue-500" />, 
      completed: true, 
      progress: 100 
    },
    { 
      id: '4', 
      title: 'خبير الدائرة', 
      description: 'الوصول للمستوى 10 في التطبيق', 
      points: 2000, 
      icon: <Trophy className="w-5 h-5 text-purple-500" />, 
      completed: false, 
      progress: 50 
    }
  ];

  const leaderboard: LeaderboardUser[] = [
    { rank: 1, name: "أحمد محمد", points: 5400, level: 12, avatar: "👤" },
    { rank: 2, name: "سارة محمود", points: 4850, level: 10, avatar: "👤" },
    { rank: 3, name: "ياسين علي", points: 4200, level: 9, avatar: "👤" },
    { rank: 8, name: "أنت (المستخدم)", points: 1250, level: 5, avatar: "👤", isCurrentUser: true },
  ];

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const nextLevelPoints = 2000;
  const progressToNextLevel = (userPoints / nextLevelPoints) * 100;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" />
            نظام المكافآت (Gamification)
          </h2>
          <p className="text-muted-foreground">تحول من شاكي إلى شريك فعال في بناء دائرتك</p>
        </div>
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 p-2 rounded-xl px-4">
          <div className="text-right">
            <div className="text-xs text-amber-700 font-semibold">رصيد النقاط</div>
            <div className="text-xl font-bold text-amber-900">{userPoints.toLocaleString()}</div>
          </div>
          <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center shadow-inner">
            <Star className="w-6 h-6 text-white fill-white" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile & Level Card */}
        <Card className="lg:col-span-2 border-amber-100 shadow-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">مستوى المواطنة: ذهبي</CardTitle>
                <CardDescription className="text-amber-50/80">أنت ضمن أفضل 15% من المواطنين الفاعلين</CardDescription>
              </div>
              <Badge className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md">
                المستوى {userLevel}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span>التقدم للمستوى التالي</span>
                <span>{userPoints} / {nextLevelPoints} نقطة</span>
              </div>
              <Progress value={progressToNextLevel} className="h-3 bg-amber-100" />
              <p className="text-xs text-muted-foreground text-center">تبقي لك 750 نقطة للوصول للمستوى 6 وفتح ميزة "المقترح المباشر للنائب"</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <h3 className="text-sm font-bold col-span-full flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-amber-500" />
                الأوسمة والإنجازات
              </h3>
              {achievements.map((achievement) => (
                <div key={achievement.id} className={`p-4 rounded-xl border flex gap-4 transition-all ${achievement.completed ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100 opacity-80'}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${achievement.completed ? 'bg-white shadow-sm' : 'bg-slate-200'}`}>
                    {achievement.icon}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-bold">{achievement.title}</span>
                      {achievement.completed && <Badge className="bg-emerald-500 text-[10px] h-4">تم</Badge>}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight">{achievement.description}</p>
                    {!achievement.completed && (
                      <div className="pt-1">
                        <div className="flex justify-between text-[10px] mb-1">
                          <span>التقدم</span>
                          <span>{achievement.progress}%</span>
                        </div>
                        <Progress value={achievement.progress} className="h-1" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="bg-muted/10 border-t justify-center">
            <Button variant="ghost" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 gap-2">
              عرض كافة الأوسمة والمكافآت
              <ChevronRight className="w-4 h-4" />
            </Button>
          </CardFooter>
        </Card>

        {/* Leaderboard & Rewards */}
        <div className="space-y-6">
          <Card className="border-slate-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                لوحة الشرف للدائرة
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {leaderboard.map((user) => (
                  <div key={user.rank} className={`flex items-center justify-between p-4 ${user.isCurrentUser ? 'bg-amber-50/50' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-6 text-center font-bold text-sm ${user.rank <= 3 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                        {user.rank}
                      </div>
                      <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-lg">
                        {user.avatar}
                      </div>
                      <div>
                        <div className="text-sm font-bold">{user.name}</div>
                        <div className="text-[10px] text-muted-foreground">المستوى {user.level}</div>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-slate-700">{user.points.toLocaleString()} ن</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-indigo-600 text-white border-none shadow-lg">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Gift className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold">متجر المكافآت</h3>
                  <p className="text-xs text-indigo-100">استبدل نقاطك بمزايا حقيقية</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-white/10 rounded-lg text-xs">
                  <span>أولوية الرد على الشكوى</span>
                  <Badge className="bg-white text-indigo-600">500 ن</Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-white/10 rounded-lg text-xs">
                  <span>مقابلة خاصة مع النائب</span>
                  <Badge className="bg-white text-indigo-600">2000 ن</Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-white/10 rounded-lg text-xs">
                  <span>شهادة "مواطن فاعل" معتمدة</span>
                  <Badge className="bg-white text-indigo-600">1000 ن</Badge>
                </div>
              </div>
              <Button className="w-full bg-white text-indigo-600 hover:bg-indigo-50 font-bold">تصفح المتجر</Button>
            </CardContent>
          </Card>

          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex gap-3 items-start">
            <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-700 leading-relaxed">
              <strong>نظام التحقق الذكي:</strong> يتم احتساب النقاط فقط للشكاوى التي يتم التحقق من صحتها ميدانياً أو عبر الذكاء الاصطناعي لضمان نزاهة النظام.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
