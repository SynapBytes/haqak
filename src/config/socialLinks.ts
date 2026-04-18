export type SocialPlatform = "x" | "facebook" | "linkedin";

export type SocialLinkConfig = {
  id: SocialPlatform;
  href: string;
};

const RAW_SOCIAL_LINKS: readonly SocialLinkConfig[] = [
  {
    id: "x",
    href: import.meta.env.VITE_SOCIAL_X_URL || "https://x.com/HaqakOfficial",
  },
  {
    id: "facebook",
    href: import.meta.env.VITE_SOCIAL_FACEBOOK_URL || "https://www.facebook.com/HaqakOfficial",
  },
  {
    id: "linkedin",
    href: import.meta.env.VITE_SOCIAL_LINKEDIN_URL || "https://www.linkedin.com/company/haqakofficial",
  },
] as const;

export const isValidSocialHref = (href: string): boolean => {
  if (!href || !href.trim()) return false;
  try {
    const parsed = new URL(href);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

export const getEnabledSocialLinks = (): SocialLinkConfig[] => {
  return RAW_SOCIAL_LINKS.filter((item) => isValidSocialHref(item.href));
};

export const SOCIAL_LINKS_CONFIG = RAW_SOCIAL_LINKS;
