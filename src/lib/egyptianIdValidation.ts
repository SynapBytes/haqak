/**
 * Egyptian National ID Validation Utility
 * Validates Egyptian national ID numbers and extracts information
 */

/**
 * Validates Egyptian national ID number
 * Egyptian ID format: 14 digits
 * Structure: CYYMMDDCCSSSNG
 * - C: Century indicator (2 = 1900s, 3 = 2000s)
 * - YY: Birth year (00-99)
 * - MM: Birth month (01-12)
 * - DDD: Birth day (01-31)
 * - CC: Governorate code (01-29)
 * - SSS: Serial number (001-999)
 * - N: Gender (1-4 for males, 5-8 for females)
 * - G: Final digit (historically used as checksum, often unreliable in data)
 */
const CENTURY_BASE_YEARS: Record<number, number> = { 1: 1800, 2: 1900, 3: 2000 };

export const validateEgyptianId = (id: string, currentTimestamp: number = Date.now()): boolean => {
  // Keep only digits
  const cleanId = id.replace(/\D/g, "");

  // Check if it's exactly 14 digits
  if (!/^\d{14}$/.test(cleanId)) {
    return false;
  }

  // Extract parts
  const centuryIndicator = parseInt(cleanId[0], 10);
  const year = parseInt(cleanId.substring(1, 3), 10);
  const month = parseInt(cleanId.substring(3, 5), 10);
  const day = parseInt(cleanId.substring(5, 7), 10);
  const governorate = parseInt(cleanId.substring(7, 9), 10);
  const genderCode = parseInt(cleanId.substring(12, 13), 10);

  // Validate century indicator (supports 1800s, 1900s, 2000s)
  const baseYear = CENTURY_BASE_YEARS[centuryIndicator];
  if (!baseYear) {
    return false;
  }

  const fullYear = baseYear + year;

  // Validate month (01-12)
  if (month < 1 || month > 12) {
    return false;
  }

  // Validate day using real calendar
  const date = new Date(Date.UTC(fullYear, month - 1, day));
  if (
    date.getUTCFullYear() !== fullYear ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return false;
  }

  // Reject IDs with future birth dates
  if (date.getTime() > currentTimestamp) {
    return false;
  }

  // Validate governorate code (01-29)
  if (governorate < 1 || governorate > 29) {
    return false;
  }

  // Validate gender code (1-8)
  if (genderCode < 1 || genderCode > 8) {
    return false;
  }

  // Check digit historically exists but is unreliable in many IDs issued before
  // digitization. Relying on it was blocking real users with valid 14-digit IDs,
  // so we intentionally accept structurally valid IDs without enforcing the digit.
  return true;
};

/**
 * Extracts information from a valid Egyptian national ID
 */
export const extractEgyptianIdInfo = (id: string) => {
  const cleanId = id.replace(/\D/g, "");

  if (!validateEgyptianId(cleanId)) {
    return null;
  }

  const centuryIndicator = parseInt(cleanId[0], 10);
  const year = parseInt(cleanId.substring(1, 3), 10);
  const month = parseInt(cleanId.substring(3, 5), 10);
  const day = parseInt(cleanId.substring(5, 7), 10);
  const governorateCode = parseInt(cleanId.substring(7, 9), 10);
  const genderCode = parseInt(cleanId.substring(12, 13), 10);

  // Determine century
  const baseYear = CENTURY_BASE_YEARS[centuryIndicator];
  if (!baseYear) {
    return null;
  }
  const fullYear = baseYear + year;

  // Determine gender
  const gender = genderCode % 2 === 1 ? "male" : "female";

  // Governorate mapping
  const governorateMap: { [key: number]: string } = {
    1: "القاهرة",
    2: "الإسكندرية",
    3: "بورسعيد",
    4: "السويس",
    5: "دمياط",
    6: "الدقهلية",
    7: "الشرقية",
    8: "الإسماعيلية",
    9: "الغربية",
    10: "المنوفية",
    11: "القليوبية",
    12: "البحيرة",
    13: "الفيوم",
    14: "بني سويف",
    15: "المنيا",
    16: "أسيوط",
    17: "سوهاج",
    18: "قنا",
    19: "الأقصر",
    20: "أسوان",
    21: "مطروح",
    22: "شمال سيناء",
    23: "جنوب سيناء",
    24: "الوادي الجديد",
    25: "البحر الأحمر",
    26: "الجيزة",
    27: "حلوان",
    28: "السادس من أكتوبر",
    29: "الشروق",
  };

  const governorate = governorateMap[governorateCode] || "غير معروفة";

  return {
    id: cleanId,
    birthYear: fullYear,
    birthMonth: month,
    birthDay: day,
    governorate,
    governorateCode,
    gender,
    isEgyptian: true,
  };
};

/**
 * Validates phone number format
 * Supports Egyptian phone numbers in various formats
 */
export const validatePhoneNumber = (phone: string, countryCode?: string): boolean => {
  const cleanPhone = phone.replace(/[\s-()]/g, "");

  // If country code is provided, check if it's Egypt
  if (countryCode && countryCode !== "EG" && countryCode !== "+20") {
    return false;
  }

  // Egyptian phone number patterns
  // Landline: 02 (Cairo), 03 (Alexandria), etc.
  // Mobile: 01X (where X is 0, 1, 2, or 5)
  const egyptianPhoneRegex = /^(?:\+20|0)?(?:2[0-9]|3[0-9]|4[0-9]|5[0-9]|6[0-9]|8[0-9]|9[0-9]|1[0-2])[0-9]{6,8}$/;

  return egyptianPhoneRegex.test(cleanPhone);
};

/**
 * Formats phone number to standard Egyptian format
 */
export const formatPhoneNumber = (phone: string, countryCode: string = "EG"): string => {
  const cleanPhone = phone.replace(/[\s-()]/g, "");

  if (countryCode === "EG" || countryCode === "+20") {
    // Remove leading 0 if present
    const withoutLeadingZero = cleanPhone.replace(/^0/, "");
    // Add country code
    return `+20${withoutLeadingZero}`;
  }

  return cleanPhone;
};

/**
 * Gets the country code for a phone number
 */
export const getCountryCodeFromPhone = (phone: string): string | null => {
  const cleanPhone = phone.replace(/[\s-()]/g, "");

  if (cleanPhone.startsWith("+20") || cleanPhone.startsWith("0020")) {
    return "EG";
  }

  if (cleanPhone.startsWith("+")) {
    return cleanPhone.substring(1, 3);
  }

  if (cleanPhone.startsWith("01")) {
    return "EG";
  }

  return null;
};
