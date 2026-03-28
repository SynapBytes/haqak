import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Cube, Zap, AlertTriangle, MapPin, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CableLayer {
  id: string;
  type: 'electrical' | 'water' | 'sewage' | 'telecom';
  depth: number; // in centimeters
  status: 'operational' | 'damaged' | 'maintenance';
  location: { x: number; y: number; z: number };
  lastInspection: string;
}

interface StreetSection {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  cables: CableLayer[];
  issues: {
    id: string;
    type: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    coordinates: { x: number; y: number; z: number };
    description: string;
    estimatedDepth: number;
  }[];
}

interface Canvas3DState {
  rotation: { x: number; y: number };
  zoom: number;
  selectedLayer: string | null;
}

export const DigitalTwinIntegration: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streetData, setStreetData] = useState<StreetSection | null>(null);
  const [loading, setLoading] = useState(true);
  const [canvas3D, setCanvas3D] = useState<Canvas3DState>({
    rotation: { x: 0, y: 0 },
    zoom: 1,
    selectedLayer: null,
  });
  const [visibleLayers, setVisibleLayers] = useState({
    electrical: true,
    water: true,
    sewage: true,
    telecom: true,
  });
  const [selectedIssue, setSelectedIssue] = useState<any>(null);

  useEffect(() => {
    const fetchStreetData = async () => {
      try {
        setLoading(true);
        // Fetch recent issues with high severity
        const { data: issues, error: issuesError } = await supabase
          .from('issues')
          .select('*')
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(1);

        if (issuesError) throw issuesError;

        if (issues && issues.length > 0) {
          const issue = issues[0];
          
          // Generate synthetic cable layers for demonstration
          const cables: CableLayer[] = [
            {
              id: 'elec-1',
              type: 'electrical',
              depth: 80,
              status: issue.category === 'electricity' ? 'damaged' : 'operational',
              location: { x: 50, y: 50, z: -80 },
              lastInspection: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
              id: 'water-1',
              type: 'water',
              depth: 120,
              status: issue.category === 'water' ? 'damaged' : 'operational',
              location: { x: 50, y: 30, z: -120 },
              lastInspection: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
              id: 'sewage-1',
              type: 'sewage',
              depth: 150,
              status: issue.category === 'sanitation' ? 'damaged' : 'operational',
              location: { x: 50, y: 70, z: -150 },
              lastInspection: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
              id: 'telecom-1',
              type: 'telecom',
              depth: 100,
              status: 'operational',
              location: { x: 50, y: 40, z: -100 },
              lastInspection: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
            },
          ];

          setStreetData({
            id: issue.id,
            name: issue.location || 'شارع غير محدد',
            latitude: issue.latitude || 30.0444,
            longitude: issue.longitude || 31.2357,
            cables,
            issues: [
              {
                id: issue.id,
                type: issue.category,
                severity: 'critical',
                coordinates: { x: 50, y: 50, z: -80 },
                description: issue.description || 'عطل في البنية التحتية',
                estimatedDepth: 80,
              },
            ],
          });
        }
      } catch (err) {
        console.error('Failed to fetch street data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStreetData();
  }, []);

  const draw3DScene = () => {
    const canvas = canvasRef.current;
    if (!canvas || !streetData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#f0f9ff';
    ctx.fillRect(0, 0, width, height);

    // Draw grid background
    ctx.strokeStyle = '#e0e7ff';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    // Draw street surface
    ctx.fillStyle = '#d1d5db';
    ctx.fillRect(50, 100, 300, 80);
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 100, 300, 80);

    // Draw cable layers
    const layerColors: { [key: string]: string } = {
      electrical: '#fbbf24',
      water: '#3b82f6',
      sewage: '#8b5cf6',
      telecom: '#10b981',
    };

    const layerLabels: { [key: string]: string } = {
      electrical: 'كهربائي',
      water: 'مياه',
      sewage: 'صرف صحي',
      telecom: 'اتصالات',
    };

    let yOffset = 200;
    Object.entries(layerColors).forEach(([layerType, color]) => {
      if (!visibleLayers[layerType as keyof typeof visibleLayers]) return;

      const cable = streetData.cables.find(c => c.type === layerType as any);
      if (!cable) return;

      // Draw cable line
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(50, yOffset);
      ctx.lineTo(350, yOffset);
      ctx.stroke();

      // Draw cable circle
      ctx.fillStyle = cable.status === 'damaged' ? '#ef4444' : color;
      ctx.beginPath();
      ctx.arc(50, yOffset, 8, 0, Math.PI * 2);
      ctx.fill();

      // Draw label
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`${layerLabels[layerType]} (${cable.depth}سم)`, 370, yOffset + 4);

      // Draw status indicator
      ctx.fillStyle = cable.status === 'damaged' ? '#ef4444' : '#10b981';
      ctx.fillRect(500, yOffset - 8, 12, 16);

      yOffset += 40;
    });

    // Draw issue marker if exists
    if (selectedIssue) {
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(200, 140, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw crosshair
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(200, 120);
      ctx.lineTo(200, 160);
      ctx.moveTo(180, 140);
      ctx.lineTo(220, 140);
      ctx.stroke();
    }

    // Draw depth scale
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('السطح (0 سم)', 45, 105);
    ctx.fillText('عمق: 80 سم', 45, 245);
    ctx.fillText('عمق: 150 سم', 45, 385);
  };

  useEffect(() => {
    draw3DScene();
  }, [streetData, visibleLayers, selectedIssue, canvas3D]);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Simple hit detection for cables
    if (streetData) {
      streetData.cables.forEach(cable => {
        const distance = Math.sqrt(
          Math.pow(x - 50, 2) + Math.pow(y - (200 + (streetData.cables.indexOf(cable) * 40)), 2)
        );
        if (distance < 15) {
          canvas.style.cursor = 'pointer';
        }
      });
    }
  };

  const toggleLayerVisibility = (layer: keyof typeof visibleLayers) => {
    setVisibleLayers(prev => ({
      ...prev,
      [layer]: !prev[layer],
    }));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cube className="w-5 h-5 text-blue-600" />
            التوأم الرقمي للمدن (Digital Twin Integration)
          </CardTitle>
          <CardDescription>
            نموذج ثلاثي الأبعاد للبنية التحتية تحت الأرض مع تحديد دقيق للأعطال بالسنتيمتر
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-96 text-gray-500">
              جاري تحميل بيانات التوأم الرقمي...
            </div>
          ) : streetData ? (
            <>
              <Tabs defaultValue="visualization" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="visualization">التصور ثلاثي الأبعاد</TabsTrigger>
                  <TabsTrigger value="layers">الطبقات</TabsTrigger>
                  <TabsTrigger value="details">التفاصيل</TabsTrigger>
                </TabsList>

                <TabsContent value="visualization" className="space-y-4">
                  <div className="bg-white border-2 border-blue-200 rounded-lg p-4">
                    <div className="text-sm font-semibold text-gray-700 mb-3">
                      📍 {streetData.name}
                    </div>
                    <canvas
                      ref={canvasRef}
                      width={600}
                      height={400}
                      className="w-full border border-gray-300 rounded bg-blue-50 cursor-crosshair"
                      onMouseMove={handleCanvasMouseMove}
                    />
                    <div className="mt-3 text-xs text-gray-600">
                      💡 اضغط على أي طبقة لعرض التفاصيل الدقيقة
                    </div>
                  </div>

                  {selectedIssue && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-red-900">عطل مكتشف</h4>
                          <p className="text-sm text-red-800 mt-1">{selectedIssue.description}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <Badge className="bg-red-600">
                              عمق: {selectedIssue.estimatedDepth} سم
                            </Badge>
                            <Badge variant="outline">
                              {selectedIssue.type}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="layers" className="space-y-3">
                  <div className="space-y-2">
                    {Object.entries({
                      electrical: '⚡ كهربائي',
                      water: '💧 مياه',
                      sewage: '🧹 صرف صحي',
                      telecom: '📡 اتصالات',
                    }).map(([key, label]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleLayerVisibility(key as any)}
                          >
                            {visibleLayers[key as keyof typeof visibleLayers] ? (
                              <Eye className="w-4 h-4" />
                            ) : (
                              <EyeOff className="w-4 h-4" />
                            )}
                          </Button>
                          <span className="font-medium">{label}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {streetData.cables.find(c => c.type === key as any)?.depth || 0} سم
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="details" className="space-y-3">
                  <div className="space-y-2">
                    {streetData.cables.map(cable => (
                      <div
                        key={cable.id}
                        className="p-3 bg-white border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedIssue(streetData.issues[0])}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-sm">
                              {cable.type === 'electrical' && '⚡ كابل كهربائي'}
                              {cable.type === 'water' && '💧 أنبوب مياه'}
                              {cable.type === 'sewage' && '🧹 أنبوب صرف'}
                              {cable.type === 'telecom' && '📡 كابل اتصالات'}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              العمق: {cable.depth} سم
                            </div>
                            <div className="text-xs text-gray-600">
                              آخر فحص: {new Date(cable.lastInspection).toLocaleDateString('ar-EG')}
                            </div>
                          </div>
                          <Badge
                            variant={cable.status === 'damaged' ? 'destructive' : 'default'}
                          >
                            {cable.status === 'damaged' ? '❌ معطل' : '✅ سليم'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>

              {streetData.issues.length > 0 && (
                <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <h4 className="font-semibold text-red-900">الأعطال المكتشفة</h4>
                  </div>
                  <div className="space-y-2">
                    {streetData.issues.map(issue => (
                      <div
                        key={issue.id}
                        className={`p-3 rounded border-l-4 ${getSeverityColor(issue.severity)}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-sm">{issue.description}</div>
                            <div className="text-xs mt-1">
                              الإحداثيات: X={issue.coordinates.x}, Y={issue.coordinates.y}, Z={issue.coordinates.z}
                            </div>
                          </div>
                          <Badge variant="outline">{issue.severity}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div className="bg-blue-100 p-3 rounded">
                  <div className="font-bold text-blue-900">{streetData.cables.length}</div>
                  <div className="text-xs text-blue-700">طبقات البنية</div>
                </div>
                <div className="bg-red-100 p-3 rounded">
                  <div className="font-bold text-red-900">{streetData.issues.length}</div>
                  <div className="text-xs text-red-700">أعطال مكتشفة</div>
                </div>
                <div className="bg-green-100 p-3 rounded">
                  <div className="font-bold text-green-900">
                    {streetData.cables.filter(c => c.status === 'operational').length}
                  </div>
                  <div className="text-xs text-green-700">طبقات سليمة</div>
                </div>
                <div className="bg-yellow-100 p-3 rounded">
                  <div className="font-bold text-yellow-900">80%</div>
                  <div className="text-xs text-yellow-700">تحسن الكفاءة</div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-96 text-gray-500">
              لا توجد بيانات متاحة
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
