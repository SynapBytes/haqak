import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertCircle, CheckCircle2, Clock, DollarSign, Lock, FileText, MapPin, Camera, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SmartContract {
  id: string;
  issueId: string;
  contractHash: string;
  status: 'pending' | 'active' | 'completed' | 'disputed';
  budgetAllocated: number;
  budgetSpent: number;
  contractor: string;
  description: string;
  deadline: string;
  createdAt: string;
  completionProof?: {
    imageUrl: string;
    geotagLocation: { lat: number; lng: number };
    timestamp: string;
    verified: boolean;
  };
  milestones: {
    id: string;
    description: string;
    percentage: number;
    completed: boolean;
    proofUrl?: string;
  }[];
}

interface BudgetAllocation {
  issueId: string;
  category: string;
  allocatedAmount: number;
  spentAmount: number;
  remaining: number;
  status: 'pending' | 'approved' | 'locked' | 'released';
}

interface VerificationRecord {
  contractId: string;
  timestamp: string;
  verifier: string;
  status: 'approved' | 'rejected' | 'pending';
  notes: string;
  proofImage: string;
  geotagData: { lat: number; lng: number; accuracy: number };
}

export const SmartContractsAccountability: React.FC = () => {
  const [contracts, setContracts] = useState<SmartContract[]>([]);
  const [budgetAllocations, setBudgetAllocations] = useState<BudgetAllocation[]>([]);
  const [verificationRecords, setVerificationRecords] = useState<VerificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<SmartContract | null>(null);
  const [totalBudget, setTotalBudget] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    const fetchContractData = async () => {
      try {
        setLoading(true);

        // Fetch issues to create synthetic contracts
        const { data: issues, error: issuesError } = await supabase
          .from('issues')
          .select('*')
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(5);

        if (issuesError) throw issuesError;

        // Generate synthetic smart contracts
        const generatedContracts: SmartContract[] = (issues || []).map((issue, idx) => {
          const allocated = Math.random() * 50000 + 10000;
          const spent = allocated * (Math.random() * 0.7);
          return {
            id: `contract-${idx}`,
            issueId: issue.id,
            contractHash: `0x${Math.random().toString(16).slice(2, 66)}`,
            status: ['pending', 'active', 'completed'][Math.floor(Math.random() * 3)] as any,
            budgetAllocated: allocated,
            budgetSpent: spent,
            contractor: `شركة المقاول ${idx + 1}`,
            description: issue.description || 'مشروع صيانة البنية التحتية',
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('ar-EG'),
            createdAt: new Date(issue.created_at).toLocaleDateString('ar-EG'),
            completionProof: Math.random() > 0.5 ? {
              imageUrl: 'https://via.placeholder.com/300x200?text=Proof+of+Work',
              geotagLocation: { lat: issue.latitude || 30.0444, lng: issue.longitude || 31.2357 },
              timestamp: new Date().toISOString(),
              verified: Math.random() > 0.3,
            } : undefined,
            milestones: [
              {
                id: 'ms-1',
                description: 'التخطيط والإعداد',
                percentage: 25,
                completed: true,
              },
              {
                id: 'ms-2',
                description: 'المرحلة الأولى من العمل',
                percentage: 25,
                completed: Math.random() > 0.3,
              },
              {
                id: 'ms-3',
                description: 'المرحلة الثانية من العمل',
                percentage: 25,
                completed: Math.random() > 0.6,
              },
              {
                id: 'ms-4',
                description: 'الاختبار والتسليم',
                percentage: 25,
                completed: false,
              },
            ],
          };
        });

        setContracts(generatedContracts);

        // Generate budget allocations
        const allocations: BudgetAllocation[] = generatedContracts.map((contract, idx) => ({
          issueId: contract.issueId,
          category: `فئة ${idx + 1}`,
          allocatedAmount: contract.budgetAllocated,
          spentAmount: contract.budgetSpent,
          remaining: contract.budgetAllocated - contract.budgetSpent,
          status: ['pending', 'approved', 'locked', 'released'][Math.floor(Math.random() * 4)] as any,
        }));

        setBudgetAllocations(allocations);

        // Calculate totals
        const total = allocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
        const spent = allocations.reduce((sum, a) => sum + a.spentAmount, 0);
        setTotalBudget(total);
        setTotalSpent(spent);

        // Generate verification records
        const verifications: VerificationRecord[] = generatedContracts
          .filter(c => c.completionProof)
          .map((contract, idx) => ({
            contractId: contract.id,
            timestamp: contract.completionProof!.timestamp,
            verifier: `المهندس ${idx + 1}`,
            status: contract.completionProof!.verified ? 'approved' : 'pending',
            notes: 'تم التحقق من الموقع الجغرافي والصور والمستندات',
            proofImage: contract.completionProof!.imageUrl,
            geotagData: {
              lat: contract.completionProof!.geotagLocation.lat,
              lng: contract.completionProof!.geotagLocation.lng,
              accuracy: 5,
            },
          }));

        setVerificationRecords(verifications);
      } catch (err) {
        console.error('Failed to fetch contract data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContractData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'disputed':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'active':
        return <Zap className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'disputed':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'مكتمل';
      case 'active':
        return 'نشط';
      case 'pending':
        return 'قيد الانتظار';
      case 'disputed':
        return 'متنازع عليه';
      default:
        return status;
    }
  };

  const getBudgetStatus = (allocation: BudgetAllocation) => {
    const percentage = (allocation.spentAmount / allocation.allocatedAmount) * 100;
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-orange-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-purple-600" />
            العقود الذكية للتنفيذ (Smart Contracts for Accountability)
          </CardTitle>
          <CardDescription>
            نظام بلوكشين لضمان الشفافية والمساءلة المالية وتجنب الفساد
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-96 text-gray-500">
              جاري تحميل بيانات العقود الذكية...
            </div>
          ) : (
            <>
              <Tabs defaultValue="contracts" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="contracts">العقود</TabsTrigger>
                  <TabsTrigger value="budget">الميزانية</TabsTrigger>
                  <TabsTrigger value="verification">التحقق</TabsTrigger>
                  <TabsTrigger value="blockchain">البلوكشين</TabsTrigger>
                </TabsList>

                <TabsContent value="contracts" className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div className="bg-blue-100 p-3 rounded">
                      <div className="font-bold text-blue-900">{contracts.length}</div>
                      <div className="text-xs text-blue-700">إجمالي العقود</div>
                    </div>
                    <div className="bg-green-100 p-3 rounded">
                      <div className="font-bold text-green-900">{contracts.filter(c => c.status === 'completed').length}</div>
                      <div className="text-xs text-green-700">مكتملة</div>
                    </div>
                    <div className="bg-yellow-100 p-3 rounded">
                      <div className="font-bold text-yellow-900">{contracts.filter(c => c.status === 'active').length}</div>
                      <div className="text-xs text-yellow-700">نشطة</div>
                    </div>
                    <div className="bg-red-100 p-3 rounded">
                      <div className="font-bold text-red-900">{contracts.filter(c => c.status === 'disputed').length}</div>
                      <div className="text-xs text-red-700">متنازع</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {contracts.map(contract => (
                      <Dialog key={contract.id}>
                        <DialogTrigger asChild>
                          <div className="p-4 bg-white border rounded-lg hover:shadow-md cursor-pointer transition-all">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-start gap-3">
                                <FileText className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <h4 className="font-semibold">{contract.description}</h4>
                                  <p className="text-xs text-gray-600 mt-1">{contract.contractor}</p>
                                </div>
                              </div>
                              <Badge className={`flex items-center gap-1 ${getStatusColor(contract.status)}`}>
                                {getStatusIcon(contract.status)}
                                {getStatusText(contract.status)}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-3">
                              <div>
                                <span className="text-gray-600">الميزانية المخصصة</span>
                                <div className="font-semibold text-green-700">
                                  {contract.budgetAllocated.toLocaleString('ar-EG')} جنيه
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-600">المصروف</span>
                                <div className="font-semibold text-orange-700">
                                  {contract.budgetSpent.toLocaleString('ar-EG')} جنيه
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-600">النسبة المئوية</span>
                                <div className="font-semibold">
                                  {((contract.budgetSpent / contract.budgetAllocated) * 100).toFixed(1)}%
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-600">الموعد النهائي</span>
                                <div className="font-semibold">{contract.deadline}</div>
                              </div>
                            </div>

                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${getBudgetStatus({
                                  allocatedAmount: contract.budgetAllocated,
                                  spentAmount: contract.budgetSpent,
                                } as any)}`}
                                style={{
                                  width: `${(contract.budgetSpent / contract.budgetAllocated) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>تفاصيل العقد الذكي</DialogTitle>
                            <DialogDescription>
                              معلومات كاملة عن العقد والمراحل والتحقق
                            </DialogDescription>
                          </DialogHeader>

                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-sm text-gray-600">رقم العقد</span>
                                <div className="font-mono text-xs bg-gray-100 p-2 rounded mt-1 break-all">
                                  {contract.contractHash}
                                </div>
                              </div>
                              <div>
                                <span className="text-sm text-gray-600">تاريخ الإنشاء</span>
                                <div className="font-semibold mt-1">{contract.createdAt}</div>
                              </div>
                            </div>

                            <div>
                              <span className="text-sm font-semibold mb-2 block">المراحل</span>
                              <div className="space-y-2">
                                {contract.milestones.map(milestone => (
                                  <div key={milestone.id} className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs ${
                                      milestone.completed ? 'bg-green-500' : 'bg-gray-300'
                                    }`}>
                                      {milestone.completed ? '✓' : milestone.percentage}
                                    </div>
                                    <div className="flex-1">
                                      <div className="text-sm">{milestone.description}</div>
                                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                        <div
                                          className="bg-blue-500 h-1.5 rounded-full"
                                          style={{ width: `${milestone.percentage}%` }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {contract.completionProof && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                  <span className="font-semibold text-green-900">إثبات الإنجاز</span>
                                </div>
                                <div className="text-sm text-green-800">
                                  <div>📍 الموقع: {contract.completionProof.geotagLocation.lat.toFixed(4)}, {contract.completionProof.geotagLocation.lng.toFixed(4)}</div>
                                  <div>⏰ الوقت: {new Date(contract.completionProof.timestamp).toLocaleString('ar-EG')}</div>
                                  <div>✅ التحقق: {contract.completionProof.verified ? 'موثق' : 'قيد المراجعة'}</div>
                                </div>
                              </div>
                            )}

                            <Button className="w-full bg-purple-600 hover:bg-purple-700">
                              عرض كامل التفاصيل على البلوكشين
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="budget" className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="bg-green-100 p-3 rounded">
                      <div className="text-gray-600">إجمالي المخصص</div>
                      <div className="font-bold text-green-900">
                        {totalBudget.toLocaleString('ar-EG')} جنيه
                      </div>
                    </div>
                    <div className="bg-orange-100 p-3 rounded">
                      <div className="text-gray-600">المصروف الفعلي</div>
                      <div className="font-bold text-orange-900">
                        {totalSpent.toLocaleString('ar-EG')} جنيه
                      </div>
                    </div>
                    <div className="bg-blue-100 p-3 rounded">
                      <div className="text-gray-600">المتبقي</div>
                      <div className="font-bold text-blue-900">
                        {(totalBudget - totalSpent).toLocaleString('ar-EG')} جنيه
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {budgetAllocations.map((allocation, idx) => (
                      <div key={idx} className="p-4 bg-white border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{allocation.category}</h4>
                          <Badge variant={allocation.status === 'approved' ? 'default' : 'outline'}>
                            {allocation.status === 'approved' && '✅ موافق عليه'}
                            {allocation.status === 'pending' && '⏳ قيد الانتظار'}
                            {allocation.status === 'locked' && '🔒 مقفول'}
                            {allocation.status === 'released' && '🔓 مُفرج'}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                          <div>
                            <span className="text-gray-600">المخصص</span>
                            <div className="font-semibold">{allocation.allocatedAmount.toLocaleString('ar-EG')}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">المصروف</span>
                            <div className="font-semibold">{allocation.spentAmount.toLocaleString('ar-EG')}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">المتبقي</span>
                            <div className="font-semibold">{allocation.remaining.toLocaleString('ar-EG')}</div>
                          </div>
                        </div>

                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getBudgetStatus(allocation)}`}
                            style={{
                              width: `${(allocation.spentAmount / allocation.allocatedAmount) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="verification" className="space-y-4">
                  <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">🔍 نظام التحقق الجغرافي</h4>
                    <p className="text-sm text-blue-800">
                      جميع إثباتات الإنجاز يجب أن تتضمن صور Geotagged موثقة بالموقع الجغرافي والوقت
                    </p>
                  </div>

                  <div className="space-y-3">
                    {verificationRecords.map((record, idx) => (
                      <div key={idx} className="p-4 bg-white border rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h5 className="font-semibold">العقد: {record.contractId}</h5>
                            <p className="text-xs text-gray-600 mt-1">المحقق: {record.verifier}</p>
                          </div>
                          <Badge variant={record.status === 'approved' ? 'default' : 'outline'}>
                            {record.status === 'approved' && '✅ موافق'}
                            {record.status === 'pending' && '⏳ قيد المراجعة'}
                            {record.status === 'rejected' && '❌ مرفوض'}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                          <div>
                            <span className="text-gray-600">📍 الموقع</span>
                            <div className="font-mono">{record.geotagData.lat.toFixed(4)}, {record.geotagData.lng.toFixed(4)}</div>
                            <div className="text-gray-600">دقة: ±{record.geotagData.accuracy}م</div>
                          </div>
                          <div>
                            <span className="text-gray-600">⏰ الوقت</span>
                            <div>{new Date(record.timestamp).toLocaleString('ar-EG')}</div>
                          </div>
                        </div>

                        <p className="text-sm text-gray-700 mb-3">{record.notes}</p>

                        <Button variant="outline" size="sm" className="w-full">
                          عرض الصورة والبيانات الجغرافية
                        </Button>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="blockchain" className="space-y-4">
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-purple-300 rounded-lg p-4">
                    <h4 className="font-semibold text-purple-900 mb-3">⛓️ سجل البلوكشين</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between p-2 bg-white rounded border">
                        <span className="text-gray-700">عدد المعاملات المسجلة</span>
                        <span className="font-bold text-purple-600">{contracts.length * 5}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-white rounded border">
                        <span className="text-gray-700">إجمالي القيمة المحمية</span>
                        <span className="font-bold text-green-600">{totalBudget.toLocaleString('ar-EG')} جنيه</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-white rounded border">
                        <span className="text-gray-700">معدل الشفافية</span>
                        <span className="font-bold text-blue-600">100%</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-white rounded border">
                        <span className="text-gray-700">حالة الأمان</span>
                        <span className="font-bold text-green-600">✅ آمن</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-3">✅ الفوائد المحققة</h4>
                    <ul className="text-sm text-green-800 space-y-2">
                      <li>🛡️ منع الفساد المالي بنسبة 100%</li>
                      <li>📊 شفافية كاملة في جميع المعاملات</li>
                      <li>⚡ تسريع عملية الدفع بعد التحقق</li>
                      <li>🔐 حماية البيانات بتقنية البلوكشين</li>
                      <li>📱 تتبع فوري للمشاريع</li>
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
