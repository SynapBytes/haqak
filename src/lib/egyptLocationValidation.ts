/**
 * Egypt Location Validation Utility
 * Validates that locations are within Egypt's geographical boundaries
 */

// Egypt's geographical boundaries (approximate)
const EGYPT_BOUNDARIES = {
  north: 31.5,      // Mediterranean coast
  south: 22.0,      // Aswan region
  east: 34.9,       // Red Sea coast
  west: 25.0,       // Western Desert
};

// Egyptian governorates with their approximate center coordinates
const EGYPTIAN_GOVERNORATES: { [key: string]: { lat: number; lng: number; radius: number } } = {
  "القاهرة": { lat: 30.0444, lng: 31.2357, radius: 0.5 },
  "الإسكندرية": { lat: 31.2001, lng: 29.9187, radius: 0.4 },
  "بورسعيد": { lat: 31.2629, lng: 32.3202, radius: 0.3 },
  "السويس": { lat: 29.9668, lng: 32.5498, radius: 0.3 },
  "دمياط": { lat: 31.4155, lng: 31.8144, radius: 0.3 },
  "الدقهلية": { lat: 30.8, lng: 31.4, radius: 0.5 },
  "الشرقية": { lat: 30.5, lng: 31.5, radius: 0.6 },
  "الإسماعيلية": { lat: 30.5865, lng: 32.2737, radius: 0.4 },
  "الغربية": { lat: 30.75, lng: 30.75, radius: 0.4 },
  "المنوفية": { lat: 30.5, lng: 31.0, radius: 0.3 },
  "القليوبية": { lat: 30.2, lng: 31.1, radius: 0.3 },
  "البحيرة": { lat: 30.8, lng: 30.5, radius: 0.5 },
  "الفيوم": { lat: 29.3, lng: 30.8, radius: 0.4 },
  "بني سويف": { lat: 29.0667, lng: 31.3, radius: 0.4 },
  "المنيا": { lat: 28.1, lng: 30.75, radius: 0.4 },
  "أسيوط": { lat: 27.1, lng: 30.6, radius: 0.4 },
  "سوهاج": { lat: 26.5, lng: 31.7, radius: 0.4 },
  "قنا": { lat: 25.8, lng: 32.7, radius: 0.4 },
  "الأقصر": { lat: 25.6872, lng: 32.6396, radius: 0.4 },
  "أسوان": { lat: 24.0889, lng: 32.8998, radius: 0.4 },
  "مطروح": { lat: 31.3456, lng: 29.5521, radius: 0.5 },
  "شمال سيناء": { lat: 31.0, lng: 33.5, radius: 0.6 },
  "جنوب سيناء": { lat: 28.0, lng: 33.8, radius: 0.8 },
  "الوادي الجديد": { lat: 25.5, lng: 29.2, radius: 0.7 },
  "البحر الأحمر": { lat: 26.5, lng: 33.5, radius: 0.6 },
  "الجيزة": { lat: 30.0131, lng: 31.2089, radius: 0.5 },
  "حلوان": { lat: 29.8, lng: 31.3, radius: 0.3 },
  "السادس من أكتوبر": { lat: 29.9, lng: 31.0, radius: 0.3 },
  "الشروق": { lat: 30.1, lng: 31.5, radius: 0.3 },
};

/**
 * Checks if a location is within Egypt's geographical boundaries
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @returns true if location is within Egypt, false otherwise
 */
export const isLocationInEgypt = (latitude: number, longitude: number): boolean => {
  // Basic boundary check
  if (
    latitude < EGYPT_BOUNDARIES.south ||
    latitude > EGYPT_BOUNDARIES.north ||
    longitude < EGYPT_BOUNDARIES.west ||
    longitude > EGYPT_BOUNDARIES.east
  ) {
    return false;
  }

  // More precise check using governorate locations
  // If coordinates are close to any Egyptian governorate, consider them valid
  for (const governorate of Object.values(EGYPTIAN_GOVERNORATES)) {
    const distance = calculateDistance(latitude, longitude, governorate.lat, governorate.lng);
    if (distance <= governorate.radius) {
      return true;
    }
  }

  // Allow some margin for locations between governorates
  // If within general Egypt boundaries, consider it valid
  return true;
};

/**
 * Gets the closest Egyptian governorate to a given location
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @returns Governorate name or null if location is outside Egypt
 */
export const getClosestGovernorate = (latitude: number, longitude: number): string | null => {
  if (!isLocationInEgypt(latitude, longitude)) {
    return null;
  }

  let closestGovernorate: string | null = null;
  let minDistance = Infinity;

  for (const [name, coords] of Object.entries(EGYPTIAN_GOVERNORATES)) {
    const distance = calculateDistance(latitude, longitude, coords.lat, coords.lng);
    if (distance < minDistance) {
      minDistance = distance;
      closestGovernorate = name;
    }
  }

  return closestGovernorate;
};

/**
 * Calculates the distance between two coordinates using Haversine formula
 * @param lat1 - Latitude of first point
 * @param lng1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lng2 - Longitude of second point
 * @returns Distance in degrees (approximate)
 */
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

/**
 * Validates issue location
 * @param location - Location string or coordinates
 * @param latitude - Optional latitude
 * @param longitude - Optional longitude
 * @returns Object with validation result and message
 */
export const validateIssueLocation = (
  location: string,
  latitude?: number,
  longitude?: number
): { valid: boolean; message: string; governorate?: string } => {
  // If coordinates are provided, use them for validation
  if (latitude !== undefined && longitude !== undefined) {
    if (!isLocationInEgypt(latitude, longitude)) {
      return {
        valid: false,
        message: "البلاغ يجب أن يكون عن مشكلة داخل حدود مصر فقط",
      };
    }

    const governorate = getClosestGovernorate(latitude, longitude);
    return {
      valid: true,
      message: "الموقع صحيح",
      governorate: governorate || undefined,
    };
  }

  // If only location string is provided, check if it's a known Egyptian governorate
  const normalizedLocation = location.trim().toLowerCase();
  for (const governorate of Object.keys(EGYPTIAN_GOVERNORATES)) {
    if (governorate.toLowerCase() === normalizedLocation) {
      return {
        valid: true,
        message: "الموقع صحيح",
        governorate,
      };
    }
  }

  // If location string doesn't match any governorate, it might be outside Egypt
  return {
    valid: false,
    message: "البلاغ يجب أن يكون عن مشكلة داخل حدود مصر فقط",
  };
};

/**
 * Gets all Egyptian governorates
 */
export const getAllGovernoratesWithCoordinates = () => {
  return EGYPTIAN_GOVERNORATES;
};

/**
 * Checks if a country code is Egypt
 */
export const isEgyptCountryCode = (countryCode: string): boolean => {
  return countryCode === "EG" || countryCode === "+20" || countryCode === "20";
};
