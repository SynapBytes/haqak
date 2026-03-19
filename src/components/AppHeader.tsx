import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, LogIn, LogOut, Menu, X, MessageSquare, ShieldCheck, Sun, Moon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import NotificationBell from "./NotificationBell";
import { useState } from "react";

const AppHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, profile, role, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container flex items-center justify-between h-14 md:h-16 px-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
            <span className="text-white font-bold text-sm">ص</span>
          </div>
          <span className="text-xl font-bold text-foreground tracking-tight">صوتك</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {session && (
            <>
              <Link to="/citizen">
                <Button variant={isActive("/citizen") ? "secondary" : "ghost"} size="sm" className="gap-2">
                  <MessageSquare className="w-4 h-4" /> لوحة المواطن
                </Button>
              </Link>
              {(role === "mp" || role === "admin") && (
                <Link to="/mp">
                  <Button variant={isActive("/mp") ? "secondary" : "ghost"} size="sm" className="gap-2">
                    <LayoutDashboard className="w-4 h-4" /> لوحة النائب
                  </Button>
                </Link>
              )}
              {role === "admin" && (
                <Link to="/admin">
                  <Button variant={isActive("/admin") ? "secondary" : "ghost"} size="sm" className="gap-2">
                    <ShieldCheck className="w-4 h-4" /> الإدارة
                  </Button>
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="تبديل الوضع"
          >
            {theme === "dark" ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </button>
          {session && <NotificationBell />}

          {session ? (
            <div className="hidden md:flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-accent">{(profile?.full_name || "م").charAt(0)}</span>
                </div>
                <span className="text-sm text-muted-foreground max-w-[120px] truncate">{profile?.full_name || "مستخدم"}</span>
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" /> خروج
              </Button>
            </div>
          ) : (
            <Link to="/auth" className="hidden md:block">
              <Button size="sm" className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                <LogIn className="w-4 h-4" /> تسجيل الدخول
              </Button>
            </Link>
          )}

          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
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
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-accent">{(profile?.full_name || "م").charAt(0)}</span>
                </div>
                <span className="text-sm text-foreground font-medium">{profile?.full_name || "مستخدم"}</span>
              </div>
              <Link to="/citizen" onClick={() => setMobileMenuOpen(false)}>
                <Button variant={isActive("/citizen") ? "secondary" : "ghost"} size="sm" className="w-full justify-start gap-2">
                  <MessageSquare className="w-4 h-4" /> لوحة المواطن
                </Button>
              </Link>
              {(role === "mp" || role === "admin") && (
                <Link to="/mp" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant={isActive("/mp") ? "secondary" : "ghost"} size="sm" className="w-full justify-start gap-2">
                    <LayoutDashboard className="w-4 h-4" /> لوحة النائب
                  </Button>
                </Link>
              )}
              {role === "admin" && (
                <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant={isActive("/admin") ? "secondary" : "ghost"} size="sm" className="w-full justify-start gap-2">
                    <ShieldCheck className="w-4 h-4" /> الإدارة
                  </Button>
                </Link>
              )}
              <Button variant="outline" size="sm" className="w-full justify-start gap-2 mt-2" onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}>
                <LogOut className="w-4 h-4" /> خروج
              </Button>
            </>
          ) : (
            <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
              <Button size="sm" className="w-full justify-start gap-2 bg-accent text-accent-foreground">
                <LogIn className="w-4 h-4" /> تسجيل الدخول
              </Button>
            </Link>
          )}
        </div>
      )}
    </header>
  );
};

export default AppHeader;
