import { Outlet, Link, useLocation } from "react-router";
import { Newspaper, Settings, Bell, Activity } from "lucide-react";
import { cn } from "../lib/utils";

export function RootLayout() {
  const location = useLocation();
  const unhandledAlertsCount = 3; // Mock count

  const isActive = (path: string) => {
    if (path === "/news") {
      return location.pathname === "/" || location.pathname === "/news";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top Navigation */}
      <header className="border-b border-border bg-card">
        <div className="flex h-14 items-center px-6">
          <div className="flex items-center gap-2 mr-8">
            <Newspaper className="h-5 w-5" />
            <span className="font-medium">牛马程小报</span>
          </div>

          <nav className="flex gap-1">
            <Link
              to="/news"
              className={cn(
                "px-4 py-2 rounded-md transition-colors",
                isActive("/news")
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              浏览
            </Link>
            <Link
              to="/admin"
              className={cn(
                "px-4 py-2 rounded-md transition-colors",
                isActive("/admin")
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              管理
            </Link>
            <Link
              to="/monitoring"
              className={cn(
                "px-4 py-2 rounded-md transition-colors relative",
                isActive("/monitoring")
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <span className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                监控
                {unhandledAlertsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unhandledAlertsCount}
                  </span>
                )}
              </span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
