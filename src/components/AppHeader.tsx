import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquare, LayoutDashboard, LogIn } from "lucide-react";

const AppHeader = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-accent-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">صوت</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Link to="/citizen">
            <Button
              variant={isActive("/citizen") ? "secondary" : "ghost"}
              size="sm"
              className="gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              لوحة المواطن
            </Button>
          </Link>
          <Link to="/mp">
            <Button
              variant={isActive("/mp") ? "secondary" : "ghost"}
              size="sm"
              className="gap-2"
            >
              <LayoutDashboard className="w-4 h-4" />
              لوحة النائب
            </Button>
          </Link>
        </nav>

        <Button variant="outline" size="sm" className="gap-2">
          <LogIn className="w-4 h-4" />
          تسجيل الدخول
        </Button>
      </div>
    </header>
  );
};

export default AppHeader;
