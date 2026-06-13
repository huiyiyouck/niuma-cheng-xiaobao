<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import { CheckCircle2, XCircle } from "lucide-vue-next";
import { cn } from "@/lib/utils";
import Badge from "@/components/ui/Badge.vue";

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

// 自动从 ERROR 日志生成告警
function generateAlertsFromLogs(logs: Log[]): Alert[] {
  const errorLogs = logs.filter((log) => log.level === "ERROR");
  const alertsFromErrors: Alert[] = errorLogs.map((log) => ({
    id: `alert-${log.id}`,
    type: log.module === "fetch" ? "抓取失败" : "系统错误",
    source: log.source,
    message: log.message,
    time: log.time,
    severity: "high",
    handled: false,
    relatedLogIds: [log.id],
  }));
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
}

const severityIcons: Record<AlertSeverity, string> = {
  high: "🔴",
  medium: "🟡",
  low: "🔵",
};

const route = useRoute();
const mainTab = ref<"alerts" | "logs">(route.query.tab === "logs" ? "logs" : "alerts");
const showHandled = ref(false);
const expandedLog = ref<string | null>(null);

const logLevelFilter = ref("all");
const logModuleFilter = ref("all");
const logSearchQuery = ref("");
const logTimeRange = ref("24h");

const alerts = ref<Alert[]>(generateAlertsFromLogs(mockLogs));

const filteredAlerts = computed(() =>
  showHandled.value ? alerts.value : alerts.value.filter((a) => !a.handled),
);
const unhandledCount = computed(() => alerts.value.filter((a) => !a.handled).length);

const filteredLogs = computed(() =>
  mockLogs.filter((log) => {
    if (logLevelFilter.value !== "all" && log.level !== logLevelFilter.value) return false;
    if (logModuleFilter.value !== "all" && log.module !== logModuleFilter.value) return false;
    if (
      logSearchQuery.value &&
      !log.message.toLowerCase().includes(logSearchQuery.value.toLowerCase())
    )
      return false;
    return true;
  }),
);

const hasActiveLogFilters = computed(
  () =>
    logLevelFilter.value !== "all" ||
    logModuleFilter.value !== "all" ||
    !!logSearchQuery.value,
);

function handleDismiss(id: string) {
  alerts.value = alerts.value.map((a) => (a.id === id ? { ...a, handled: true } : a));
}

function getAlertById(logId: string) {
  return alerts.value.find((alert) => alert.relatedLogIds?.includes(logId));
}

function clearLogFilters() {
  logLevelFilter.value = "all";
  logModuleFilter.value = "all";
  logSearchQuery.value = "";
  logTimeRange.value = "24h";
}

