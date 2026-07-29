import { AnimatePresence, motion } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  Globe2,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  ShieldCheck,
  Sun,
  User,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import NotificationBell from "./NotificationBell";
import ImageWithFallback from "@/components/ui/ImageWithFallback";

type SignInCTAProps = {
  label: string;
  className?: string;
  fullWidth?: boolean;
  onClick?: () => void;
};

type NavItem = {
  to: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
};

const AVATAR_PATH_PREFIX = "/storage/v1/object/public/avatars/";

const getSafeAvatarUrl = (avatarUrl: string | null | undefined): string | null => {
  if (!avatarUrl) return null;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return null;

  try {
    const origin = new URL(supabaseUrl).origin;
    const parsed = new URL(avatarUrl);
    const expectedPrefix = `${origin}${AVATAR_PATH_PREFIX}`;
    return parsed.href.startsWith(expectedPrefix) ? parsed.href : null;
  } catch {
    return null;
  }
};

const SignInCTAButton = ({ label, className, fullWidth = false, onClick }: SignInCTAProps) => (
  <Link to="/auth" className={className} onClick={onClick}>
    <Button
      size="sm"
      className={`premium-cta h-10 gap-2 rounded-xl px-4 font-bold ${fullWidth ? "w-full justify-center" : ""}`}
    >
      <LogIn className="h-4 w-4" />
      {label}
    </Button>
  </Link>
);

const AppHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, profile, role, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const safeAvatarUrl = getSafeAvatarUrl(profile?.avatar_url);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const toggleLang = () => {
    const newLang = i18n.language === "ar" ? "en" : "ar";
    i18n.changeLanguage(newLang);
  };

  const getLangLabel = () =>
    i18n.language === "ar" ? t("nav.switch_to_english") : t("nav.switch_to_arabic");

  const publicItems: NavItem[] = [
    { to: "/success-stories", label: t("nav.success_stories") },
    { to: "/faq", label: t("nav.faq") },
    { to: "/support", label: t("nav.support") },
  ];

  const privateItems: NavItem[] = session
    ? [
        { to: "/citizen", label: t("nav.my_issues"), icon: MessageSquare },
        { to: "/mps", label: t("nav.mps"), icon: Users },
        { to: "/profile", label: t("nav.my_account"), icon: User },
      ]
    : [];

  if (session && (role === "mp" || role === "admin")) {
    privateItems.push({ to: "/mp", label: t("nav.mp_dashboard"), icon: LayoutDashboard });
  }

  if (session && role === "mp") {
    privateItems.push({ to: "/mp/settings", label: t("nav.mp_settings"), icon: Building2 });
  }

  if (session && role === "admin") {
    privateItems.push({ to: "/admin", label: t("nav.admin"), icon: ShieldCheck });
  }

  const HeaderIconButton = ({
    onClick,
    label,
    children,
  }: {
    onClick: () => void;
    label: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-muted-foreground transition-all duration-200 hover:border-border/70 hover:bg-card/70 hover:text-foreground"
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/65 bg-background/72 shadow-[0_1px_0_hsl(var(--surface-highlight)/0.35)] backdrop-blur-2xl supports-[backdrop-filter]:bg-background/62">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/24 to-transparent" />
        <div className="container flex h-[4.5rem] items-center justify-between gap-4 px-5 sm:px-8 lg:h-20">
          <Link to="/" className="group flex shrink-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-card/70 shadow-[inset_0_1px_0_hsl(var(--surface-highlight)/0.65),0_12px_30px_-22px_hsl(var(--foreground)/0.45)] backdrop-blur-xl transition-transform duration-300 group-hover:-translate-y-0.5">
              <picture className="flex items-center">
                <source srcSet="/haqak-logo.webp" type="image/webp" />
                <ImageWithFallback
                  src="/haqak-logo.png"
                  fallbackSrc="/logo-haqak.svg"
                  alt="HAQAK logo"
                  className="h-7 w-7 object-contain"
                />
              </picture>
            </div>
            <div className="hidden sm:block">
              <picture className="flex h-7 items-center">
                <source srcSet="/haqak-wordmark.webp" type="image/webp" />
                <ImageWithFallback
                  src="/haqak-wordmark.png"
                  fallbackSrc="/haqak-logo.png"
                  alt={t("app_name")}
                  className="h-7 w-auto object-contain"
                />
              </picture>
              <p className="mt-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.19em] text-muted-foreground/70">
                CIVIC COMMUNICATION
              </p>
            </div>
            <span className="sr-only">{t("app_name")}</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
            {publicItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`relative rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
                  isActive(item.to) ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
                {isActive(item.to) && (
                  <motion.span
                    layoutId="header-active-route"
                    className="absolute inset-x-3 -bottom-[1.22rem] h-px bg-accent shadow-[0_0_12px_hsl(var(--accent)/0.7)]"
                  />
                )}
              </Link>
            ))}

            {session && <span className="mx-2 h-5 w-px bg-border/80" />}

            {privateItems.slice(0, 3).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all ${
                  isActive(item.to)
                    ? "bg-accent/[0.08] text-accent"
                    : "text-muted-foreground hover:bg-card/65 hover:text-foreground"
                }`}
              >
                {item.icon && <item.icon className="h-4 w-4" />}
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-1.5">
            <HeaderIconButton onClick={toggleLang} label={getLangLabel()}>
              <Globe2 className="h-[18px] w-[18px]" />
            </HeaderIconButton>

            <HeaderIconButton onClick={toggleTheme} label={t("nav.toggle_theme")}>
              {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </HeaderIconButton>

            {session && <NotificationBell />}

            {session ? (
              <div className="hidden items-center gap-2.5 md:flex">
                <Link
                  to="/profile"
                  className="flex items-center gap-2.5 rounded-xl border border-transparent p-1.5 pe-3 transition-all hover:border-border/70 hover:bg-card/65"
                >
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl border border-accent/15 bg-accent/[0.08]">
                    {safeAvatarUrl ? (
                      <ImageWithFallback
                        src={safeAvatarUrl}
                        alt={profile?.full_name || t("nav.my_account")}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold text-accent">{(profile?.full_name || "م").charAt(0)}</span>
                    )}
                  </div>
                  <span className="max-w-[118px] truncate text-xs font-semibold text-foreground">
                    {profile?.full_name || t("nav.my_account")}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
                  aria-label={t("nav.logout")}
                  title={t("nav.logout")}
                >
                  <LogOut className="h-[18px] w-[18px]" />
                </button>
              </div>
            ) : (
              <SignInCTAButton label={t("nav.login")} className="hidden md:block" />
            )}

            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-card/70 hover:text-foreground lg:hidden"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label={mobileMenuOpen ? t("nav.close_menu") : t("nav.open_menu")}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-xl lg:hidden"
          >
            <motion.div
              initial={{ opacity: 0, y: -14, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-4 top-[5.25rem] max-h-[calc(100vh-6.5rem)] overflow-y-auto rounded-[1.75rem] border border-border/70 bg-card/90 p-4 shadow-[0_35px_100px_-45px_hsl(var(--foreground)/0.6)] backdrop-blur-2xl sm:inset-x-8"
            >
              {session && (
                <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border/65 bg-background/55 p-3">
                  <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-accent/15 bg-accent/[0.08]">
                    {safeAvatarUrl ? (
                      <ImageWithFallback
                        src={safeAvatarUrl}
                        alt={profile?.full_name || t("nav.my_account")}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-bold text-accent">{(profile?.full_name || "م").charAt(0)}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{profile?.full_name || t("nav.my_account")}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{role || t("nav.my_account")}</p>
                  </div>
                </div>
              )}

              <nav className="grid gap-1" aria-label="Mobile navigation">
                {[...publicItems, ...privateItems].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                      isActive(item.to)
                        ? "bg-accent/[0.1] text-accent"
                        : "text-muted-foreground hover:bg-background/65 hover:text-foreground"
                    }`}
                  >
                    {item.icon ? <item.icon className="h-4.5 w-4.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-accent/65" />}
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-4 border-t border-border/65 pt-4">
                {session ? (
                  <Button
                    variant="outline"
                    className="h-11 w-full gap-2 rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      handleSignOut();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    {t("nav.logout")}
                  </Button>
                ) : (
                  <SignInCTAButton
                    label={t("nav.login")}
                    className="block"
                    fullWidth
                    onClick={() => setMobileMenuOpen(false)}
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AppHeader;
