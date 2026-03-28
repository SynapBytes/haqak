import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  Vote, 
  Layers, 
  Mic, 
  Trophy, 
  ShieldCheck, 
  FileBarChart,
  Sparkles,
  ArrowRight,
  LayoutDashboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

// Import our 7 genius components
import { PredictiveCrisisEngine } from '@/components/PredictiveCrisisEngine';
import { ConsultativeVotingSystem } from '@/components/ConsultativeVotingSystem';
import { ConstituencyDigitalTwin } from '@/components/ConstituencyDigitalTwin';
import { VoiceAssistantAI } from '@/components/VoiceAssistantAI';
import { CitizenRewardsSystem } from '@/components/CitizenRewardsSystem';
import { CitizenProxyIntegrator } from '@/components/CitizenProxyIntegrator';
import { ServiceGapAnalytics } from '@/components/ServiceGapAnalytics';

// Import our 5 advanced revolutionary components
import { BlockchainAccountabilityLedger } from '@/components/BlockchainAccountabilityLedger';
import { AILegislativeDrafter } from '@/components/AILegislativeDrafter';
import { MicroCrowdfundingPlatform } from '@/components/MicroCrowdfundingPlatform';
import { BiometricIdentityVerification } from '@/components/BiometricIdentityVerification';
import { DroneAINeedsRadar } from '@/components/DroneAINeedsRadar';
import { SmartWarRoomDashboard } from '@/components/SmartWarRoomDashboard';

