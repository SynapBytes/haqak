import React, { useEffect, useState } from 'react';
import { MapPin, Layers, ZoomIn, ZoomOut } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface IssueLocation {
  id: string;
  latitude: number;
  longitude: number;
  category: string;
  status: string;
  title: string;
  location: string;
}

interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number; // 0 to 1
  count: number;
  category: string;
}

export const GISHeatmap: React.FC = () => {
  const [issues, setIssues] = useState<IssueLocation[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(12);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('issues')
          .select('id, latitude, longitude, category, status, title, location')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null);

        if (error) throw error;
        setIssues(data || []);
        generateHeatmap(data || []);
      } catch (err) {
        console.error('Failed to fetch issues:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchIssues();
  }, []);

  const generateHeatmap = (issueList: IssueLocation[]) => {
    // Group issues by proximity (simplified grid-based clustering)
    const gridSize = 0.01; // ~1 km grid
    const grid: { [key: string]: IssueLocation[] } = {};

    issueList.forEach((issue) => {
      const gridKey = `${Math.floor(issue.latitude / gridSize)},${Math.floor(issue.longitude / gridSize)}`;
      if (!grid[gridKey]) grid[gridKey] = [];
      grid[gridKey].push(issue);
    });

    // Convert grid to heatmap points
    const points: HeatmapPoint[] = Object.entries(grid).map(([key, issues]) => {
      const [latGrid, lngGrid] = key.split(',').map(Number);
      const avgLat = (latGrid * gridSize + (latGrid + 1) * gridSize) / 2;
      const avgLng = (lngGrid * gridSize + (lngGrid + 1) * gridSize) / 2;

      return {
        lat: avgLat,
        lng: avgLng,
        count: issues.length,
        intensity: Math.min(issues.length / 10, 1), // Normalize to 0-1
        category: issues[0].category,
      };
    });

    setHeatmapData(points);
  };

  const getColorForIntensity = (intensity: number): string => {
    if (intensity >= 0.8) return 'bg-red-600';
    if (intensity >= 0.6) return 'bg-orange-500';
    if (intensity >= 0.4) return 'bg-yellow-500';
    if (intensity >= 0.2) return 'bg-green-500';
    return 'bg-blue-500';
  };

  const getCategoryIcon = (category: string): string => {
    const icons: { [key: string]: string } = {
      electricity: '⚡',
      water: '💧',
      roads: '🛣️',
      sanitation: '🧹',
      healthcare: '🏥',
      education: '📚',
      security: '🚔',
    };
    return icons[category] || '📍';
  };

  const filteredHeatmapData = selectedCategory
    ? heatmapData.filter(p => p.category === selectedCategory)
    : heatmapData;

  const categories = Array.from(new Set(issues.map(i => i.category)));

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-green-600" />
            خريطة الحرارة التفاعلية (GIS Heatmap)
          </CardTitle>
          <CardDescription>
            تصور جغرافي للشكاوى في دائرتك - الألوان الأحمر تشير إلى تركيز عالي من المشاكل
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(null)}
              size="sm"
            >
              الكل
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(cat)}
                size="sm"
              >
                {getCategoryIcon(cat)} {cat}
              </Button>
            ))}
          </div>

          {/* Map Container (Simplified ASCII representation) */}
          <div className="bg-white border-2 border-gray-200 rounded-lg p-4 min-h-96 relative overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <p>جاري تحميل الخريطة...</p>
              </div>
            ) : (
              <>
                {/* Map Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-cyan-50 opacity-50" />

                {/* Heatmap Points */}
                <div className="relative h-96">
                  {filteredHeatmapData.map((point, idx) => {
                    // Normalize coordinates to map container (simplified)
                    const x = ((point.lng + 180) / 360) * 100;
                    const y = ((point.lat + 90) / 180) * 100;
                    const size = Math.max(20, point.count * 5);

                    return (
                      <div
                        key={idx}
                        className={`absolute rounded-full opacity-70 hover:opacity-100 transition-all cursor-pointer ${getColorForIntensity(
                          point.intensity
                        )}`}
                        style={{
                          left: `${x}%`,
                          top: `${y}%`,
                          width: `${size}px`,
                          height: `${size}px`,
                          transform: 'translate(-50%, -50%)',
                          boxShadow: `0 0 ${size / 2}px rgba(0,0,0,0.3)`,
                        }}
                        title={`${point.count} شكاوى - ${point.category}`}
                      >
                        <div className="flex items-center justify-center h-full text-white font-bold text-xs">
                          {point.count}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg border border-gray-200 text-xs">
                  <div className="font-bold mb-2">مفتاح الألوان:</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-600 rounded" />
                      <span>حرج جداً (8+)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-orange-500 rounded" />
                      <span>حرج (6-8)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-yellow-500 rounded" />
                      <span>مرتفع (4-6)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 rounded" />
                      <span>متوسط (2-4)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-500 rounded" />
                      <span>منخفض (1-2)</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Zoom Controls */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.min(zoom + 1, 20))}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.max(zoom - 1, 8))}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-600 flex items-center">التكبير: {zoom}x</span>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div className="bg-blue-100 p-2 rounded">
              <div className="font-bold text-blue-900">{filteredHeatmapData.length}</div>
              <div className="text-xs text-blue-700">نقاط ساخنة</div>
            </div>
            <div className="bg-red-100 p-2 rounded">
              <div className="font-bold text-red-900">
                {Math.max(...filteredHeatmapData.map(p => p.count), 0)}
              </div>
              <div className="text-xs text-red-700">أقصى تركيز</div>
            </div>
            <div className="bg-green-100 p-2 rounded">
              <div className="font-bold text-green-900">
                {filteredHeatmapData.reduce((sum, p) => sum + p.count, 0)}
              </div>
              <div className="text-xs text-green-700">إجمالي الشكاوى</div>
            </div>
            <div className="bg-yellow-100 p-2 rounded">
              <div className="font-bold text-yellow-900">
                {categories.length}
              </div>
              <div className="text-xs text-yellow-700">فئات</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
