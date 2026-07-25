import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import { Newspaper, Settings, Activity, TrendingUp, FileText, Radio, FolderOpen, FlaskConical, Sparkles, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";
import { getSpaceStats, getGlobalStats, getGlobalLevelStatusCounts } from "../lib/api";

type Space = { id: string; name: string };

// 一级导航项（浏览 / 管理 / 监控）
function SidebarItem({ to, icon: Icon, label, active, badge }: {
  to: string; icon: any; label: string; active: boolean; badge?: number;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
        active
          ? "bg-accent text-accent-foreground font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary" />
      )}
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span className="flex-1 text-sm">{label}</span>
      {badge != null && badge > 0 && (
        <span className="bg-destructive text-destructive-foreground text-xs rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center font-medium">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

/**
 * 左栏导航（左中右布局的「左」）。
 * 只有一级：浏览 / 管理 / 监控（无空间二级——空间切换在浏览页顶部 tab）。
 * 底部：浏览态显示当前空间统计概览（从浏览页顶部下放至此，让中栏聚焦新闻）。
 */
export function AppSidebar({ spaces, unreadCount }: { spaces: Space[]; unreadCount: number }) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const pathname = location.pathname;

  const browseActive = pathname === "/" || pathname.startsWith("/news");
  const adminActive = pathname.startsWith("/admin") || pathname.startsWith("/sources");
  const monitoringActive = pathname.startsWith("/monitoring");
  const debugActive = pathname.startsWith("/debug");
  // 当前空间：与浏览页一致，URL 无 space 时取第一个
  const activeSpaceId = searchParams.get("space") || spaces[0]?.id;
  const activeSpaceName = spaces.find((s) => s.id === activeSpaceId)?.name;
  // 统计标题：浏览态显示当前空间概览，其它页显示全站概览
  const overviewTitle = browseActive && activeSpaceName ? `${activeSpaceName} · 概览` : "全站 · 概览";

  // 统计全局显示：浏览态拉当前空间统计，其它页拉全站统计
  const [stats, setStats] = useState<Array<{ label: string; value: string; icon: any }>>([]);
  useEffect(() => {
    let alive = true;
    const p = browseActive && activeSpaceId ? getSpaceStats(activeSpaceId) : getGlobalStats();
    // v0.6.1 §5.10：底部统计补 AI 指标（待处理/处理中）；AI 统计失败不影响基础统计
    Promise.all([p, getGlobalLevelStatusCounts().catch(() => null)]).then(([g, ai]: [any, any]) => {
      if (!alive) return;
      setStats([
        { label: "今日新增", value: String(g.today_new ?? 0), icon: TrendingUp },
        { label: "总新闻", value: String(g.total_news ?? 0), icon: FileText },
        { label: "启用信息源", value: String(g.active_sources ?? 0), icon: Radio },
        { label: "频道数", value: String(g.channel_count ?? 0), icon: FolderOpen },
        ...(ai ? [
          { label: "AI 待处理", value: String(ai.pending ?? 0), icon: Sparkles },
          { label: "AI 处理中", value: String(ai.processing ?? 0), icon: Loader2 },
        ] : []),
      ]);
    }).catch(() => {});
    return () => { alive = false; };
  }, [browseActive, activeSpaceId]);

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-card flex flex-col h-screen">
      {/* Logo */}
      <div className="flex items-center gap-2.5 h-16 px-5 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Newspaper className="h-[18px] w-[18px]" />
        </div>
        <span className="font-semibold tracking-tight">牛马程小报</span>
      </div>

      {/* 一级导航 */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        <SidebarItem to="/news" icon={Newspaper} label="浏览" active={browseActive} />
        <SidebarItem to="/admin" icon={Settings} label="管理" active={adminActive} />
        <SidebarItem to="/monitoring" icon={Activity} label="监控" active={monitoringActive} badge={unreadCount} />
        <SidebarItem to="/debug/ai" icon={FlaskConical} label="联调" active={debugActive} />
      </nav>

      {/* 统计概览（全局显示：浏览态=当前空间，其它页=全站） */}
      {stats.length > 0 && (
        <div className="shrink-0 border-t border-border px-3 py-3">
          <div className="px-1 pb-2 text-xs font-medium text-muted-foreground">{overviewTitle}</div>
          <div className="grid grid-cols-2 gap-2">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-lg bg-accent/40 px-3 py-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon className="h-3 w-3 shrink-0" />
                    <span className="truncate">{s.label}</span>
                  </div>
                  <div className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{s.value}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
