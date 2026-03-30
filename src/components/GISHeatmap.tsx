import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, Layers, Navigation } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { MapContainer, TileLayer, Marker, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import { ensureLeafletDefaults, TILE_LAYER_ATTRIBUTION, TILE_LAYER_URL } from '@/lib/leafletConfig';
import L from 'leaflet';

const MAP_PADDING = 40;
const MAX_FIT_ZOOM = 15;

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
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const defaultCenter: [number, number] = [26.8206, 30.8025]; // Egypt

  useEffect(() => {
    ensureLeafletDefaults();
  }, []);

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
      } catch (err) {
        console.error('Failed to fetch issues:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchIssues();
  }, []);

  const generateHeatmap = (issueList: IssueLocation[]): HeatmapPoint[] => {
    const gridSize = 0.05; // ~5 km grid
    const grid: Record<string, IssueLocation[]> = {};

    issueList.forEach((issue) => {
      const gridKey = `${Math.floor(issue.latitude / gridSize)},${Math.floor(issue.longitude / gridSize)}`;
      if (!grid[gridKey]) grid[gridKey] = [];
      grid[gridKey].push(issue);
    });

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

    return points;
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

  const categories = Array.from(new Set(issues.map(i => i.category)));

  const filteredIssues = useMemo(() => {
    let filtered = [...issues];

    if (selectedCategory) {
      filtered = filtered.filter((issue) => issue.category === selectedCategory);
    }

    if (nearbyOnly && userPosition) {
      filtered = filtered.filter((issue) => {
        const distance = haversineDistance(userPosition.lat, userPosition.lng, issue.latitude, issue.longitude);
        return distance <= 10; // km
      });
    }

    return filtered;
  }, [issues, selectedCategory, nearbyOnly, userPosition]);

  const heatmapData = useMemo(() => generateHeatmap(filteredIssues), [filteredIssues]);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setGeoError("المتصفح لا يدعم تحديد الموقع الجغرافي.");
      return;
    }

    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError("تم رفض إذن تحديد الموقع. يمكنك استخدام الخريطة بدون تحديد موقعك.");
        } else {
          setGeoError("تعذر الحصول على موقعك الحالي.");
        }
      },
      { enableHighAccuracy: true }
    );
  };

  const hasLocationData = filteredIssues.length > 0;
  const markerPositions = filteredIssues.map((issue) => [issue.latitude, issue.longitude] as [number, number]);

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

          <div className="flex flex-wrap gap-2 items-center">
            <Button variant="outline" size="sm" onClick={handleLocate} className="gap-2">
              <Navigation className="w-4 h-4" />
              موقعي الحالي
            </Button>
            <Button
              variant={nearbyOnly ? 'default' : 'outline'}
              size="sm"
              disabled={!userPosition}
              onClick={() => setNearbyOnly((prev) => !prev)}
              className="gap-2"
            >
              {nearbyOnly ? 'إظهار كل الشكاوى' : 'الشكاوى القريبة (10 كم)'}
            </Button>
            {geoError && <span className="text-xs text-destructive">{geoError}</span>}
          </div>

          {/* Map Container */}
          <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
            <div className="relative" style={{ height: 420 }}>
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <p>جاري تحميل الخريطة...</p>
                </div>
              ) : (
                <MapContainer
                  center={defaultCenter}
                  zoom={6}
                  scrollWheelZoom
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer attribution={TILE_LAYER_ATTRIBUTION} url={TILE_LAYER_URL} />
                  <FitBounds positions={markerPositions} fallbackCenter={defaultCenter} />

                  {userPosition && (
                    <CircleMarker
                      center={[userPosition.lat, userPosition.lng]}
                      radius={10}
                      pathOptions={{ color: '#0ea5e9', fillColor: '#0ea5e9', fillOpacity: 0.3 }}
                    >
                      <Tooltip direction="top">موقعي الحالي</Tooltip>
                    </CircleMarker>
                  )}

                  {heatmapData.map((point, idx) => {
                    const color = getLeafletColor(point.intensity);
                    return (
                      <CircleMarker
                        key={`heat-${idx}`}
                        center={[point.lat, point.lng]}
                        radius={Math.max(8, point.count * 2)}
                        pathOptions={{ color, fillColor: color, fillOpacity: 0.35 }}
                      >
                        <Tooltip direction="top">
                          {point.count} شكوى - {point.category}
                        </Tooltip>
                      </CircleMarker>
                    );
                  })}

                  {filteredIssues.map((issue) => (
                    <Marker key={issue.id} position={[issue.latitude, issue.longitude]}>
                      <Popup>
                        <div className="space-y-1 text-sm">
                          <p className="font-semibold">{issue.title}</p>
                          <p className="text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {issue.location || 'موقع غير محدد'}
                          </p>
                          <p className="text-xs">
                            الفئة: <span className="font-semibold">{issue.category}</span>
                          </p>
                          <p className="text-xs">
                            الحالة: <span className="font-semibold">{issue.status}</span>
                          </p>
                        </div>
                      </Popup>
                      <Tooltip direction="top">{issue.title}</Tooltip>
                    </Marker>
                  ))}
                </MapContainer>
              )}
            </div>

            {!loading && !hasLocationData && (
              <div className="p-4 text-center text-muted-foreground text-sm">
                لا توجد شكاوى جغرافية لعرضها حالياً.
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 text-xs">
            <LegendItem color="bg-red-600" label="حرج جداً (8+ شكاوى)" />
            <LegendItem color="bg-orange-500" label="حرج (6-8 شكاوى)" />
            <LegendItem color="bg-yellow-500" label="مرتفع (4-6 شكاوى)" />
            <LegendItem color="bg-green-500" label="متوسط (2-4 شكاوى)" />
            <LegendItem color="bg-blue-500" label="منخفض (1-2 شكوى)" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const FitBounds = ({ positions, fallbackCenter }: { positions: [number, number][]; fallbackCenter: [number, number] }) => {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 0) {
      map.setView(fallbackCenter, 6);
      return;
    }

    const bounds = L.latLngBounds(positions);
    map.fitBounds(bounds, { padding: [MAP_PADDING, MAP_PADDING], maxZoom: MAX_FIT_ZOOM });
  }, [fallbackCenter, map, positions]);

  return null;
};

const LegendItem = ({ color, label }: { color: string; label: string }) => (
  <div className="flex items-center gap-2">
    <span className={`w-4 h-4 rounded ${color}`} />
    <span>{label}</span>
  </div>
);

const getLeafletColor = (intensity: number) => {
  if (intensity >= 0.8) return '#dc2626';
  if (intensity >= 0.6) return '#f97316';
  if (intensity >= 0.4) return '#eab308';
  if (intensity >= 0.2) return '#22c55e';
  return '#2563eb';
};

const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
