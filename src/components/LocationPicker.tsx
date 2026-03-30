import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ensureLeafletDefaults, TILE_LAYER_ATTRIBUTION, TILE_LAYER_URL } from "@/lib/leafletConfig";

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
  readonly?: boolean;
}

const MapClickHandler = ({ onClick }: { onClick: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const LocationPicker = ({ latitude, longitude, onChange, readonly = false }: LocationPickerProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const defaultCenter: [number, number] = [26.8206, 30.8025]; // Egypt center
  const center: [number, number] = latitude && longitude ? [latitude, longitude] : defaultCenter;
  const zoom = latitude && longitude ? 15 : 6;

  useEffect(() => {
    ensureLeafletDefaults();
  }, []);

  useEffect(() => {
    if (latitude && longitude) {
      setError(null);
    }
  }, [latitude, longitude]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("المتصفح لا يدعم تحديد الموقع الجغرافي.");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(pos.coords.latitude, pos.coords.longitude);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError("تم رفض إذن تحديد الموقع. يمكنك اختيار الموقع يدويًا على الخريطة.");
        } else {
          setError("تعذر الحصول على موقعك الحالي. حاول مرة أخرى أو اختر الموقع يدويًا.");
        }
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="space-y-2">
      {!readonly && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGetCurrentLocation}
          disabled={loading}
          className="gap-2 rounded-xl text-xs"
        >
          <Navigation className="w-3.5 h-3.5" />
          {loading ? "جاري تحديد الموقع..." : "حدد موقعي الحالي"}
        </Button>
      )}
      <div className="rounded-xl overflow-hidden border border-border/50" style={{ height: readonly ? 200 : 250 }}>
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={!readonly}
          dragging={!readonly}
          key={`${center[0]}-${center[1]}`}
        >
          <TileLayer
            attribution={TILE_LAYER_ATTRIBUTION}
            url={TILE_LAYER_URL}
          />
          {!readonly && <MapClickHandler onClick={onChange} />}
          {latitude && longitude && <Marker position={[latitude, longitude]} />}
        </MapContainer>
      </div>
      {latitude && longitude && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </p>
      )}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
};

export default LocationPicker;
