/**
 * Egyptian National ID Validation Utility
 * Validates Egyptian national ID numbers and extracts information
 */

/**
 * Validates Egyptian national ID number
 * Egyptian ID format: 14 digits
 * Structure: YYMMDDDCCSSSNX
 * - YY: Birth year (00-99)
 * - MM: Birth month (01-12)
 * - DDD: Birth day (01-31)
 * - CC: Governorate code (01-29)
 * - SSS: Serial number (001-999)
 * - N: Gender (1-4 for males, 5-8 for females)
 * - X: Check digit
 */
export const validateEgyptianId = (id: string): boolean => {
  // Remove spaces and dashes
  const cleanId = id.replace(/[\s-]/g, "");

  // Check if it's exactly 14 digits
  if (!/^\d{14}$/.test(cleanId)) {
    return false;
  }

  // Extract parts
  const year = parseInt(cleanId.substring(0, 2), 10);
  const month = parseInt(cleanId.substring(2, 4), 10);
  const day = parseInt(cleanId.substring(4, 6), 10);
  const governorate = parseInt(cleanId.substring(6, 8), 10);
  const genderCode = parseInt(cleanId.substring(12, 13), 10);

  // Validate month (01-12)
  if (month < 1 || month > 12) {
    return false;
  }

  // Validate day (01-31)
  if (day < 1 || day > 31) {
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

  // Validate check digit using Luhn algorithm
  const weights = [29, 27, 23, 19, 17, 29, 27, 23, 19, 17, 29, 27, 23, 19];
  let sum = 0;

  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanId[i], 10) * weights[i];
  }

  const checkDigit = (11 - (sum % 11)) % 10;
  const providedCheckDigit = parseInt(cleanId[13], 10);

  return checkDigit === providedCheckDigit;
};

/**
 * Extracts information from a valid Egyptian national ID
 */
export const extractEgyptianIdInfo = (id: string) => {
  const cleanId = id.replace(/[\s-]/g, "");

  if (!validateEgyptianId(cleanId)) {
    return null;
  }

  const year = parseInt(cleanId.substring(0, 2), 10);
  const month = parseInt(cleanId.substring(2, 4), 10);
  const day = parseInt(cleanId.substring(4, 6), 10);
  const governorateCode = parseInt(cleanId.substring(6, 8), 10);
  const genderCode = parseInt(cleanId.substring(12, 13), 10);

  // Determine century (1900 or 2000)
  const fullYear = year > 30 ? 1900 + year : 2000 + year;

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
