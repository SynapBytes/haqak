import React, { useEffect, useState } from 'react';
import { AlertTriangle, TrendingUp, MapPin, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface Anomaly {
  id: string;
  category: string;
  location_region: string;
  issue_count: number;
  growth_rate: number | null;
  severity_score: number;
  status: string;
  ai_analysis_summary: string;
  created_at: string;
}

export const AIEarlyWarningSystem: React.FC = () => {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Table ai_anomalies not yet created – use empty mock data
    setAnomalies([]);
    setLoading(false);
  }, []);

  const getSeverityColor = (score: number): string => {
    if (score >= 0.8) return 'bg-red-100 text-red-800';
    if (score >= 0.6) return 'bg-orange-100 text-orange-800';
    if (score >= 0.4) return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getSeverityLabel = (score: number): string => {
    if (score >= 0.8) return 'حرج جداً';
    if (score >= 0.6) return 'حرج';
    if (score >= 0.4) return 'مرتفع';
    return 'متوسط';
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-blue-600" />
            نظام الإنذار المبكر الذكي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">جاري التحميل...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-600">خطأ</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-700">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-blue-600" />
            نظام الإنذار المبكر الذكي (AI Early Warning System)
          </CardTitle>
          <CardDescription>
            تحليل ذكي لأنماط الشكاوى واكتشاف البؤر الحرجة في دائرتك قبل تحولها إلى أزمات
          </CardDescription>
        </CardHeader>
        <CardContent>
          {anomalies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>لا توجد تنبيهات حالياً - النظام يعمل بكفاءة ✓</p>
            </div>
          ) : (
            <div className="space-y-3">
              {anomalies.map((anomaly) => (
                <div
                  key={anomaly.id}
                  className={`p-4 rounded-lg border-2 ${getSeverityColor(anomaly.severity_score)} transition-all hover:shadow-md`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg">
                          {anomaly.category === 'electricity' && '⚡ الكهرباء'}
                          {anomaly.category === 'water' && '💧 المياه'}
                          {anomaly.category === 'roads' && '🛣️ الطرق'}
                          {anomaly.category === 'sanitation' && '🧹 النظافة'}
                          {anomaly.category === 'healthcare' && '🏥 الصحة'}
                          {!['electricity', 'water', 'roads', 'sanitation', 'healthcare'].includes(anomaly.category) && anomaly.category}
                        </h3>
                        <Badge className={getSeverityColor(anomaly.severity_score)}>
                          {getSeverityLabel(anomaly.severity_score)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm mb-2">
                        <MapPin className="w-4 h-4" />
                        <span className="font-medium">{anomaly.location_region}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{anomaly.issue_count}</div>
                      <div className="text-xs">شكاوى في 24 ساعة</div>
                    </div>
                  </div>

                  <div className="bg-white bg-opacity-50 p-3 rounded mb-2 text-sm">
                    <p className="text-gray-800">{anomaly.ai_analysis_summary}</p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Clock className="w-3 h-3" />
                    <span>
                      تم الكشف: {new Date(anomaly.created_at).toLocaleString('ar-EG')}
                    </span>
                  </div>

                  {anomaly.growth_rate && (
                    <div className="flex items-center gap-1 mt-2 text-sm font-semibold">
                      <TrendingUp className="w-4 h-4" />
                      <span>معدل النمو: {(anomaly.growth_rate * 100).toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">إجمالي التنبيهات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{anomalies.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">التنبيهات الحرجة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {anomalies.filter(a => a.severity_score >= 0.8).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">أكثر فئة تأثراً</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {anomalies.length > 0
                ? anomalies.reduce((a, b) => (a.issue_count > b.issue_count ? a : b)).category
                : 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