function badgeVariant(level: LogLevel) {
  return level === "ERROR" ? "error" : level === "WARN" ? "warning" : "info";
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Main Tabs -->
    <div class="border-b border-border">
      <div class="px-6 pt-4">
        <div class="flex gap-6">
          <button
            @click="mainTab = 'alerts'"
            :class="cn(
              'pb-3 border-b-2 transition-colors',
              mainTab === 'alerts'
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )"
          >
            告警
          </button>
          <button
            @click="mainTab = 'logs'"
            :class="cn(
              'pb-3 border-b-2 transition-colors',
              mainTab === 'logs'
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )"
          >
            日志
          </button>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-auto">
      <!-- Alerts -->
      <div v-if="mainTab === 'alerts'" class="h-full flex flex-col">
        <div class="border-b border-border bg-card px-6 py-4">
          <div class="flex items-center justify-between mb-4">
            <h1 class="text-lg font-medium">告警</h1>
            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <input v-model="showHandled" type="checkbox" class="rounded border-border" />
              <span class="text-muted-foreground">显示已处理</span>
            </label>
          </div>

          <div
            v-if="unhandledCount > 0"
            class="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-800 rounded-md text-sm"
          >
            <span class="font-medium">{{ unhandledCount }}</span>
            <span>条未处理告警</span>
          </div>
        </div>

        <div class="flex-1 overflow-auto p-6">
          <div
            v-if="filteredAlerts.length === 0"
            class="flex flex-col items-center justify-center h-64 text-center"
          >
            <CheckCircle2 class="h-16 w-16 text-green-500 mb-4" />
            <h3 class="font-medium mb-2">一切正常</h3>
            <p class="text-muted-foreground">当前没有未处理的告警</p>
          </div>

          <div v-else class="space-y-3 max-w-4xl">
            <div
              v-for="alert in filteredAlerts"
              :key="alert.id"
              :class="cn(
                'bg-card border rounded-lg p-4 transition-all',
                alert.handled ? 'border-border opacity-60' : 'border-border hover:shadow-md',
              )"
            >
              <div class="flex items-start gap-4">
                <span class="text-2xl mt-0.5">{{ severityIcons[alert.severity] }}</span>

                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-4 mb-2">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="font-medium">{{ alert.type }}</span>
                        <span class="text-sm text-muted-foreground">·</span>
                        <span class="text-sm text-muted-foreground">{{ alert.source }}</span>
                      </div>
                      <p class="text-sm text-muted-foreground">{{ alert.message }}</p>
                    </div>

                    <div class="flex items-center gap-3 shrink-0">
                      <span class="text-sm text-muted-foreground">{{ alert.time }}</span>
                    </div>
                  </div>

                  <div v-if="!alert.handled" class="flex gap-2">
                    <button
                      @click="handleDismiss(alert.id)"
                      class="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm hover:bg-accent"
                    >
                      标记已处理
                    </button>
                    <button
                      v-if="alert.relatedLogIds && alert.relatedLogIds.length > 0"
                      @click="mainTab = 'logs'"
                      class="px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:opacity-90"
                    >
                      查看日志
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Logs -->
      <div v-else class="p-6">
        <!-- Log Filters -->
        <div class="flex items-center gap-3 mb-4">
          <div class="flex-1 relative">
            <input
              v-model="logSearchQuery"
              type="text"
              placeholder="搜索关键词..."
              class="w-full pl-3 pr-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm text-muted-foreground whitespace-nowrap">时间范围:</span>
            <select
              v-model="logTimeRange"
              class="px-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="1h">最近 1 小时</option>
              <option value="24h">最近 24 小时</option>
              <option value="7d">最近 7 天</option>
              <option value="30d">最近 30 天</option>
            </select>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm text-muted-foreground whitespace-nowrap">级别:</span>
            <select
              v-model="logLevelFilter"
              class="px-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">全部</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
            </select>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm text-muted-foreground whitespace-nowrap">模块:</span>
            <select
              v-model="logModuleFilter"
              class="px-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">全部</option>
              <option value="fetch">抓取</option>
              <option value="worker">Worker</option>
              <option value="stream">Stream</option>
              <option value="api">API</option>
              <option value="system">系统</option>
            </select>
          </div>
          <button
            v-if="hasActiveLogFilters"
            @click="clearLogFilters"
            class="text-sm text-primary hover:underline px-2 py-0.5 rounded hover:bg-primary/10 whitespace-nowrap"
          >
            [清除筛选]
          </button>
        </div>

        <!-- Logs Table -->
        <div v-if="filteredLogs.length === 0" class="text-center py-12">
          <XCircle class="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p class="text-lg font-medium">无符合条件的日志</p>
          <p class="text-sm text-muted-foreground mt-1">尝试调整筛选条件</p>
        </div>

        <div v-else class="bg-card border border-border rounded-lg overflow-hidden">
          <table class="w-full">
            <thead class="bg-muted/30 border-b border-border">
              <tr>
                <th class="text-left px-4 py-3 text-sm font-medium text-muted-foreground">时间</th>
                <th class="text-left px-4 py-3 text-sm font-medium text-muted-foreground">级别</th>
                <th class="text-left px-4 py-3 text-sm font-medium text-muted-foreground">模块</th>
                <th class="text-left px-4 py-3 text-sm font-medium text-muted-foreground">来源</th>
                <th class="text-left px-4 py-3 text-sm font-medium text-muted-foreground">消息</th>
                <th class="text-left px-4 py-3 text-sm font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="log in filteredLogs" :key="log.id">
                <tr class="border-b border-border hover:bg-muted/20">
                  <td class="px-4 py-3 text-sm font-mono">{{ log.time }}</td>
                  <td class="px-4 py-3">
                    <Badge :variant="badgeVariant(log.level)">{{ log.level }}</Badge>
                  </td>
                  <td class="px-4 py-3 text-sm">{{ log.module }}</td>
                  <td class="px-4 py-3 text-sm">{{ log.source }}</td>
                  <td class="px-4 py-3 text-sm">
                    <div class="flex items-center gap-2">
                      <span>{{ log.message }}</span>
                      <button
                        v-if="getAlertById(log.id) && !getAlertById(log.id)!.handled"
                        @click="mainTab = 'alerts'"
                        class="text-xs"
                      >
                        <Badge variant="error">有告警</Badge>
                      </button>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <button
                      @click="expandedLog = expandedLog === log.id ? null : log.id"
                      class="text-sm text-primary hover:underline"
                    >
                      {{ expandedLog === log.id ? "收起" : "详情" }}
                    </button>
                  </td>
                </tr>
                <tr v-if="expandedLog === log.id">
                  <td colspan="6" class="px-4 py-3 bg-muted/30">
                    <div class="text-sm">
                      <div class="font-medium mb-2">详细信息：</div>
                      <pre class="text-xs font-mono bg-background p-3 rounded border border-border overflow-x-auto">{{ log.details }}</pre>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
