import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Vote, Users, MessageSquare, BarChart3, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface Poll {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'active' | 'closed';
  endDate: string;
  totalVotes: number;
  options: PollOption[];
  userVoted?: string;
}

export const ConsultativeVotingSystem: React.FC = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPolls();
  }, []);

  const fetchPolls = async () => {
    try {
      setLoading(true);
      // Mock data for initial implementation - will be connected to Supabase 'polls' table
      const mockPolls: Poll[] = [
        {
          id: 'poll-1',
          title: 'تطوير حديقة الحي السابع',
          description: 'ما هو المرفق الأكثر أهمية الذي ترغب في رؤيته في الحديقة الجديدة؟',
          category: 'تطوير حضري',
          status: 'active',
          endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          totalVotes: 450,
          options: [
            { id: 'opt-1', text: 'منطقة ألعاب أطفال مؤمنة', votes: 180 },
            { id: 'opt-2', text: 'ممشى رياضي ومسار دراجات', votes: 150 },
            { id: 'opt-3', text: 'مساحات خضراء مفتوحة للجلسات', votes: 120 },
          ]
        },
        {
          id: 'poll-2',
          title: 'تعديل مسار خط الأتوبيس رقم 102',
          description: 'هل تؤيد تعديل مسار الأتوبيس ليمر بشارع المدارس بدلاً من الشارع الرئيسي؟',
          category: 'نقل ومواصلات',
          status: 'active',
          endDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
          totalVotes: 820,
          options: [
            { id: 'opt-4', text: 'نعم، أؤيد بشدة لتسهيل وصول الطلاب', votes: 540 },
            { id: 'opt-5', text: 'لا، المسار الحالي أفضل وأسرع', votes: 280 },
          ]
        }
      ];
      setPolls(mockPolls);
    } catch (error) {
      console.error('Error fetching polls:', error);
      toast.error('فشل في تحميل الاستطلاعات');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (pollId: string) => {
    if (!selectedOption) {
      toast.warning('يرجى اختيار خيار أولاً');
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPolls(prev => prev.map(poll => {
        if (poll.id === pollId) {
          return {
            ...poll,
            userVoted: selectedOption,
            totalVotes: poll.totalVotes + 1,
            options: poll.options.map(opt => 
              opt.id === selectedOption ? { ...opt, votes: opt.votes + 1 } : opt
            )
          };
        }
        return poll;
      }));
      
      toast.success('تم تسجيل تصويتك بنجاح. شكراً لمشاركتك!');
      setSelectedOption(null);
    } catch (error) {
      toast.error('حدث خطأ أثناء التصويت');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculatePercentage = (votes: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((votes / total) * 100);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Vote className="w-6 h-6 text-primary" />
            التصويت الرقمي الاستشاري
          </h2>
          <p className="text-muted-foreground">صوتك أمانة، شارك في صنع القرار بدائرتك</p>
        </div>
        <Badge variant="outline" className="px-3 py-1 gap-1">
          <Users className="w-4 h-4" />
          ديمقراطية تشاركية
        </Badge>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="active">استطلاعات نشطة</TabsTrigger>
          <TabsTrigger value="results">النتائج السابقة</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-muted-foreground">جاري تحميل الاستطلاعات...</p>
            </div>
          ) : polls.filter(p => p.status === 'active').length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/20">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
              <p className="text-muted-foreground">لا توجد استطلاعات رأي نشطة حالياً</p>
            </div>
          ) : (
            polls.filter(p => p.status === 'active').map(poll => (
              <Card key={poll.id} className="overflow-hidden border-r-4 border-r-primary transition-all hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <Badge variant="secondary" className="mb-2">{poll.category}</Badge>
                    <div className="flex items-center text-xs text-muted-foreground gap-1">
                      <Clock className="w-3 h-3" />
                      ينتهي في {new Date(poll.endDate).toLocaleDateString('ar-EG')}
                    </div>
                  </div>
                  <CardTitle className="text-xl">{poll.title}</CardTitle>
                  <CardDescription>{poll.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {poll.userVoted ? (
                    <div className="space-y-4 py-2">
                      <div className="flex items-center gap-2 text-success font-semibold mb-2">
                        <CheckCircle2 className="w-5 h-5" />
                        لقد شاركت في هذا التصويت
                      </div>
                      {poll.options.map(option => (
                        <div key={option.id} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className={poll.userVoted === option.id ? "font-bold" : ""}>
                              {option.text} {poll.userVoted === option.id && "(اختيارك)"}
                            </span>
                            <span className="font-medium">{calculatePercentage(option.votes, poll.totalVotes)}%</span>
                          </div>
                          <Progress 
                            value={calculatePercentage(option.votes, poll.totalVotes)} 
                            className={`h-2 ${poll.userVoted === option.id ? "bg-primary/20" : ""}`}
                          />
                        </div>
                      ))}
                      <div className="text-xs text-muted-foreground text-left mt-2">
                        إجمالي المشاركين: {poll.totalVotes} مواطن
                      </div>
                    </div>
                  ) : (
                    <RadioGroup 
                      onValueChange={setSelectedOption} 
                      className="space-y-3 py-2"
                    >
                      {poll.options.map(option => (
                        <div key={option.id} className="flex items-center space-x-reverse space-x-3 border p-3 rounded-lg hover:bg-muted/30 cursor-pointer transition-colors">
                          <RadioGroupItem value={option.id} id={option.id} />
                          <Label htmlFor={option.id} className="flex-1 cursor-pointer font-medium">{option.text}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                </CardContent>
                {!poll.userVoted && (
                  <CardFooter className="bg-muted/10 border-t pt-4">
                    <Button 
                      onClick={() => handleVote(poll.id)} 
                      className="w-full gap-2"
                      disabled={!selectedOption || isSubmitting}
                    >
                      {isSubmitting ? (
                        <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> جاري التسجيل...</>
                      ) : (
                        <><Vote className="w-4 h-4" /> تأكيد التصويت</>
                      )}
                    </Button>
                  </CardFooter>
                )}
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                أرشيف القرارات التشاركية
              </CardTitle>
              <CardDescription>نتائج الاستطلاعات التي تم إغلاقها واعتمادها من النائب</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="w-10 h-10 text-muted-foreground mb-3 opacity-20" />
                <p className="text-muted-foreground">سيتم نقل الاستطلاعات المنتهية هنا بعد اكتمال المدة الزمنية</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