const GeniusEnhancements = () => {
  const [activeTab, setActiveTab] = useState('predictive');

  const enhancements = [
    // Phase 1: 7 Genius Enhancements
    { id: 'predictive', name: 'محرك التنبؤ', icon: <TrendingUp className="w-4 h-4" />, color: 'text-orange-600' },
    { id: 'voting', name: 'التصويت الرقمي', icon: <Vote className="w-4 h-4" />, color: 'text-primary' },
    { id: 'twin', name: 'التوأم الرقمي', icon: <Layers className="w-4 h-4" />, color: 'text-indigo-600' },
    { id: 'voice', name: 'مساعد النائب', icon: <Mic className="w-4 h-4" />, color: 'text-rose-600' },
    { id: 'rewards', name: 'نظام المكافآت', icon: <Trophy className="w-4 h-4" />, color: 'text-amber-500' },
    { id: 'proxy', name: 'تكامل البيانات', icon: <ShieldCheck className="w-4 h-4" />, color: 'text-emerald-600' },
    { id: 'gap', name: 'تحليل الفجوة', icon: <FileBarChart className="w-4 h-4" />, color: 'text-blue-600' },
    // Phase 2: 5 Revolutionary Advanced Features
    { id: 'blockchain', name: 'البلوكشين', icon: <Sparkles className="w-4 h-4" />, color: 'text-purple-600' },
    { id: 'legislative', name: 'الصياغة التشريعية', icon: <Sparkles className="w-4 h-4" />, color: 'text-indigo-600' },
    { id: 'crowdfunding', name: 'التمويل الجماعي', icon: <Sparkles className="w-4 h-4" />, color: 'text-amber-600' },
    { id: 'biometric', name: 'الهوية البيومترية', icon: <Sparkles className="w-4 h-4" />, color: 'text-emerald-600' },
    { id: 'drone', name: 'رادار الدرونز', icon: <Sparkles className="w-4 h-4" />, color: 'text-cyan-600' },
    { id: 'warroom', name: 'غرفة العمليات', icon: <Sparkles className="w-4 h-4" />, color: 'text-purple-600' },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Sparkles className="w-6 h-6 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight">التحسينات العبقرية <span className="text-primary">Sutak</span></h1>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Genius Enhancements v1.0</p>
            </div>
          </div>
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowRight className="w-4 h-4" />
              العودة للرئيسية
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Welcome Card */}
          <Card className="mb-8 border-none bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <CardHeader className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-primary hover:bg-primary text-white border-none">جديد</Badge>
                <span className="text-slate-400 text-sm">7 تحسينات ثورية لمستقبل العمل البرلماني</span>
              </div>
              <CardTitle className="text-3xl md:text-4xl font-black leading-tight">
                تحويل <span className="text-primary">Sutak</span> إلى العقل المفكر للدائرة
              </CardTitle>
              <CardDescription className="text-slate-300 text-lg max-w-2xl mt-2">
                لقد قمنا بدمج أحدث تقنيات الذكاء الاصطناعي، النمذجة الإحصائية، وأنظمة المكافآت لتقديم تجربة ديمقراطية تشاركية فريدة من نوعها.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10 flex gap-4 pt-0">
               <div className="flex -space-x-reverse space-x-2">
                 {enhancements.map((e) => (
                   <div key={e.id} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20 backdrop-blur-sm">
                     {e.icon}
                   </div>
                 ))}
               </div>
               <div className="text-sm text-slate-400 self-center">تم تفعيل كافة الأنظمة الذكية</div>
            </CardContent>
          </Card>

          {/* Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex overflow-x-auto pb-4 mb-6 no-scrollbar">
              <TabsList className="h-auto p-1 bg-white border shadow-sm flex-nowrap">
                {enhancements.map((e) => (
                  <TabsTrigger 
                    key={e.id} 
                    value={e.id}
                    className="flex flex-col items-center gap-1 py-3 px-4 min-w-[100px] data-[state=active]:bg-slate-50 data-[state=active]:shadow-none"
                 <TabsTrigger value="gap">
                <div className={`${e.color} p-1.5 rounded-lg bg-white shadow-sm border`}>
                  {e.icon}
                </div>
                <span className="text-[11px] font-bold mt-1">{e.name}</span>
              </TabsTrigger>
              {enhancements.length > 7 && (
                <>
                  <TabsTrigger value="blockchain">
                    <div className={`${enhancements[7].color} p-1.5 rounded-lg bg-white shadow-sm border`}>
                      {enhancements[7].icon}
                    </div>
                    <span className="text-[11px] font-bold mt-1">{enhancements[7].name}</span>
                  </TabsTrigger>
                  <TabsTrigger value="legislative">
                    <div className={`${enhancements[8].color} p-1.5 rounded-lg bg-white shadow-sm border`}>
                      {enhancements[8].icon}
                    </div>
                    <span className="text-[11px] font-bold mt-1">{enhancements[8].name}</span>
                  </TabsTrigger>
                  <TabsTrigger value="crowdfunding">
                    <div className={`${enhancements[9].color} p-1.5 rounded-lg bg-white shadow-sm border`}>
                      {enhancements[9].icon}
                    </div>
                    <span className="text-[11px] font-bold mt-1">{enhancements[9].name}</span>
                  </TabsTrigger>
                  <TabsTrigger value="biometric">
                    <div className={`${enhancements[10].color} p-1.5 rounded-lg bg-white shadow-sm border`}>
                      {enhancements[10].icon}
                    </div>
                    <span className="text-[11px] font-bold mt-1">{enhancements[10].name}</span>
                  </TabsTrigger>
                  <TabsTrigger value="drone">
                    <div className={`${enhancements[11].color} p-1.5 rounded-lg bg-white shadow-sm border`}>
                      {enhancements[11].icon}
                    </div>
                    <span className="text-[11px] font-bold mt-1">{enhancements[11].name}</span>
                  </TabsTrigger>
                  <TabsTrigger value="warroom">
                    <div className={`${enhancements[12].color} p-1.5 rounded-lg bg-white shadow-sm border`}>
                      {enhancements[12].icon}
                    </div>
                    <span className="text-[11px] font-bold mt-1">{enhancements[12].name}</span>
                  </TabsTrigger>
                </>
              )}              ))}
              </TabsList>
            </div>

            {/* Tab Contents */}
            <div className="mt-2 animate-in fade-in duration-500">
              <TabsContent value="predictive">
                <PredictiveCrisisEngine />
              </TabsContent>
              <TabsContent value="voting">
                <ConsultativeVotingSystem />
              </TabsContent>
              <TabsContent value="twin">
                <ConstituencyDigitalTwin />
              </TabsContent>
              <TabsContent value="voice">
                <VoiceAssistantAI />
              </TabsContent>
              <TabsContent value="rewards">
                <CitizenRewardsSystem />
              </TabsContent>
              <TabsContent value="proxy">
                <CitizenProxyIntegrator />
              </TabsContent>
              <TabsContent value="gap">
                <ServiceGapAnalytics />
              </TabsContent>
              <TabsContent value="blockchain">
                <BlockchainAccountabilityLedger />
              </TabsContent>
              <TabsContent value="legislative">
                <AILegislativeDrafter />
              </TabsContent>
              <TabsContent value="crowdfunding">
                <MicroCrowdfundingPlatform />
              </TabsContent>
              <TabsContent value="biometric">
                <BiometricIdentityVerification />
              </TabsContent>
              <TabsContent value="drone">
                <DroneAINeedsRadar />
              </TabsContent>
              <TabsContent value="warroom">
                <SmartWarRoomDashboard />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 left-6 z-50">
        <Button className="rounded-full w-14 h-14 shadow-2xl bg-primary hover:bg-primary/90 flex items-center justify-center p-0">
          <LayoutDashboard className="w-6 h-6 text-white" />
        </Button>
      </div>
    </div>
  );
};

const Badge = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${className}`}>
    {children}
  </span>
);

export default GeniusEnhancements;
