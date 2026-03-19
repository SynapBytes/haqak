import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquare, LayoutDashboard, LogIn, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import NotificationBell from "./NotificationBell";
import { useState } from "react";

const AppHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, profile, role, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container flex items-center justify-between h-14 md:h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-accent-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">صوت</span>
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
              {role === "mp" && (
                <Link to="/mp">
                  <Button variant={isActive("/mp") ? "secondary" : "ghost"} size="sm" className="gap-2">
                    <LayoutDashboard className="w-4 h-4" /> لوحة النائب
                  </Button>
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {session && <NotificationBell />}

          {session ? (
            <div className="hidden md:flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{profile?.full_name || "مستخدم"}</span>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" /> خروج
              </Button>
            </div>
          ) : (
            <Link to="/auth" className="hidden md:block">
              <Button variant="outline" size="sm" className="gap-2">
                <LogIn className="w-4 h-4" /> تسجيل الدخول
              </Button>
            </Link>
          )}

          {/* Mobile menu button */}
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
        <div className="md:hidden border-t border-border bg-card px-4 py-3 space-y-2">
          {session ? (
            <>
              <div className="text-sm text-muted-foreground mb-2 pb-2 border-b border-border">
                {profile?.full_name || "مستخدم"}
              </div>
              <Link to="/citizen" onClick={() => setMobileMenuOpen(false)}>
                <Button variant={isActive("/citizen") ? "secondary" : "ghost"} size="sm" className="w-full justify-start gap-2">
                  <MessageSquare className="w-4 h-4" /> لوحة المواطن
                </Button>
              </Link>
              {role === "mp" && (
                <Link to="/mp" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant={isActive("/mp") ? "secondary" : "ghost"} size="sm" className="w-full justify-start gap-2">
                    <LayoutDashboard className="w-4 h-4" /> لوحة النائب
                  </Button>
                </Link>
              )}
              <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}>
                <LogOut className="w-4 h-4" /> خروج
              </Button>
            </>
          ) : (
            <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" size="sm" className="w-full justify-start gap-2">
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
