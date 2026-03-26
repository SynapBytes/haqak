import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, LogIn, LogOut, Menu, X, MessageSquare, ShieldCheck, Sun, Moon, User, Users, Globe } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import NotificationBell from "./NotificationBell";
import { useState } from "react";

const AppHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, profile, role, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const toggleLang = () => {
    const newLang = i18n.language === "ar" ? "en" : "ar";
    i18n.changeLanguage(newLang);
    localStorage.setItem("lang", newLang);
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = newLang;
  };

  const getLangLabel = () => {
    return i18n.language === "ar" ? "Switch to English" : "التبديل للعربية";
  };

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container flex items-center justify-between h-14 md:h-16 px-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img src="/logo-sawtak.webp" alt={t("app_name")} className="w-9 h-9 rounded-xl shadow-sm group-hover:shadow-md transition-shadow object-contain" />
          <span className="text-xl font-bold text-foreground tracking-tight">{t("app_name")}</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {session && (
            <>
              <Link to="/citizen">
                <Button variant={isActive("/citizen") ? "secondary" : "ghost"} size="sm" className="gap-2">
                  <MessageSquare className="w-4 h-4" /> {t("nav.my_issues")}
                </Button>
              </Link>
              <Link to="/mps">
                <Button variant={isActive("/mps") ? "secondary" : "ghost"} size="sm" className="gap-2">
                  <Users className="w-4 h-4" /> {t("nav.mps")}
                </Button>
              </Link>
              <Link to="/profile">
                <Button variant={isActive("/profile") ? "secondary" : "ghost"} size="sm" className="gap-2">
                  <User className="w-4 h-4" /> {t("nav.my_account")}
                </Button>
              </Link>
              {(role === "mp" || role === "admin") && (
                <Link to="/mp">
                  <Button variant={isActive("/mp") ? "secondary" : "ghost"} size="sm" className="gap-2">
                    <LayoutDashboard className="w-4 h-4" /> {t("nav.mp_dashboard")}
                  </Button>
                </Link>
              )}
              {role === "admin" && (
                <Link to="/admin">
                  <Button variant={isActive("/admin") ? "secondary" : "ghost"} size="sm" className="gap-2">
                    <ShieldCheck className="w-4 h-4" /> {t("nav.admin")}
                  </Button>
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center gap-1.5">
          {/* Language Switcher */}
          <button
            onClick={toggleLang}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={getLangLabel()}
            title={i18n.language === "ar" ? "English" : "العربية"}
          >
            <Globe className="w-[18px] h-[18px]" />
          </button>
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={t("nav.toggle_theme")}
            title={t("nav.toggle_theme")}
          >
            {theme === "dark" ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </button>
          {session && <NotificationBell />}

          {session ? (
            <div className="hidden md:flex items-center gap-3">
              <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center overflow-hidden">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.full_name || t("nav.my_account")} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-accent">{(profile?.full_name || "م").charAt(0)}</span>
                  )}
                </div>
                <span className="text-sm text-muted-foreground max-w-[120px] truncate">{profile?.full_name || t("nav.my_account")}</span>
              </Link>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" /> {t("nav.logout")}
              </Button>
            </div>
          ) : (
            <Link to="/auth" className="hidden md:block">
              <Button size="sm" className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                <LogIn className="w-4 h-4" /> {t("nav.login")}
              </Button>
            </Link>
          )}

          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card px-4 py-3 space-y-2 animate-fade-in">
          {session ? (
            <>
              <div className="flex items-center gap-2 pb-3 mb-2 border-b border-border">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center overflow-hidden">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.full_name || t("nav.my_account")} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-accent">{(profile?.full_name || "م").charAt(0)}</span>
                  )}
                </div>
                <span className="text-sm text-foreground font-medium">{profile?.full_name || t("nav.my_account")}</span>
              </div>
              <Link to="/citizen" onClick={() => setMobileMenuOpen(false)}>
                <Button variant={isActive("/citizen") ? "secondary" : "ghost"} size="sm" className="w-full justify-start gap-2">
                  <MessageSquare className="w-4 h-4" /> {t("nav.my_issues")}
                </Button>
              </Link>
              <Link to="/mps" onClick={() => setMobileMenuOpen(false)}>
                <Button variant={isActive("/mps") ? "secondary" : "ghost"} size="sm" className="w-full justify-start gap-2">
                  <Users className="w-4 h-4" /> {t("nav.mps")}
                </Button>
              </Link>
              <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                <Button variant={isActive("/profile") ? "secondary" : "ghost"} size="sm" className="w-full justify-start gap-2">
                  <User className="w-4 h-4" /> {t("nav.my_account")}
                </Button>
              </Link>
              {(role === "mp" || role === "admin") && (
                <Link to="/mp" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant={isActive("/mp") ? "secondary" : "ghost"} size="sm" className="w-full justify-start gap-2">
                    <LayoutDashboard className="w-4 h-4" /> {t("nav.mp_dashboard")}
                  </Button>
                </Link>
              )}
              {role === "admin" && (
                <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant={isActive("/admin") ? "secondary" : "ghost"} size="sm" className="w-full justify-start gap-2">
                    <ShieldCheck className="w-4 h-4" /> {t("nav.admin")}
                  </Button>
                </Link>
              )}
              <Button variant="outline" size="sm" className="w-full justify-start gap-2 mt-2" onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}>
                <LogOut className="w-4 h-4" /> {t("nav.logout")}
              </Button>
            </>
          ) : (
            <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
              <Button size="sm" className="w-full justify-start gap-2 bg-accent text-accent-foreground">
                <LogIn className="w-4 h-4" /> {t("nav.login")}
              </Button>
            </Link>
          )}
        </div>
      )}
    </header>
  );
};

export default AppHeader;
