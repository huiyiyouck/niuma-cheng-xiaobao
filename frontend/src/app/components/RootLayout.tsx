import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { getUnreadAlertsCount, listSpaces } from "../lib/api";
import { AppSidebar } from "./AppSidebar";
import { Toaster } from "./ui/sonner";

type Space = { id: string; name: string };

export function RootLayout() {
  const location = useLocation();
  const [unhandledAlertsCount, setUnhandledAlertsCount] = useState(0);
  const [spaces, setSpaces] = useState<Space[]>([]);

  // 空间列表加载一次，经 Outlet context 下发给 NewsPage；左栏导航也消费
  useEffect(() => {
    (async () => {
      try {
        const sp: any[] = await listSpaces();
        setSpaces((sp ?? []).map((s) => ({ id: String(s.id), name: s.name })));
      } catch { /* 列表为空时左栏二级不展开，不阻塞渲染 */ }
    })();
  }, []);

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

  return (
    <div className="flex h-screen bg-background">
      {/* 左栏导航 */}
      <AppSidebar spaces={spaces} unreadCount={unhandledAlertsCount} />

      {/* 中栏：各页面内容 */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <Outlet context={{ spaces }} />
      </main>

      {/* 全局 Toast 通知 */}
      <Toaster richColors position="top-right" />
    </div>
  );
}
