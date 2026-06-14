import { useEffect, useState } from "react";
import { Outlet, Link, useLocation } from "react-router";
import { Newspaper, Settings, Bell, Activity } from "lucide-react";
import { cn } from "../lib/utils";
import { getUnreadAlertsCount } from "../lib/api";

export function RootLayout() {
  const location = useLocation();
  const [unhandledAlertsCount, setUnhandledAlertsCount] = useState(0);

  // 顶部红色角标接真实数据：mount 拉一次 + 60s 轮询 + 切回前台/进入监控页主动刷新
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const r: any = await getUnreadAlertsCount();
        if (alive) setUnhandledAlertsCount(Number(r?.count ?? 0));
      } catch { /* 拉取失败保留上次值，不闪烁 */ }
    }
    load();
    const t = setInterval(load, 60_000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { alive = false; clearInterval(t); window.removeEventListener("focus", onFocus); };
  }, []);

  // 切到监控页后短延时再刷一次（处理告警后角标快速反映）
  useEffect(() => {
    if (!location.pathname.startsWith("/monitoring")) return;
    const id = setTimeout(async () => {
      try { const r: any = await getUnreadAlertsCount(); setUnhandledAlertsCount(Number(r?.count ?? 0)); } catch {}
    }, 800);
    return () => clearTimeout(id);
  }, [location.pathname]);

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
