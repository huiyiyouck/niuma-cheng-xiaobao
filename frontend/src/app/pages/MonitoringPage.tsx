import { useState, useEffect, Fragment } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "../lib/utils";
import { Badge } from "../components/ui/badge";
import { listAlerts, updateAlertStatus, listLogs, getLogsConfig } from "../lib/api";

type AlertSeverity = "high" | "medium" | "low";
type LogLevel = "INFO" | "WARN" | "ERROR";
type LogModule = "fetch" | "worker" | "stream" | "api" | "system";

interface Alert {
  id: string;
  type: string;
  source: string;
  message: string;
  time: string;
  severity: AlertSeverity;
  handled: boolean;
  relatedLogIds?: string[];
}

interface Log {
  id: string;
  time: string;
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
// 后端 alert → 原型 Alert
function mapAlert(a: any): Alert {
  return {
    id: String(a.id),
    type: a.type ?? a.scope ?? "告警",
    source: a.source_display_name ?? a.space_name ?? a.scope ?? "全局",
    message: a.message ?? "",
    time: a.last_triggered_at ?? a.created_at ?? "",
    severity: mapSeverity(a.severity ?? "info"),
    // active = 未处理；acknowledged/resolved/ignored 视为已处理
    handled: (a.status ?? "active") !== "active",
    relatedLogIds: [],
  };
}

// 后端 log level (debug/info/warning/error) → 原型 (INFO/WARN/ERROR)
function mapLogLevel(l: string): LogLevel {
  const u = (l || "").toUpperCase();
  if (u === "ERROR") return "ERROR";
  if (u === "WARNING" || u === "WARN") return "WARN";
  return "INFO";
}
// 后端 log entry → 原型 Log
function mapLog(e: any, idx: number): Log {
  const ts = e.timestamp ?? "";
  // 后端 log 没有 module/source 字段；从 message 启发推断 module，source 留"全局"
  const msg = String(e.message ?? "");
  let module: LogModule = "system";
  if (/HTTP /i.test(msg)) module = "api";
  else if (/fetch|抓取/i.test(msg)) module = "fetch";
  else if (/worker/i.test(msg)) module = "worker";
  else if (/stream/i.test(msg)) module = "stream";
  return {
    id: `log-${ts}-${idx}`,
    time: ts ? new Date(ts).toISOString().replace("T", " ").slice(0, 19) : "",
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

export function MonitoringPage() {
  const [mainTab, setMainTab] = useState<"alerts" | "logs">("alerts");
  const [showHandled, setShowHandled] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // Log filters
  const [logLevelFilter, setLogLevelFilter] = useState<string>("all");
  const [logModuleFilter, setLogModuleFilter] = useState<string>("all");
  const [logSearchQuery, setLogSearchQuery] = useState("");
  const [logTimeRange, setLogTimeRange] = useState<string>("24h");

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [logLevelsAvail, setLogLevelsAvail] = useState<string[]>([]);

  // 加载告警（含已处理，前端再筛）
  async function loadAlerts() {
    try {
      const r: any = await listAlerts({ include_processed: true });
      setAlerts((r?.alerts ?? []).map(mapAlert));
    } catch { setAlerts([]); }
  }
  // 加载日志
  async function loadLogs() {
    try {
      const r: any = await listLogs({
        level: logLevelFilter === "all" ? undefined : logLevelFilter,
        search: logSearchQuery || undefined,
        page_size: 200,
      });
      setLogs((r?.entries ?? []).map(mapLog));
    } catch { setLogs([]); }
  }

  useEffect(() => { loadAlerts(); }, []);
  useEffect(() => {
    if (mainTab !== "logs") return;
    loadLogs();
    (async () => {
      try {
        const c: any = await getLogsConfig();
        setLogLevelsAvail(Array.isArray(c?.levels) ? c.levels : []);
      } catch { /* ignore */ }
    })();
  }, [mainTab, logLevelFilter, logSearchQuery]);

  const filteredAlerts = showHandled ? alerts : alerts.filter((alert) => !alert.handled);
  const unhandledCount = alerts.filter((a) => !a.handled).length;

  // 模块筛选仍走前端（后端无 module 字段，靠启发式推断）
  const filteredLogs = logs.filter((log) => {
    if (logModuleFilter !== "all" && log.module !== logModuleFilter) return false;
    return true;
  });

  const handleDismiss = async (id: string) => {
    try {
      await updateAlertStatus(id, "acknowledged");
      await loadAlerts();
    } catch (e) { console.error(e); }
  };

  const getAlertById = (logId: string) => {
    return alerts.find((alert) => alert.relatedLogIds?.includes(logId));
  };

  const hasActiveLogFilters = logLevelFilter !== "all" || logModuleFilter !== "all" || logSearchQuery;

  const clearLogFilters = () => {
    setLogLevelFilter("all");
    setLogModuleFilter("all");
    setLogSearchQuery("");
    setLogTimeRange("24h");
  };

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
              告警
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
            <div className="border-b border-border bg-card px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-lg font-medium">告警</h1>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showHandled}
                    onChange={(e) => setShowHandled(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span className="text-muted-foreground">显示已处理</span>
                </label>
              </div>

              {unhandledCount > 0 && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-800 rounded-md text-sm">
                  <span className="font-medium">{unhandledCount}</span>
                  <span>条未处理告警</span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto p-6">
              {filteredAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
                  <h3 className="font-medium mb-2">一切正常</h3>
                  <p className="text-muted-foreground">当前没有未处理的告警</p>
                </div>
              ) : (
                <div className="space-y-3 max-w-4xl">
                  {filteredAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={cn(
                        "bg-card border rounded-lg p-4 transition-all",
                        alert.handled ? "border-border opacity-60" : "border-border hover:shadow-md"
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <span className="text-2xl mt-0.5">{severityIcons[alert.severity]}</span>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{alert.type}</span>
                                <span className="text-sm text-muted-foreground">·</span>
                                <span className="text-sm text-muted-foreground">{alert.source}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">{alert.message}</p>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-sm text-muted-foreground">{alert.time}</span>
                            </div>
                          </div>

                          {!alert.handled && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleDismiss(alert.id)}
                                className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm hover:bg-accent"
                              >
                                标记已处理
                              </button>
                              {alert.relatedLogIds && alert.relatedLogIds.length > 0 && (
                                <button
                                  onClick={() => setMainTab("logs")}
                                  className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:opacity-90"
                                >
                                  查看日志
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6">
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
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <XCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-lg font-medium">无符合条件的日志</p>
                <p className="text-sm text-muted-foreground mt-1">尝试调整筛选条件</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/30 border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">时间</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">级别</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">模块</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">来源</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">消息</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => {
                      const isExpanded = expandedLog === log.id;
                      const relatedAlert = getAlertById(log.id);
                      return (
                        <Fragment key={log.id}>
                          <tr className="border-b border-border hover:bg-muted/20">
                            <td className="px-4 py-3 text-sm font-mono">{log.time}</td>
                            <td className="px-4 py-3">
                              <Badge variant={log.level === "ERROR" ? "error" : log.level === "WARN" ? "warning" : "info"}>
                                {log.level}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm">{log.module}</td>
                            <td className="px-4 py-3 text-sm">{log.source}</td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center gap-2">
                                <span>{log.message}</span>
                                {relatedAlert && !relatedAlert.handled && (
                                  <button
                                    onClick={() => setMainTab("alerts")}
                                    className="text-xs"
                                  >
                                    <Badge variant="error">有告警</Badge>
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                                className="text-sm text-primary hover:underline"
                              >
                                {isExpanded ? "收起" : "详情"}
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} className="px-4 py-3 bg-muted/30">
                                <div className="text-sm">
                                  <div className="font-medium mb-2">详细信息：</div>
                                  <pre className="text-xs font-mono bg-background p-3 rounded border border-border overflow-x-auto">
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
