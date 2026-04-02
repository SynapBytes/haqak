import L from "leaflet";
import "leaflet/dist/leaflet.css";

export const TILE_LAYER_URL = import.meta.env.VITE_MAP_TILE_URL || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.webp";
export const TILE_LAYER_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

let configured = false;

export const ensureLeafletDefaults = () => {
  if (configured) return;

  delete (L.Icon.Default.prototype as { _getIconUrl?: () => string })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.webp",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.webp",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.webp",
  });

  configured = true;
};

export default ensureLeafletDefaults;
