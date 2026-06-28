import { useState, useEffect, Fragment, useRef } from "react";
import { toast } from "sonner";
import { Loading } from "../components/ui/Loading";
import { CheckCircle2, XCircle, AlertTriangle, AlertCircle, Info, ArrowRight, Clock, Target, X as XIcon } from "lucide-react";
import { cn } from "../lib/utils";
import { Badge } from "../components/ui/badge";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from "../components/ui/alert-dialog";
import {
  listAlerts, updateAlertStatus, batchUpdateAlertStatus,
  listLogs, getLogsConfig, ApiError, saveAdminToken,
} from "../lib/api";

type AlertSeverity = "high" | "medium" | "low";
type LogLevel = "INFO" | "WARN" | "ERROR";
type LogModule = "fetch" | "worker" | "stream" | "api" | "system";

interface Alert {
  id: string;
  type: string;
  source: string;
  message: string;
  time: string;          // 显示用
  timestamp: string;     // 原始 ISO（跳日志用）
  severity: AlertSeverity;
  handled: boolean;
}

interface Log {
  id: string;
  time: string;
  timestamp: string;     // 原始 ISO
  level: LogLevel;
  module: LogModule;
  source: string;
  message: string;
  details: string;
}

// 后端 severity (info/warning/critical) → 原型 (low/medium/high)
function mapSeverity(s: string): AlertSeverity {
  if (s === "critical") return "high";
  if (s === "warning") return "medium";
  return "low";
}
function mapAlert(a: any): Alert {
  const ts = a.last_triggered_at ?? a.created_at ?? "";
  return {
    id: String(a.id),
    type: a.type ?? a.scope ?? "告警",
    source: a.source_display_name ?? a.space_name ?? a.scope ?? "全局",
    message: a.message ?? "",
    time: ts ? new Date(ts).toLocaleString("zh-CN", { hour12: false }) : "",
    timestamp: ts,
    severity: mapSeverity(a.severity ?? "info"),
    handled: (a.status ?? "active") !== "active",
  };
}

function mapLogLevel(l: string): LogLevel {
  const u = (l || "").toUpperCase();
  if (u === "ERROR") return "ERROR";
  if (u === "WARNING" || u === "WARN") return "WARN";
  return "INFO";
}
function mapLog(e: any, idx: number): Log {
  const ts = e.timestamp ?? "";
  const msg = String(e.message ?? "");
  let module: LogModule = "system";
  if (/HTTP /i.test(msg)) module = "api";
  else if (/fetch|抓取/i.test(msg)) module = "fetch";
  else if (/worker/i.test(msg)) module = "worker";
  else if (/stream/i.test(msg)) module = "stream";
  return {
    id: `log-${ts}-${idx}`,
    time: ts ? new Date(ts).toLocaleString("zh-CN", { hour12: false }) : "",
    timestamp: ts,
    level: mapLogLevel(e.level),
    module,
    source: "全局",
    message: msg.split("\n")[0].slice(0, 200),
    details: msg,
  };
}

const severityIcons: Record<AlertSeverity, string> = {
  high: "🔴",
  medium: "🟡",
  low: "🔵",
};

// 严重度 → 整体配色（左侧色条 + 图标背景 + 操作色）
const SEVERITY_THEME: Record<AlertSeverity, {
  bar: string; iconBg: string; iconColor: string; Icon: typeof AlertCircle;
  label: string; labelClass: string;
}> = {
  high:   { bar: "bg-red-500",    iconBg: "bg-red-50",    iconColor: "text-red-600",
            Icon: AlertCircle,    label: "高",  labelClass: "bg-red-100 text-red-700" },
  medium: { bar: "bg-amber-500",  iconBg: "bg-amber-50",  iconColor: "text-amber-600",
            Icon: AlertTriangle,  label: "中",  labelClass: "bg-amber-100 text-amber-700" },
  low:    { bar: "bg-sky-500",    iconBg: "bg-sky-50",    iconColor: "text-sky-600",
            Icon: Info,           label: "低",  labelClass: "bg-sky-100 text-sky-700" },
};

