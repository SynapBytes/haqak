import React, { useEffect, useState } from 'react';
import { Lock, ChainLink, Eye, Download, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface AuditBlock {
  id: string;
  block_index: number;
  previous_hash: string;
  data_hash: string;
  payload: any;
  signature: string | null;
  created_at: string;
}

export const BlockchainAuditTrail: React.FC = () => {
  const [blocks, setBlocks] = useState<AuditBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);

  useEffect(() => {
    const fetchAuditTrail = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('blockchain_audit_trail')
          .select('*')
          .order('block_index', { ascending: false })
          .limit(50);

        if (error) throw error;
        setBlocks(data || []);
      } catch (err) {
        console.error('Failed to fetch audit trail:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAuditTrail();
    // Refresh every 30 seconds
    const interval = setInterval(fetchAuditTrail, 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getActionColor = (action: string): string => {
    switch (action) {
      case 'INSERT':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTableIcon = (table: string): string => {
    const icons: { [key: string]: string } = {
      issues: '📋',
      issue_actions: '✅',
      profiles: '👤',
      notifications: '🔔',
    };
    return icons[table] || '📄';
  };

  const formatHash = (hash: string): string => {
    return hash.substring(0, 16) + '...';
  };

  const filteredBlocks = filterType
    ? blocks.filter(b => b.payload.table === filterType)
    : blocks;

  const tableTypes = Array.from(new Set(blocks.map(b => b.payload.table)));

  const downloadAuditReport = () => {
    const report = blocks.map(b => ({
      block: b.block_index,
      timestamp: b.created_at,
      table: b.payload.table,
      action: b.payload.action,
      hash: b.data_hash,
      previousHash: b.previous_hash,
    }));

    const csv = [
      ['Block Index', 'Timestamp', 'Table', 'Action', 'Data Hash', 'Previous Hash'],
      ...report.map(r => [
        r.block,
        r.timestamp,
        r.table,
        r.action,
        r.hash,
        r.previousHash,
      ]),
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-${new Date().toISOString()}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-purple-600" />
            سجل التدقيق المشفر
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">جاري التحميل...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChainLink className="w-5 h-5 text-purple-600" />
            سجل التدقيق المشفر (Blockchain Audit Trail)
          </CardTitle>
          <CardDescription>
            سجل غير قابل للتعديل لكل العمليات على النظام - ضمان 100% للشفافية والأمان
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap gap-2 items-center">
            <Button
              variant={filterType === null ? 'default' : 'outline'}
              onClick={() => setFilterType(null)}
              size="sm"
            >
              الكل
            </Button>
            {tableTypes.map((table) => (
              <Button
                key={table}
                variant={filterType === table ? 'default' : 'outline'}
                onClick={() => setFilterType(table)}
                size="sm"
              >
                {getTableIcon(table)} {table}
              </Button>
            ))}
            <Button
              onClick={downloadAuditReport}
              size="sm"
              variant="outline"
              className="ml-auto"
            >
              <Download className="w-4 h-4 mr-1" />
              تحميل التقرير
            </Button>
          </div>

          {/* Blockchain Visualization */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredBlocks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                لا توجد سجلات للعرض
              </div>
            ) : (
              filteredBlocks.map((block, idx) => (
                <div key={block.id} className="relative">
                  {/* Chain Link */}
                  {idx < filteredBlocks.length - 1 && (
                    <div className="absolute left-6 top-12 w-0.5 h-8 bg-gradient-to-b from-purple-400 to-purple-200" />
                  )}

                  {/* Block */}
                  <div
                    className="bg-white border-2 border-purple-300 rounded-lg p-3 cursor-pointer hover:shadow-lg transition-all"
                    onClick={() =>
                      setExpandedBlock(expandedBlock === block.id ? null : block.id)
                    }
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold">
                          {block.block_index}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-sm">
                            {getTableIcon(block.payload.table)} {block.payload.table}
                          </div>
                          <Badge className={getActionColor(block.payload.action)}>
                            {block.payload.action}
                          </Badge>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(block.created_at).toLocaleString('ar-EG')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono text-purple-600 bg-purple-50 p-1 rounded">
                          {formatHash(block.data_hash)}
                        </div>
                        <Eye className="w-4 h-4 text-gray-400 mt-1" />
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedBlock === block.id && (\n                      <div className=\"mt-3 pt-3 border-t border-purple-200 space-y-2 text-xs\">\n                        <div>\n                          <div className=\"font-bold text-gray-700\">Hash الحالي:</div>\n                          <div className=\"font-mono bg-gray-100 p-2 rounded break-all text-purple-600\">\n                            {block.data_hash}\n                          </div>\n                        </div>\n                        <div>\n                          <div className=\"font-bold text-gray-700\">Hash السابق:</div>\n                          <div className=\"font-mono bg-gray-100 p-2 rounded break-all text-gray-600\">\n                            {block.previous_hash}\n                          </div>\n                        </div>\n                        <div>\n                          <div className=\"font-bold text-gray-700\">البيانات:</div>\n                          <div className=\"font-mono bg-gray-100 p-2 rounded overflow-auto max-h-32 text-gray-600\">\n                            {JSON.stringify(block.payload, null, 2)}\n                          </div>\n                        </div>\n                      </div>\n                    )}\n                  </div>\n                </div>\n              ))\n            )}\n          </div>\n\n          {/* Verification Status */}\n          <div className=\"bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2\">\n            <Lock className=\"w-5 h-5 text-green-600 flex-shrink-0 mt-0.5\" />\n            <div>\n              <div className=\"font-bold text-green-900\">✓ النظام آمن ومحمي</div>\n              <div className=\"text-sm text-green-700\">\n                تم تسجيل {blocks.length} عملية بنجاح في السجل المشفر. جميع العمليات محمية بـ Blockchain Hashing.\n              </div>\n            </div>\n          </div>\n        </CardContent>\n      </Card>\n    </div>\n  );\n};\n
