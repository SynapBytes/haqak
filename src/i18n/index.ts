import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ar from "./ar.json";
import en from "./en.json";

const DEFAULT_LANG = "ar";
const SUPPORTED_LANGS = ["ar", "en"] as const;
type SupportedLang = (typeof SUPPORTED_LANGS)[number];
const isDev = import.meta.env.DEV;

const EMERGENCY_TRANSLATIONS: Record<SupportedLang, Record<string, unknown>> = {
  ar: {
    center_onboarding: {
      title: "اختيار المركز",
      subtitle: "اختر محافظتك والمركز التابع لك لإكمال إعداد الحساب.",
      governorate: "المحافظة",
      all_governorates: "كل المحافظات",
      center: "المركز",
      continue: "متابعة",
      saved: "تم حفظ المركز بنجاح",
      load_error: "تعذر تحميل المراكز حالياً. حاول مرة أخرى.",
      save_error: "تعذر حفظ المركز. حاول مرة أخرى.",
    },
    common: {
      cancel: "إلغاء",
      delete: "حذف",
      error: "حدث خطأ. حاول مرة أخرى.",
      loading: "جاري التحميل...",
      retry: "إعادة المحاولة",
      unknown: "غير معروف",
    },
    not_found: {
      title: "الصفحة غير موجودة",
      go_home: "العودة للرئيسية",
    },
    reset_password: {
      title: "إعادة تعيين كلمة المرور",
      submit: "تعيين كلمة المرور",
      success: "تم تعيين كلمة المرور بنجاح",
      error: "تعذر تعيين كلمة المرور. حاول مرة أخرى.",
      min_error: "يجب أن تكون كلمة المرور 8 أحرف على الأقل",
      mismatch: "كلمتا المرور غير متطابقتين",
      invalid_link: "رابط إعادة التعيين غير صالح أو منتهي الصلاحية",
      back_to_login: "العودة لتسجيل الدخول",
    },
  },
  en: {
    center_onboarding: {
      title: "Select your center",
      subtitle: "Choose your governorate and local center to complete account setup.",
      governorate: "Governorate",
      all_governorates: "All governorates",
      center: "Center",
      continue: "Continue",
      saved: "Center saved successfully",
      load_error: "Could not load centers right now. Please try again.",
      save_error: "Could not save center. Please try again.",
    },
    common: {
      cancel: "Cancel",
      delete: "Delete",
      error: "An error occurred. Please try again.",
      loading: "Loading...",
      retry: "Retry",
      unknown: "Unknown",
    },
    not_found: {
      title: "Page not found",
      go_home: "Go to home",
    },
    reset_password: {
      title: "Reset Password",
      submit: "Set Password",
      success: "Password set successfully",
      error: "Could not set password. Please try again.",
      min_error: "Password must be at least 8 characters",
      mismatch: "Passwords do not match",
      invalid_link: "Reset link is invalid or expired",
      back_to_login: "Back to login",
    },
  },
};

const resolveLang = (raw?: string | null): SupportedLang => {
  if (!raw) return DEFAULT_LANG;
  const normalized = raw.toLowerCase();
  const base = normalized.split(/[-_]/)[0];
  const match = SUPPORTED_LANGS.find((lng) => normalized === lng || base === lng);
  return match || DEFAULT_LANG;
};

const getSavedLang = () => {
  if (typeof window === "undefined") return DEFAULT_LANG;
  let stored: string | null = null;
  try {
    stored = localStorage.getItem("lang");
  } catch {
    /* ignore storage read failures */
  }

  // Only use saved preference; default to Arabic for first-time visitors
  return resolveLang(stored || DEFAULT_LANG);
};

const getNestedValue = (source: Record<string, unknown>, key: string): unknown => {
  return key.split(".").reduce<unknown>((current, segment) => {
    if (typeof current !== "object" || current === null || !(segment in current)) {
      return undefined;
    }
    return (current as Record<string, unknown>)[segment];
  }, source);
};

const resolveEmergencyValue = (key: string, rawLang?: string) => {
  const preferred = resolveLang(rawLang);
  const direct = getNestedValue(EMERGENCY_TRANSLATIONS[preferred], key);
  if (typeof direct === "string") return direct;
  const fallback = getNestedValue(EMERGENCY_TRANSLATIONS[DEFAULT_LANG], key);
  return typeof fallback === "string" ? fallback : undefined;
};

const updateDocumentLanguage = (lang: string) => {
  if (typeof document === "undefined") return;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = lang;
};

const getActiveLang = () => resolveLang(i18n.resolvedLanguage || i18n.language || DEFAULT_LANG);

const getGenericMissingCopy = (lang: SupportedLang) => {
  return lang === "en" ? "Content unavailable" : "النص غير متاح";
};

const initialLang = getSavedLang();
updateDocumentLanguage(initialLang);

i18n.use(initReactI18next).init({
  resources: { ar: { translation: ar }, en: { translation: en } },
  lng: initialLang,
  supportedLngs: [...SUPPORTED_LANGS],
  nonExplicitSupportedLngs: true,
  fallbackLng: DEFAULT_LANG,
  ns: ["translation"],
  defaultNS: "translation",
  returnNull: false,
  returnEmptyString: false,
  interpolation: { escapeValue: false },
  parseMissingKeyHandler: (key, defaultValue) => {
    const activeLang = getActiveLang();
    const emergencyValue = resolveEmergencyValue(key, activeLang);
    if (isDev) {
      console.warn(`[i18n] Missing translation key "${key}" for "${activeLang}"`);
    }
    if (typeof emergencyValue === "string") return emergencyValue;
    if (typeof defaultValue === "string" && defaultValue.trim()) return defaultValue;
    return isDev ? key : getGenericMissingCopy(activeLang);
  },
});

i18n.on("missingKey", (languages, _namespace, key) => {
  if (!isDev) return;
  console.warn(`[i18n] Missing key event for "${key}" in languages: ${languages.join(", ")}`);
});

i18n.on("languageChanged", (lng) => {
  updateDocumentLanguage(lng);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("lang", lng);
    } catch {
      /* ignore storage write failures */
    }
  }
});

export default i18n;
