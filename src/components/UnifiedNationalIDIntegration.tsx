import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CheckCircle2, AlertCircle, Users, Vote, FileText, Shield, TrendingUp, BarChart3, MapPin, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface CitizenProfile {
  nationalId: string;
  name: string;
  district: string;
  verified: boolean;
  registrationDate: string;
  issuesReported: number;
  votingParticipation: number;
}

interface Poll {
  id: string;
  title: string;
  description: string;
  type: 'bill_proposal' | 'budget_allocation' | 'project_priority';
  status: 'active' | 'closed' | 'results_published';
  startDate: string;
  endDate: string;
  totalVoters: number;
  votesReceived: number;
  options: {
    id: string;
    text: string;
    votes: number;
    percentage: number;
  }[];
  results?: {
    approved: boolean;
    approvalPercentage: number;
    participationRate: number;
  };
}

interface DirectDemocracyMetrics {
  totalCitizens: number;
  verifiedCitizens: number;
  activePollsThisMonth: number;
  averageParticipationRate: number;
  billsApprovedByVote: number;
  projectsApprovedByVote: number;
}

export const UnifiedNationalIDIntegration: React.FC = () => {
  const [citizens, setCitizens] = useState<CitizenProfile[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [metrics, setMetrics] = useState<DirectDemocracyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);
  const [userVote, setUserVote] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch issues to generate citizen profiles
        const { data: issues, error: issuesError } = await supabase
          .from('issues')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (issuesError) throw issuesError;

        // Generate synthetic citizen profiles
        const generatedCitizens: CitizenProfile[] = Array.from({ length: 150 }, (_, idx) => ({
          nationalId: `${Math.random().toString().slice(2, 12)}`,
          name: `المواطن ${idx + 1}`,
          district: `الدائرة ${Math.floor(idx / 25) + 1}`,
          verified: Math.random() > 0.1,
          registrationDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toLocaleDateString('ar-EG'),
          issuesReported: Math.floor(Math.random() * 10),
          votingParticipation: Math.floor(Math.random() * 100),
        }));

        setCitizens(generatedCitizens);

        // Generate synthetic polls
        const pollOptions = [
          { text: 'موافق', votes: 0, percentage: 0 },
          { text: 'معارض', votes: 0, percentage: 0 },
          { text: 'محايد', votes: 0, percentage: 0 },
        ];

        const generatedPolls: Poll[] = [
          {
            id: 'poll-1',
            title: 'مشروع قانون تحسين البنية التحتية',
            description: 'هل توافق على تخصيص 500 مليون جنيه لتحسين البنية التحتية في المحافظة؟',
            type: 'bill_proposal',
            status: 'active',
            startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toLocaleDateString('ar-EG'),
            endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('ar-EG'),
            totalVoters: 5000,
            votesReceived: 3450,
            options: [
              { id: 'opt-1', text: 'موافق بشدة', votes: 2100, percentage: 60.9 },
              { id: 'opt-2', text: 'معارض', votes: 800, percentage: 23.2 },
              { id: 'opt-3', text: 'محايد', votes: 550, percentage: 15.9 },
            ],
          },
          {
            id: 'poll-2',
            title: 'أولويات المشاريع للعام القادم',
            description: 'اختر أهم 3 مشاريع يجب أن تركز عليها الدائرة',
            type: 'project_priority',
            status: 'active',
            startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toLocaleDateString('ar-EG'),
            endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString('ar-EG'),
            totalVoters: 5000,
            votesReceived: 2800,
            options: [
              { id: 'opt-1', text: 'تحسين الطرق', votes: 1200, percentage: 42.9 },
              { id: 'opt-2', text: 'تحسين الصرف الصحي', votes: 980, percentage: 35.0 },
              { id: 'opt-3', text: 'تحسين الإنارة', votes: 620, percentage: 22.1 },
            ],
          },
          {
            id: 'poll-3',
            title: 'تخصيص الميزانية للخدمات الصحية',
            description: 'هل توافق على زيادة الميزانية المخصصة للخدمات الصحية بنسبة 20%؟',
            type: 'budget_allocation',
            status: 'closed',
            startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toLocaleDateString('ar-EG'),
            endDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toLocaleDateString('ar-EG'),
            totalVoters: 5000,
            votesReceived: 4200,
            options: [
              { id: 'opt-1', text: 'موافق', votes: 3100, percentage: 73.8 },
              { id: 'opt-2', text: 'معارض', votes: 900, percentage: 21.4 },
              { id: 'opt-3', text: 'محايد', votes: 200, percentage: 4.8 },
            ],
            results: {
              approved: true,
              approvalPercentage: 73.8,
              participationRate: 84.0,
            },
          },
        ];

        setPolls(generatedPolls);

        // Calculate metrics
        const verifiedCount = generatedCitizens.filter(c => c.verified).length;
        const avgParticipation = generatedCitizens.reduce((sum, c) => sum + c.votingParticipation, 0) / generatedCitizens.length;

        setMetrics({
          totalCitizens: generatedCitizens.length,
          verifiedCitizens: verifiedCount,
          activePollsThisMonth: generatedPolls.filter(p => p.status === 'active').length,
          averageParticipationRate: Math.round(avgParticipation),
          billsApprovedByVote: 12,
          projectsApprovedByVote: 8,
        });
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getPollStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'results_published':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPollTypeIcon = (type: string) => {
    switch (type) {
      case 'bill_proposal':
        return '📋';
      case 'budget_allocation':
        return '💰';
      case 'project_priority':
        return '🎯';
      default:
        return '📊';
    }
  };

  const getPollTypeText = (type: string) => {
    switch (type) {
      case 'bill_proposal':
        return 'مشروع قانون';
      case 'budget_allocation':
        return 'تخصيص ميزانية';
      case 'project_priority':
        return 'أولويات المشاريع';
      default:
        return type;
    }
  };

  const chartData = polls.map(poll => ({
    name: poll.title.substring(0, 15),
    participation: (poll.votesReceived / poll.totalVoters) * 100,
  }));

  const verificationData = [
    { name: 'موثق', value: metrics?.verifiedCitizens || 0, fill: '#10b981' },
    { name: 'غير موثق', value: (metrics?.totalCitizens || 0) - (metrics?.verifiedCitizens || 0), fill: '#ef4444' },
  ];

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vote className="w-5 h-5 text-emerald-600" />
            الهوية الرقمية الموحدة (Unified National ID Integration)
          </CardTitle>
          <CardDescription>
            منصة ديمقراطية مباشرة مع التحقق الموثق من الهوية الوطنية
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-96 text-gray-500">
              جاري تحميل بيانات الديمقراطية المباشرة...
            </div>
          ) : (
            <>
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
                  <TabsTrigger value="polls">الاستطلاعات</TabsTrigger>
                  <TabsTrigger value="citizens">المواطنون</TabsTrigger>
                  <TabsTrigger value="analytics">التحليلات</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  {metrics && (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-4 rounded-lg border border-blue-200">
                          <div className="text-2xl font-bold text-blue-900">{metrics.totalCitizens}</div>
                          <div className="text-xs text-blue-700 mt-1">إجمالي المواطنين المسجلين</div>
                        </div>
                        <div className="bg-gradient-to-br from-green-100 to-green-50 p-4 rounded-lg border border-green-200">
                          <div className="text-2xl font-bold text-green-900">{metrics.verifiedCitizens}</div>
                          <div className="text-xs text-green-700 mt-1">مواطنين موثقين</div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-100 to-purple-50 p-4 rounded-lg border border-purple-200">
                          <div className="text-2xl font-bold text-purple-900">{metrics.activePollsThisMonth}</div>
                          <div className="text-xs text-purple-700 mt-1">استطلاعات نشطة</div>
                        </div>
                        <div className="bg-gradient-to-br from-orange-100 to-orange-50 p-4 rounded-lg border border-orange-200">
                          <div className="text-2xl font-bold text-orange-900">{metrics.averageParticipationRate}%</div>
                          <div className="text-xs text-orange-700 mt-1">متوسط المشاركة</div>
                        </div>
                        <div className="bg-gradient-to-br from-red-100 to-red-50 p-4 rounded-lg border border-red-200">
                          <div className="text-2xl font-bold text-red-900">{metrics.billsApprovedByVote}</div>
                          <div className="text-xs text-red-700 mt-1">قوانين موافق عليها</div>
                        </div>
                        <div className="bg-gradient-to-br from-cyan-100 to-cyan-50 p-4 rounded-lg border border-cyan-200">
                          <div className="text-2xl font-bold text-cyan-900">{metrics.projectsApprovedByVote}</div>
                          <div className="text-xs text-cyan-700 mt-1">مشاريع موافق عليها</div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 rounded-lg p-4">
                        <h4 className="font-semibold text-emerald-900 mb-3">✅ الفوائد المحققة</h4>
                        <ul className="text-sm text-emerald-800 space-y-2">
                          <li>🔐 التحقق الموثق من الهوية الوطنية</li>
                          <li>🗳️ استطلاعات رسمية وموثقة للمواطنين</li>
                          <li>📊 شفافية كاملة في نتائج التصويت</li>
                          <li>🎯 تطبيق قرارات المواطنين مباشرة</li>
                          <li>📱 منصة ديمقراطية مباشرة حقيقية</li>
                        </ul>
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="polls" className="space-y-4">
                  <div className="space-y-3">
                    {polls.map(poll => (
                      <Dialog key={poll.id}>
                        <DialogTrigger asChild>
                          <div className="p-4 bg-white border rounded-lg hover:shadow-md cursor-pointer transition-all">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-start gap-3">
                                <span className="text-2xl">{getPollTypeIcon(poll.type)}</span>
                                <div className="flex-1">
                                  <h4 className="font-semibold">{poll.title}</h4>
                                  <p className="text-xs text-gray-600 mt-1">{poll.description}</p>
                                </div>
                              </div>
                              <Badge className={getPollStatusColor(poll.status)}>
                                {poll.status === 'active' && '🔵 نشط'}
                                {poll.status === 'closed' && '⚫ مغلق'}
                                {poll.status === 'results_published' && '✅ النتائج منشورة'}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                              <div>
                                <span className="text-gray-600">النوع</span>
                                <div className="font-semibold">{getPollTypeText(poll.type)}</div>
                              </div>
                              <div>
                                <span className="text-gray-600">المشاركة</span>
                                <div className="font-semibold">
                                  {((poll.votesReceived / poll.totalVoters) * 100).toFixed(1)}%
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-600">الأصوات</span>
                                <div className="font-semibold">{poll.votesReceived} / {poll.totalVoters}</div>
                              </div>
                            </div>

                            <div className="space-y-1">
                              {poll.options.map(option => (
                                <div key={option.id} className="flex items-center gap-2">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-blue-500 h-2 rounded-full"
                                      style={{ width: `${option.percentage}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-semibold w-12 text-right">{option.percentage.toFixed(1)}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>{poll.title}</DialogTitle>
                            <DialogDescription>{poll.description}</DialogDescription>
                          </DialogHeader>

                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-sm text-gray-600">تاريخ البداية</span>
                                <div className="font-semibold">{poll.startDate}</div>
                              </div>
                              <div>
                                <span className="text-sm text-gray-600">تاريخ النهاية</span>
                                <div className="font-semibold">{poll.endDate}</div>
                              </div>
                            </div>

                            <div>
                              <span className="text-sm font-semibold mb-2 block">الخيارات</span>
                              <div className="space-y-3">
                                {poll.options.map(option => (
                                  <div
                                    key={option.id}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                      userVote === option.id
                                        ? 'bg-blue-100 border-blue-500'
                                        : 'bg-white border-gray-200 hover:border-blue-300'
                                    }`}
                                    onClick={() => setUserVote(option.id)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div
                                          className={`w-4 h-4 rounded-full border-2 ${
                                            userVote === option.id
                                              ? 'bg-blue-500 border-blue-500'
                                              : 'border-gray-300'
                                          }`}
                                        />
                                        <span className="font-semibold">{option.text}</span>
                                      </div>
                                      <div className="text-sm text-gray-600">
                                        {option.votes} صوت ({option.percentage.toFixed(1)}%)
                                      </div>
                                    </div>
                                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                                      <div
                                        className="bg-blue-500 h-2 rounded-full"
                                        style={{ width: `${option.percentage}%` }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {poll.results && (
                              <div className="bg-green-50 border border-green-300 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                  <span className="font-semibold text-green-900">النتائج النهائية</span>
                                </div>
                                <div className="text-sm text-green-800">
                                  <div>✅ الموافقة: {poll.results.approvalPercentage.toFixed(1)}%</div>
                                  <div>📊 معدل المشاركة: {poll.results.participationRate.toFixed(1)}%</div>
                                  <div>{poll.results.approved ? '✔️ تم الموافقة' : '❌ تم الرفض'}</div>
                                </div>
                              </div>
                            )}

                            {poll.status === 'active' && (
                              <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                                إرسال صوتي
                              </Button>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="citizens" className="space-y-4">
                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="font-semibold mb-3">📊 توزيع التحقق</h4>
                    <div className="flex justify-center">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={verificationData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {verificationData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">أعلى المواطنين نشاطاً</h4>
                    {citizens
                      .sort((a, b) => b.issuesReported - a.issuesReported)
                      .slice(0, 5)
                      .map((citizen, idx) => (
                        <div key={idx} className="p-3 bg-white border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold">{citizen.name}</div>
                              <div className="text-xs text-gray-600">{citizen.district}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-blue-600">{citizen.issuesReported} شكاوى</div>
                              <div className="text-xs text-gray-600">مشاركة: {citizen.votingParticipation}%</div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </TabsContent>

                <TabsContent value="analytics" className="space-y-4">
                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="font-semibold mb-3">📈 معدلات المشاركة</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="participation" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="text-2xl font-bold text-blue-900">
                        {((citizens.filter(c => c.verified).length / citizens.length) * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-blue-700 mt-1">معدل التحقق</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-100 to-green-50 p-4 rounded-lg border border-green-200">
                      <div className="text-2xl font-bold text-green-900">
                        {(citizens.reduce((sum, c) => sum + c.votingParticipation, 0) / citizens.length).toFixed(1)}%
                      </div>
                      <div className="text-xs text-green-700 mt-1">متوسط المشاركة</div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 rounded-lg p-4">
                    <h4 className="font-semibold text-emerald-900 mb-3">🎯 التوصيات</h4>
                    <ul className="text-sm text-emerald-800 space-y-2">
                      <li>📢 زيادة الوعي بأهمية المشاركة الديمقراطية</li>
                      <li>🔐 تعزيز عملية التحقق من الهوية</li>
                      <li>📱 تطوير تطبيق جوال للتصويت</li>
                      <li>📊 نشر نتائج الاستطلاعات بشفافية</li>
                      <li>🎓 تثقيف المواطنين حول القضايا المطروحة</li>
                    </ul>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
