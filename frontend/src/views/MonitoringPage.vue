<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { useDebounceFn } from "@vueuse/core";
import { CheckCircle2, XCircle } from "lucide-vue-next";
import { cn } from "@/lib/utils";
import Badge from "@/components/ui/Badge.vue";
import { listAlerts, updateAlertStatus, queryLogs } from "@/lib/api";

// 告警 type → 中文 label（v0.5 + v0.6 AC-32 新增）
const alertTypeLabels: Record<string, string> = {
  fetch_failure: "抓取失败",
  x_stream_disconnected: "X 断流",
  zero_new: "零新增",
  circuit_open: "熔断",
  fetch_auth_failed: "认证失败",
  task_stale: "任务卡住",
  external_dep_down: "依赖故障",
  task_backlog: "队列积压",
  final_failed_surge: "失败激增",
};
function severityIcon(sev: string): string {
  if (sev === "high" || sev === "critical" || sev === "error") return "🔴";
  if (sev === "warning" || sev === "medium" || sev === "warn") return "🟡";
  return "🔵";
}
function fmtTime(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("zh-CN", { hour12: false });
}

const route = useRoute();
const mainTab = ref<"alerts" | "logs">(route.query.tab === "logs" ? "logs" : "alerts");

// ── 告警 ──
const alerts = ref<any[]>([]);
const alertCounts = ref<Record<string, number>>({});
const showHandled = ref(false);
const unhandledCount = computed(() => alertCounts.value.active ?? 0);

async function loadAlerts() {
  try {
    const r: any = await listAlerts({ status: showHandled.value ? undefined : "active", limit: 100 });
    alerts.value = r.alerts ?? [];
    alertCounts.value = r.counts ?? {};
  } catch {
    alerts.value = [];
  }
}
async function handleDismiss(id: string) {
  try {
    await updateAlertStatus(id, "resolved");
    await loadAlerts();
  } catch { /* ignore */ }
}
watch(showHandled, loadAlerts);

// ── 日志 ──
const logEntries = ref<any[]>([]);
const expandedLog = ref<number | null>(null);
const logLevelFilter = ref("all");
const logModuleFilter = ref("all"); // api / worker
const logSearchQuery = ref("");

const hasActiveLogFilters = computed(
  () => logLevelFilter.value !== "all" || logModuleFilter.value !== "all" || !!logSearchQuery.value,
);
function clearLogFilters() {
  logLevelFilter.value = "all";
  logModuleFilter.value = "all";
  logSearchQuery.value = "";
}
async function loadLogs() {
  try {
    const r: any = await queryLogs({
      level: logLevelFilter.value === "all" ? undefined : logLevelFilter.value,
      source: logModuleFilter.value === "all" ? undefined : logModuleFilter.value,
      keyword: logSearchQuery.value || undefined,
      limit: 100,
    });
    logEntries.value = r.entries ?? [];
  } catch {
    logEntries.value = [];
  }
}
const debouncedLogSearch = useDebounceFn(loadLogs, 400);
watch(logSearchQuery, () => debouncedLogSearch());
watch([logLevelFilter, logModuleFilter], loadLogs);
watch(mainTab, (t) => {
  if (t === "logs" && logEntries.value.length === 0) loadLogs();
});

function levelBadgeVariant(level: string) {
  const l = (level || "").toUpperCase();
  return l === "ERROR" ? "error" : l === "WARN" || l === "WARNING" ? "warning" : "info";
}

