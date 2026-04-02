import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ar from "./ar.json";
import en from "./en.json";

const DEFAULT_LANG = "ar";
const SUPPORTED_LANGS = ["ar", "en"] as const;
type SupportedLang = (typeof SUPPORTED_LANGS)[number];

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

const updateDocumentLanguage = (lang: string) => {
  if (typeof document === "undefined") return;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = lang;
};

const initialLang = getSavedLang();
updateDocumentLanguage(initialLang);

i18n.use(initReactI18next).init({
  resources: { ar: { translation: ar }, en: { translation: en } },
  lng: initialLang,
  fallbackLng: DEFAULT_LANG,
  interpolation: { escapeValue: false },
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
