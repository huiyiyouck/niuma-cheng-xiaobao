import { useState } from "react";
import { cn } from "../lib/utils";
import { CheckCircle2 } from "lucide-react";

type AlertSeverity = "high" | "medium" | "low";

interface Alert {
  id: string;
  type: string;
  source: string;
  message: string;
  time: string;
  severity: AlertSeverity;
  handled: boolean;
}

const mockAlerts: Alert[] = [
  {
    id: "1",
    type: "抓取失败",
    source: "TechCrunch RSS",
    message: "连续失败 5 次，最后错误：HTTP 503 Service Unavailable",
    time: "30分钟前",
    severity: "high",
    handled: false,
  },
  {
    id: "2",
    type: "身份变更",
    source: "@elonmusk",
    message: "X/Twitter 账号句柄发生变更",
    time: "2小时前",
    severity: "medium",
    handled: false,
  },
  {
    id: "3",
    type: "内容异常",
    source: "Bloomberg Feed",
    message: "抓取内容格式发生重大变化，可能影响解析质量",
    time: "5小时前",
    severity: "medium",
    handled: true,
  },
];

const severityIcons: Record<AlertSeverity, string> = {
  high: "🔴",
  medium: "🟡",
  low: "🔵",
};

export function AlertsPage() {
  const [showHandled, setShowHandled] = useState(false);
  const [alerts, setAlerts] = useState(mockAlerts);

  const filteredAlerts = showHandled
    ? alerts
    : alerts.filter((alert) => !alert.handled);

  const unhandledCount = alerts.filter((a) => !a.handled).length;

  const handleDismiss = (id: string) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, handled: true } : a));
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1>告警</h1>
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

      {/* Alert List */}
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
                  alert.handled
                    ? "border-border opacity-60"
                    : "border-border hover:shadow-md"
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
                        <button className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:opacity-90">
                          查看详情
                        </button>
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
  );
}