onMounted(() => {
  loadAlerts();
  if (mainTab.value === "logs") loadLogs();
});
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Main Tabs -->
    <div class="border-b border-border">
      <div class="px-6 pt-4">
        <div class="flex gap-6">
          <button
            @click="mainTab = 'alerts'"
            :class="cn('pb-3 border-b-2 transition-colors', mainTab === 'alerts' ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground')"
          >
            告警
          </button>
          <button
            @click="mainTab = 'logs'"
            :class="cn('pb-3 border-b-2 transition-colors', mainTab === 'logs' ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground')"
          >
            日志
          </button>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-auto">
      <!-- 告警 -->
      <div v-if="mainTab === 'alerts'" class="h-full flex flex-col">
        <div class="border-b border-border bg-card px-6 py-4">
          <div class="flex items-center justify-between mb-4">
            <h1 class="text-lg font-medium">告警</h1>
            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <input v-model="showHandled" type="checkbox" class="rounded border-border" />
              <span class="text-muted-foreground">显示已处理</span>
            </label>
          </div>
          <div v-if="unhandledCount > 0" class="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-800 rounded-md text-sm">
            <span class="font-medium">{{ unhandledCount }}</span><span>条未处理告警</span>
          </div>
        </div>

        <div class="flex-1 overflow-auto p-6">
          <div v-if="alerts.length === 0" class="flex flex-col items-center justify-center h-64 text-center">
            <CheckCircle2 class="h-16 w-16 text-green-500 mb-4" />
            <h3 class="font-medium mb-2">一切正常</h3>
            <p class="text-muted-foreground">当前没有{{ showHandled ? "" : "未处理的" }}告警</p>
          </div>
          <div v-else class="space-y-3 max-w-4xl">
            <div
              v-for="alert in alerts"
              :key="alert.id"
              :class="cn('bg-card border rounded-lg p-4 transition-all', alert.status !== 'active' ? 'border-border opacity-60' : 'border-border hover:shadow-md')"
            >
              <div class="flex items-start gap-4">
                <span class="text-2xl mt-0.5">{{ severityIcon(alert.severity) }}</span>
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-4 mb-2">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="font-medium">{{ alertTypeLabels[alert.type] || alert.type }}</span>
                        <span class="text-sm text-muted-foreground">·</span>
                        <span class="text-sm text-muted-foreground">{{ alert.source_display_name || alert.space_name || "全局" }}</span>
                      </div>
                      <p class="text-sm text-muted-foreground">{{ alert.message }}</p>
                    </div>
                    <div class="flex items-center gap-3 shrink-0">
                      <span class="text-sm text-muted-foreground">{{ fmtTime(alert.last_triggered_at || alert.created_at) }}</span>
                    </div>
                  </div>
                  <div v-if="alert.status === 'active'" class="flex gap-2">
                    <button @click="handleDismiss(alert.id)" class="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm hover:bg-accent">标记已处理</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 日志 -->
      <div v-else class="p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="flex-1 relative">
            <input v-model="logSearchQuery" type="text" placeholder="搜索关键词..." class="w-full pl-3 pr-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm text-muted-foreground whitespace-nowrap">级别:</span>
            <select v-model="logLevelFilter" class="px-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="all">全部</option><option value="DEBUG">DEBUG</option><option value="INFO">INFO</option><option value="WARNING">WARNING</option><option value="ERROR">ERROR</option>
            </select>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm text-muted-foreground whitespace-nowrap">来源:</span>
            <select v-model="logModuleFilter" class="px-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="all">全部</option><option value="api">API</option><option value="worker">Worker</option>
            </select>
          </div>
          <button v-if="hasActiveLogFilters" @click="clearLogFilters" class="text-sm text-primary hover:underline px-2 py-0.5 rounded hover:bg-primary/10 whitespace-nowrap">[清除筛选]</button>
        </div>

        <div v-if="logEntries.length === 0" class="text-center py-12">
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
                <th class="text-left px-4 py-3 text-sm font-medium text-muted-foreground">消息</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(log, i) in logEntries" :key="i" class="border-b border-border hover:bg-muted/20">
                <td class="px-4 py-3 text-sm font-mono whitespace-nowrap">{{ fmtTime(log.timestamp) }}</td>
                <td class="px-4 py-3"><Badge :variant="levelBadgeVariant(log.level)">{{ (log.level || "").toUpperCase() }}</Badge></td>
                <td class="px-4 py-3 text-sm font-mono break-all">{{ log.message }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
