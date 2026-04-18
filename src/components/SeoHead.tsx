import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const SITE_URL = import.meta.env.VITE_SITE_URL || "https://haqak.org";

const upsertMeta = (selector: string, attrs: Record<string, string>) => {
  let node = document.head.querySelector<HTMLMetaElement>(selector);
  if (!node) {
    node = document.createElement("meta");
    document.head.appendChild(node);
  }
  Object.entries(attrs).forEach(([key, value]) => node!.setAttribute(key, value));
};

const upsertLink = (selector: string, attrs: Record<string, string>) => {
  let node = document.head.querySelector<HTMLLinkElement>(selector);
  if (!node) {
    node = document.createElement("link");
    document.head.appendChild(node);
  }
  Object.entries(attrs).forEach(([key, value]) => node!.setAttribute(key, value));
};

const SeoHead = ({ title, description, path = "/" }: { title: string; description: string; path?: string }) => {
  const { i18n } = useTranslation();

  useEffect(() => {
    const lang = i18n.language.startsWith("en") ? "en" : "ar";
    const canonical = `${SITE_URL}${path}`;
    const arabicUrl = `${SITE_URL}/?lang=ar${path === "/" ? "" : `&path=${encodeURIComponent(path)}`}`;
    const englishUrl = `${SITE_URL}/?lang=en${path === "/" ? "" : `&path=${encodeURIComponent(path)}`}`;
    document.title = title;
    upsertMeta('meta[name="description"]', { name: "description", content: description });
    upsertMeta('meta[name="keywords"]', {
      name: "keywords",
      content: "مجلس النواب المصري, تقديم شكاوى, حل مشكلات المواطنين, Egyptian Parliament, citizen complaints",
    });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: title });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: description });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonical });
    upsertMeta('meta[property="og:locale"]', { property: "og:locale", content: lang === "ar" ? "ar_EG" : "en_US" });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: title });
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: description });

    upsertLink('link[rel="canonical"]', { rel: "canonical", href: canonical });
    upsertLink('link[rel="alternate"][hreflang="ar"]', { rel: "alternate", hreflang: "ar", href: arabicUrl });
    upsertLink('link[rel="alternate"][hreflang="en"]', { rel: "alternate", hreflang: "en", href: englishUrl });
    upsertLink('link[rel="alternate"][hreflang="x-default"]', {
      rel: "alternate",
      hreflang: "x-default",
      href: `${SITE_URL}/`,
    });
  }, [description, i18n.language, path, title]);

  return null;
};

export default SeoHead;