// 相对时间显示（"3 分钟前"），列表里比绝对时间易扫
function fmtRelative(iso: string): string {
  if (!iso) return "—";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 0) return "刚刚";
  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  return `${Math.floor(diff / 86400)} 天前`;
}

// 行底色：ERROR 红 / WARN 黄 / INFO 默认；hover 适当加深
const LOG_ROW_CLASS: Record<LogLevel, string> = {
  ERROR: "bg-red-50 hover:bg-red-100 border-red-100",
  WARN:  "bg-amber-50 hover:bg-amber-100 border-amber-100",
  INFO:  "hover:bg-muted/30 border-border",
};

export function MonitoringPage() {
  const [mainTab, setMainTab] = useState<"alerts" | "logs">("alerts");
  const [showHandled, setShowHandled] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const [logLevelFilter, setLogLevelFilter] = useState<string>("all");
  const [logModuleFilter, setLogModuleFilter] = useState<string>("all");
  const [logSearchQuery, setLogSearchQuery] = useState("");
  const [logTimeRange, setLogTimeRange] = useState<string>("24h");

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [logs, setLogs] = useState<Log[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  // 高亮跳转状态：告警→日志时设这两个，日志列表用它定位/染色
  const [highlightWindow, setHighlightWindow] = useState<{ from: string; to: string } | null>(null);
  const highlightRowRef = useRef<HTMLTableRowElement | null>(null);

  // 一键处理「确认中」 loading
  const [batchAcking, setBatchAcking] = useState(false);
  // 一键处理二次确认弹窗
  const [confirmBatchOpen, setConfirmBatchOpen] = useState(false);

  async function loadAlerts() {
    setAlertsLoading(true);
    try {
      // 未勾「显示已处理」只拉 active，避免大量已处理告警占满分页把未处理的挤出列表
      const r: any = await listAlerts(showHandled ? undefined : { status: "active" });
      setAlerts((r?.alerts ?? []).map(mapAlert));
    } catch { setAlerts([]); }
    finally { setAlertsLoading(false); }
  }
  async function loadLogs() {
    setLogsLoading(true);
    try {
      // 告警关联模式：按告警时段（高亮窗前后各放宽 15 分钟给上下文）拉日志。
      // 否则只拉最新 200 条，历史告警（如昨天触发）对应时刻的日志根本不在范围内，
      // 时间窗内零命中 → 跳过去定位不到任何行。
      const w = highlightWindow;
      const range = w ? {
        from: new Date(new Date(w.from).getTime() - 14 * 60_000).toISOString(),
        to:   new Date(new Date(w.to).getTime()   + 14 * 60_000).toISOString(),
      } : {};
      const r: any = await listLogs({
        level: logLevelFilter === "all" ? undefined : logLevelFilter,
        keyword: logSearchQuery || undefined,
        ...range,
        limit: w ? 1000 : 200,
      });
      setLogs((r?.entries ?? []).map(mapLog));
    } catch { setLogs([]); }
    finally { setLogsLoading(false); }
  }

  useEffect(() => { loadAlerts(); }, [showHandled]);
  useEffect(() => {
    if (mainTab !== "logs") return;
    loadLogs();
    (async () => {
      try { await getLogsConfig(); } catch { /* ignore */ }
    })();
  }, [mainTab, logLevelFilter, logSearchQuery, highlightWindow]);

  // 跳到日志后等列表加载完，把第一条命中行 scrollIntoView
  useEffect(() => {
    if (mainTab !== "logs" || !highlightWindow) return;
    const t = setTimeout(() => {
      highlightRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);
    return () => clearTimeout(t);
  }, [mainTab, logs, highlightWindow]);

  const filteredAlerts = showHandled ? alerts : alerts.filter((alert) => !alert.handled);
  const unhandledCount = alerts.filter((a) => !a.handled).length;

  const filteredLogs = logs.filter((log) => {
    if (logModuleFilter !== "all" && log.module !== logModuleFilter) return false;
    return true;
  });

  // 命中高亮窗口的日志（时间窗内 + 关键词命中）
  function isHighlighted(log: Log): boolean {
    if (!highlightWindow) return false;
    const ts = log.timestamp || "";
    // 时间落在告警时刻 ±60s 内即视为关联并定位。不再要求关键词命中——否则
    // zero_new 等「结论型」告警的内部类型名永远匹配不到中文/HTTP 日志，零命中、无处定位。
    return ts >= highlightWindow.from && ts <= highlightWindow.to;
  }

  const handleDismiss = async (id: string) => {
    try { await updateAlertStatus(id, "acknowledged"); await loadAlerts(); }
    catch (e) { console.error(e); }
  };

  // 一键处理：把所有 active 告警批量置 acknowledged（经二次确认弹窗触发）
  const handleBatchAck = async () => {
    if (unhandledCount === 0 || batchAcking) return;
    const count = unhandledCount;
    setBatchAcking(true);
    try {
      await batchUpdateAlertStatusWithAdminToken("acknowledged");
      await loadAlerts();
      setConfirmBatchOpen(false);
      toast.success(`已将 ${count} 条告警标记为已处理`);
    }
    catch (e) { console.error(e); toast.error("批量处理失败，请稍后重试"); }
    finally { setBatchAcking(false); }
  };

  async function batchUpdateAlertStatusWithAdminToken(status: "acknowledged" | "ignored" | "resolved") {
    try {
      return await batchUpdateAlertStatus(status);
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 403) throw err;
      const token = window.prompt("请输入生产管理员 Token");
      if (!token?.trim()) throw err;
      saveAdminToken(token);
      return await batchUpdateAlertStatus(status);
    }
  }

  // 告警 → 日志：开 60s 时间窗 + 关键词；切到日志 Tab；清前端筛选避免误过滤
  const jumpToLogs = (alert: Alert) => {
    if (!alert.timestamp) { setMainTab("logs"); return; }
    const t = new Date(alert.timestamp).getTime();
    const from = new Date(t - 60_000).toISOString();
    const to   = new Date(t + 60_000).toISOString();
    setHighlightWindow({ from, to });
    // 清掉可能误过滤命中行的筛选
    setLogLevelFilter("all");
    setLogModuleFilter("all");
    setLogSearchQuery("");
    setMainTab("logs");
  };

  const hasActiveLogFilters = logLevelFilter !== "all" || logModuleFilter !== "all" || logSearchQuery;
  const clearLogFilters = () => {
    setLogLevelFilter("all");
    setLogModuleFilter("all");
    setLogSearchQuery("");
    setLogTimeRange("24h");
  };
  const clearHighlight = () => setHighlightWindow(null);

  // 标记第一条命中的高亮行，给它绑 ref（用于 scrollIntoView）
  let firstHighlightedSeen = false;

  return (
    <div className="h-full flex flex-col">
      {/* Main Tabs */}
      <div className="border-b border-border">
        <div className="px-6 pt-4">
          <div className="flex gap-6">
            <button
              onClick={() => setMainTab("alerts")}
              className={cn(
                "pb-3 border-b-2 transition-colors",
                mainTab === "alerts"
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              告警{unhandledCount > 0 && <span className="ml-1 text-xs">({unhandledCount})</span>}
            </button>
            <button
              onClick={() => setMainTab("logs")}
              className={cn(
                "pb-3 border-b-2 transition-colors",
                mainTab === "logs"
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              日志
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {mainTab === "alerts" ? (
          <div className="h-full flex flex-col">
            <div className="border-b border-border px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-lg font-medium">告警</h1>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showHandled}
                      onChange={(e) => setShowHandled(e.target.checked)}
                      className="rounded border-border"
                    />
                    <span className="text-muted-foreground">显示已处理</span>
                  </label>
                  <button
                    onClick={() => setConfirmBatchOpen(true)}
                    disabled={unhandledCount === 0 || batchAcking}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors",
                      unhandledCount === 0 || batchAcking
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : "bg-primary text-primary-foreground hover:opacity-90"
                    )}
                    title={unhandledCount === 0 ? "无未处理告警" : `把 ${unhandledCount} 条告警全部标为已确认`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {batchAcking ? "处理中…" : `一键处理${unhandledCount > 0 ? ` (${unhandledCount})` : ""}`}
                  </button>

                  <AlertDialog open={confirmBatchOpen} onOpenChange={(o) => { if (!batchAcking) setConfirmBatchOpen(o); }}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>一键处理 {unhandledCount} 条告警？</AlertDialogTitle>
                        <AlertDialogDescription>
                          将这 {unhandledCount} 条未处理告警全部标记为「已处理」。这只是标记已读，<strong>不会修复告警背后的根因</strong>，请确认相关问题已被处理或可以忽略。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={batchAcking}>取消</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={(e) => { e.preventDefault(); handleBatchAck(); }}
                          disabled={batchAcking}
                        >
                          {batchAcking ? "处理中…" : "确认全部标记已处理"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {unhandledCount > 0 && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-800 rounded-md text-sm">
                  <span className="font-medium">{unhandledCount}</span>
                  <span>条未处理告警</span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto p-6">
              {alertsLoading ? (
                <Loading />
              ) : filteredAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
                  <h3 className="font-medium mb-2">一切正常</h3>
                  <p className="text-muted-foreground">当前没有未处理的告警</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAlerts.map((alert) => {
                    const theme = SEVERITY_THEME[alert.severity];
                    const Icon = theme.Icon;
                    return (
                      <div
                        key={alert.id}
                        className={cn(
                          "group relative bg-card border border-border rounded-lg shadow-sm overflow-hidden transition-all",
                          alert.handled ? "opacity-60" : "hover:shadow-md hover:-translate-y-px"
                        )}
                      >
                        {/* 左侧严重度色条 */}
                        <div className={cn("absolute left-0 top-0 bottom-0 w-1", theme.bar, alert.handled && "opacity-50")} />

                        <div className="flex items-start gap-3 pl-5 pr-4 py-4">
                          {/* 严重度图标盒 */}
                          <div className={cn(
                            "shrink-0 h-9 w-9 rounded-full flex items-center justify-center",
                            theme.iconBg, alert.handled && "grayscale"
                          )}>
                            <Icon className={cn("h-5 w-5", theme.iconColor)} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-1.5">
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <span className={cn("px-1.5 py-0.5 rounded text-xs font-medium", theme.labelClass)}>
                                  {theme.label}
                                </span>
                                <span className="font-medium truncate">{alert.type}</span>
                                <span className="text-sm text-muted-foreground">·</span>
                                <span className="text-sm text-muted-foreground truncate">{alert.source}</span>
                                {alert.handled && (
                                  <span className="px-1.5 py-0.5 rounded text-xs bg-muted text-muted-foreground">已处理</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 whitespace-nowrap" title={alert.time}>
                                <Clock className="h-3 w-3" />
                                {fmtRelative(alert.timestamp)}
                              </div>
                            </div>

                            <p className="text-sm text-foreground/80 mb-3 leading-relaxed line-clamp-2">{alert.message}</p>

                            <div className="flex items-center gap-1.5">
                              {!alert.handled && (
                                <button
                                  onClick={() => handleDismiss(alert.id)}
                                  className="px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex items-center gap-1"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  标记已处理
                                </button>
                              )}
                              <button
                                onClick={() => jumpToLogs(alert)}
                                className="px-2.5 py-1 rounded-md text-xs font-medium text-primary hover:bg-primary/10 transition-colors flex items-center gap-1"
                                title="跳到日志并定位到该告警时间窗口"
                              >
                                <Target className="h-3.5 w-3.5" />
                                关联日志
                                <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6">
            {/* 高亮跳转提示条 — 告警关联模式 */}
            {highlightWindow && (
              <div className="mb-4 relative overflow-hidden rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 via-blue-50 to-sky-50">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                <div className="flex items-center gap-3 px-4 py-3 pl-5">
                  <div className="shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Target className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-blue-900">已定位到告警相关日志</div>
                    <div className="text-xs text-blue-700/80 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(highlightWindow.from).toLocaleTimeString("zh-CN", { hour12: false })}
                        {" – "}
                        {new Date(highlightWindow.to).toLocaleTimeString("zh-CN", { hour12: false })}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={clearHighlight}
                    className="shrink-0 p-1.5 rounded-md hover:bg-blue-100 text-blue-700 transition-colors"
                    title="清除告警定位"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Log Filters */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="搜索关键词..."
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  className="w-full pl-3 pr-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">时间范围:</span>
                <select
                  value={logTimeRange}
                  onChange={(e) => setLogTimeRange(e.target.value)}
                  className="px-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="1h">最近 1 小时</option>
                  <option value="24h">最近 24 小时</option>
                  <option value="7d">最近 7 天</option>
                  <option value="30d">最近 30 天</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">级别:</span>
                <select
                  value={logLevelFilter}
                  onChange={(e) => setLogLevelFilter(e.target.value)}
                  className="px-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="all">全部</option>
                  <option value="INFO">INFO</option>
                  <option value="WARN">WARN</option>
                  <option value="ERROR">ERROR</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">模块:</span>
                <select
                  value={logModuleFilter}
                  onChange={(e) => setLogModuleFilter(e.target.value)}
                  className="px-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="all">全部</option>
                  <option value="fetch">抓取</option>
                  <option value="worker">Worker</option>
                  <option value="stream">Stream</option>
                  <option value="api">API</option>
                  <option value="system">系统</option>
                </select>
              </div>
              {hasActiveLogFilters && (
                <button
                  onClick={clearLogFilters}
                  className="text-sm text-primary hover:underline px-2 py-0.5 rounded hover:bg-primary/10 whitespace-nowrap"
                >
                  [清除筛选]
                </button>
              )}
            </div>

            {/* Logs Table */}
            {logsLoading ? (
              <Loading />
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <XCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-lg font-medium">无符合条件的日志</p>
                <p className="text-sm text-muted-foreground mt-1">尝试调整筛选条件</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/30 border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">时间</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">级别</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">模块</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">消息</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => {
                      const isExpanded = expandedLog === log.id;
                      const highlighted = isHighlighted(log);
                      // 第一条命中的行绑 ref，用于跳转后 scrollIntoView
                      let rowRef: ((el: HTMLTableRowElement | null) => void) | undefined;
                      if (highlighted && !firstHighlightedSeen) {
                        firstHighlightedSeen = true;
                        rowRef = (el) => { highlightRowRef.current = el; };
                      }
                      return (
                        <Fragment key={log.id}>
                          <tr
                            ref={rowRef}
                            className={cn(
                              "border-b transition-colors",
                              LOG_ROW_CLASS[log.level],
                              highlighted && "!bg-blue-50/70 hover:!bg-blue-100/70 shadow-[inset_3px_0_0_0_rgb(59,130,246)]"
                            )}
                          >
                            <td className="px-4 py-3 text-sm font-mono whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {highlighted && (
                                  <Target className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                )}
                                {log.time}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={log.level === "ERROR" ? "error" : log.level === "WARN" ? "warning" : "info"}>
                                {log.level}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm">{log.module}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={cn(
                                log.level === "ERROR" && "text-red-700 font-medium",
                                log.level === "WARN" && "text-amber-800",
                              )}>
                                {log.message}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                                className="text-sm text-primary hover:underline whitespace-nowrap"
                              >
                                {isExpanded ? "收起" : "详情"}
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={5} className="px-4 py-3 bg-muted/30">
                                <div className="text-sm">
                                  <div className="font-medium mb-2">详细信息：</div>
                                  <pre className="text-xs font-mono bg-background p-3 rounded border border-border overflow-x-auto whitespace-pre-wrap">
                                    {log.details}
                                  </pre>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
