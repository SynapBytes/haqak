import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Lock, 
  Chain, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Copy, 
  ExternalLink,
  Zap,
  Shield,
  Layers,
  Hash,
  Info,
  Eye,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface BlockchainRecord {
  id: string;
  hash: string;
  previousHash: string;
  timestamp: string;
  type: 'promise' | 'complaint' | 'resolution';
  title: string;
  description: string;
  mpName: string;
  citizenId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  blockNumber: number;
  merkleRoot: string;
  immutable: boolean;
}

export const BlockchainAccountabilityLedger: React.FC = () => {
  const [records, setRecords] = useState<BlockchainRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<BlockchainRecord | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'promise' | 'complaint' | 'resolution'>('all');

  useEffect(() => {
    fetchBlockchainRecords();
  }, []);

  const fetchBlockchainRecords = async () => {
    setLoading(true);
    // Simulate blockchain record fetching
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockRecords: BlockchainRecord[] = [
      {
        id: 'blk-001',
        hash: '0x7a3f9e2c1b8d4a6f5e9c2b1d8a3f4e6c7b9d2e1f3a4b5c6d7e8f9a0b1c2d3e',
        previousHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'promise',
        title: 'وعد بإصلاح الطريق الرئيسية بشارع النيل',
        description: 'النائب وعد بإصلاح الحفر والتشققات في الطريق الرئيسية خلال 30 يوم',
        mpName: 'د. محمد أحمد علي',
        citizenId: 'citizen-001',
        status: 'in_progress',
        blockNumber: 1,
        merkleRoot: '0x9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f',
        immutable: true
      },
      {
        id: 'blk-002',
        hash: '0x2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e',
        previousHash: '0x7a3f9e2c1b8d4a6f5e9c2b1d8a3f4e6c7b9d2e1f3a4b5c6d7e8f9a0b1c2d3e',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'complaint',
        title: 'شكوى: انقطاع المياه المستمر في الحي الثالث',
        description: 'انقطاع المياه لمدة 48 ساعة متواصلة في الحي الثالث دون إنذار مسبق',
        mpName: 'د. محمد أحمد علي',
        citizenId: 'citizen-042',
        status: 'pending',
        blockNumber: 2,
        merkleRoot: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a',
        immutable: true
      },
      {
        id: 'blk-003',
        hash: '0x5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c',
        previousHash: '0x2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'resolution',
        title: 'تم حل: إضاءة شارع الجمهورية',
        description: 'تم تركيب 15 عمود إنارة جديد في شارع الجمهورية بعد شكوى من المواطنين',
        mpName: 'د. محمد أحمد علي',
        citizenId: 'citizen-015',
        status: 'completed',
        blockNumber: 3,
        merkleRoot: '0x9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f',
        immutable: true
      }
    ];
    
    setRecords(mockRecords);
    setLoading(false);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'promise': return 'وعد برلماني';
      case 'complaint': return 'شكوى مواطن';
      case 'resolution': return 'حل وتنفيذ';
      default: return 'سجل';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'promise': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'complaint': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'resolution': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'in_progress': return <Zap className="w-5 h-5 text-amber-600 animate-pulse" />;
      case 'pending': return <Clock className="w-5 h-5 text-slate-600" />;
      case 'failed': return <AlertCircle className="w-5 h-5 text-rose-600" />;
      default: return null;
    }
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast.success('تم نسخ الـ Hash');
  };

  const filteredRecords = filterType === 'all' 
    ? records 
    : records.filter(r => r.type === filterType);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Chain className="w-6 h-6 text-purple-600" />
            سجل المساءلة الذكي (Blockchain Ledger)
          </h2>
          <p className="text-muted-foreground">تسجيل غير قابل للتعديل لكل وعد وشكوى وحل في الدائرة</p>
        </div>
        <Badge variant="outline" className="px-3 py-1 gap-1 border-purple-200 text-purple-700 bg-purple-50">
          <Lock className="w-4 h-4" />
          تشفير SHA-256
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-bold uppercase">إجمالي الوعود</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">24</p>
              </div>
              <div className="w-10 h-10 bg-blue-200 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-rose-600 font-bold uppercase">الشكاوى المسجلة</p>
                <p className="text-2xl font-bold text-rose-900 mt-1">127</p>
              </div>
              <div className="w-10 h-10 bg-rose-200 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-600 font-bold uppercase">الحلول المنفذة</p>
                <p className="text-2xl font-bold text-emerald-900 mt-1">89</p>
              </div>
              <div className="w-10 h-10 bg-emerald-200 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-600 font-bold uppercase">معدل الإنجاز</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">70%</p>
              </div>
              <div className="w-10 h-10 bg-purple-200 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-purple-100 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg">سجل البلوكشين</CardTitle>
              <CardDescription>كل سجل محمي بتشفير SHA-256 ولا يمكن حذفه أو تعديله</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              تصدير السجل
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="all" onValueChange={(v) => setFilterType(v as any)}>
            <TabsList className="w-full rounded-none border-b bg-slate-50/50 px-4 py-2">
              <TabsTrigger value="all">الكل</TabsTrigger>
              <TabsTrigger value="promise">الوعود</TabsTrigger>
              <TabsTrigger value="complaint">الشكاوى</TabsTrigger>
              <TabsTrigger value="resolution">الحلول</TabsTrigger>
            </TabsList>

            <TabsContent value={filterType} className="p-4 space-y-3 mt-0">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">لا توجد سجلات</div>
              ) : (
                filteredRecords.map((record, idx) => (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="border rounded-xl p-4 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => setSelectedRecord(record)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-1">{getStatusIcon(record.status)}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-sm">{record.title}</h4>
                            <Badge className={`text-[10px] ${getTypeColor(record.type)}`}>
                              {getTypeLabel(record.type)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{record.description}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] ml-2">
                        <Hash className="w-3 h-3 ml-1" />
                        Block #{record.blockNumber}
                      </Badge>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-2 mb-2">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">Hash:</span>
                        <div className="flex items-center gap-1">
                          <code className="font-mono text-slate-600 truncate max-w-xs">{record.hash.substring(0, 20)}...</code>
                          <button onClick={() => copyHash(record.hash)} className="text-slate-400 hover:text-slate-600">
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                      <span>{new Date(record.timestamp).toLocaleDateString('ar-EG')}</span>
                      <div className="flex items-center gap-1">
                        <Shield className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600 font-bold">غير قابل للتعديل</span>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {selectedRecord && (
        <Card className="border-purple-100 bg-purple-50/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-600" />
              تفاصيل السجل
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-3 rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1">رقم الكتلة</p>
                <p className="font-mono font-bold text-sm">{selectedRecord.blockNumber}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1">الحالة</p>
                <div className="flex items-center gap-2">
                  {getStatusIcon(selectedRecord.status)}
                  <span className="font-bold text-sm">{selectedRecord.status}</span>
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg border md:col-span-2">
                <p className="text-xs text-muted-foreground mb-1">Hash (SHA-256)</p>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-xs text-slate-600 break-all">{selectedRecord.hash}</code>
                  <button onClick={() => copyHash(selectedRecord.hash)} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 flex gap-3 items-start">
        <Info className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-purple-700 leading-relaxed">
          <strong>كيف يعمل البلوكشين هنا:</strong> كل وعد أو شكوى يتم تسجيلها على "سلسلة كتل" مشفرة. إذا حاول أحد تعديل سجل قديم، سيتغير الـ Hash ويكتشف النظام التلاعب فوراً. هذا يضمن <strong>ثقة 100% من المواطن</strong> أن وعده لن يُنسى أو يُحذف.
        </p>
      </div>
    </div>
  );
};
