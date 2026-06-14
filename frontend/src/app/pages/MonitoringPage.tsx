import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "../lib/utils";
import { Badge } from "../components/ui/badge";

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

const mockLogs: Log[] = [
  {
    id: "log-1",
    time: "2026-06-09 14:30:22",
    level: "ERROR",
    module: "fetch",
    source: "OpenAI官方账号",
    message: "HTTP 429: Rate limit exceeded",
    details: "完整堆栈信息:\nError: HTTP 429\n  at fetch.ts:45\n  at Worker.run:12",
  },
  {
    id: "log-2",
    time: "2026-06-09 14:28:15",
    level: "ERROR",
    module: "fetch",
    source: "TechCrunch RSS",
    message: "HTTP 503 Service Unavailable",
    details: "完整堆栈信息:\nError: HTTP 503\n  at fetch.ts:45",
  },
  {
    id: "log-3",
    time: "2026-06-09 14:25:10",
    level: "WARN",
    module: "api",
    source: "全局",
    message: "API response time: 2.3s",
    details: "Request details:\nEndpoint: /api/news\nDuration: 2.3s",
  },
  {
    id: "log-4",
    time: "2026-06-09 14:20:05",
    level: "INFO",
    module: "system",
    source: "Bloomberg Feed",
    message: "Source configuration updated",
    details: "Config changes: interval changed from 30m to 15m",
  },
  {
    id: "log-5",
    time: "2026-06-09 14:15:00",
    level: "INFO",
    module: "worker",
    source: "全局",
    message: "Worker started successfully",
    details: "Worker ID: worker-123\nStarted at: 2026-06-09 14:15:00",
  },
];

// 自动从ERROR日志生成告警
const generateAlertsFromLogs = (logs: Log[]): Alert[] => {
  const errorLogs = logs.filter((log) => log.level === "ERROR");
  const alertsFromErrors = errorLogs.map((log) => ({
    id: `alert-${log.id}`,
    type: log.module === "fetch" ? "抓取失败" : "系统错误",
    source: log.source,
    message: log.message,
    time: log.time,
    severity: "high" as AlertSeverity,
    handled: false,
    relatedLogIds: [log.id],
  }));

  // 手动告警
  const manualAlerts: Alert[] = [
    {
      id: "alert-manual-1",
      type: "身份变更",
      source: "@elonmusk",
      message: "X/Twitter 账号句柄发生变更",
      time: "2026-06-09 13:00:00",
      severity: "medium",
      handled: false,
      relatedLogIds: [],
    },
  ];

  return [...alertsFromErrors, ...manualAlerts];
};

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

  const [alerts, setAlerts] = useState<Alert[]>(generateAlertsFromLogs(mockLogs));

  const filteredAlerts = showHandled ? alerts : alerts.filter((alert) => !alert.handled);
  const unhandledCount = alerts.filter((a) => !a.handled).length;

  const filteredLogs = mockLogs.filter((log) => {
    if (logLevelFilter !== "all" && log.level !== logLevelFilter) return false;
    if (logModuleFilter !== "all" && log.module !== logModuleFilter) return false;
    if (logSearchQuery && !log.message.toLowerCase().includes(logSearchQuery.toLowerCase())) return false;
    return true;
  });

  const handleDismiss = (id: string) => {
    setAlerts(alerts.map((a) => (a.id === id ? { ...a, handled: true } : a)));
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
                        <>
                          <tr key={log.id} className="border-b border-border hover:bg-muted/20">
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
                        </>
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
