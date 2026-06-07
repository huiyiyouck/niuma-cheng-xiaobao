<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { Alert, AlertStatus } from "@/lib/types";
import { listAlerts, updateAlertStatus } from "@/lib/api";
import EmptyState from "@/components/EmptyState.vue";
import { useToast } from "@/composables/useToast";
import { useRouter } from "vue-router";

// v0.5: 告警页（原型对齐 alerts.html）
// - 状态 Tab 含计数（active/acknowledged/resolved/ignored）
// - 告警行高/中严重度有左边框（severity-high/medium）
// - 行内操作按钮按状态显示

const toast = useToast();
const router = useRouter();

const alerts = ref<Alert[]>([]);
const total = ref(0);
const loading = ref(false);
const errorText = ref<string | null>(null);

const activeStatus = ref<AlertStatus | "">("active");
const currentPage = ref(1);
const pageSize = ref(20);

const statusCounts = ref<Record<string, number>>({ "": 0, active: 0, acknowledged: 0, resolved: 0, ignored: 0 });

const STATUS_TABS: { value: AlertStatus | ""; label: string }[] = [
  { value: "", label: "全部" },
  { value: "active", label: "未处理" },
  { value: "acknowledged", label: "已确认" },
  { value: "resolved", label: "已恢复" },
  { value: "ignored", label: "已忽略" },
];

function statusLabel(s: string): string {
  const m: Record<string, string> = { active: "未处理", acknowledged: "已确认", resolved: "已恢复", ignored: "已忽略" };
  return m[s] || s;
}

function statusBadgeClass(s: string): string {
  const m: Record<string, string> = {
    active: "badge badge-active",
    acknowledged: "badge badge-ack",
    resolved: "badge badge-resolved",
    ignored: "badge badge-ignored",
  };
  return m[s] || "badge badge-info";
}

const alertTypeLabel: Record<string, string> = {
  source_error: "来源异常",
  x_stream_global: "X Stream 全局",
  x_auth_failure: "X 鉴权失败",
  system_db: "数据库异常",
  system_queue: "任务队列异常",
};

// 严重度映射：决定左边框颜色 + emoji
function severityLevel(a: Alert): "high" | "medium" | "low" {
  if (a.type === "x_auth_failure" || a.type === "system_db") return "high";
  if (a.severity === "warning") return "medium";
  return "low";
}
function severityEmoji(a: Alert): string {
  const lv = severityLevel(a);
  return lv === "high" ? "🔴" : lv === "medium" ? "🟡" : "🔵";
}
function rowSeverityClass(a: Alert): string {
  const lv = severityLevel(a);
  return lv === "high" ? "alert-row--high" : lv === "medium" ? "alert-row--medium" : "";
}

async function loadAlerts() {
  loading.value = true;
  errorText.value = null;
  try {
    const params: any = {
      limit: pageSize.value,
      offset: (currentPage.value - 1) * pageSize.value,
    };
    if (activeStatus.value) params.status = activeStatus.value;

    const res = await listAlerts(params);
    alerts.value = res.alerts;
    total.value = res.total;
  } catch (e) {
    errorText.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

async function loadCounts() {
  try {
    let sum = 0;
    for (const tab of STATUS_TABS) {
      if (tab.value === "") continue;
      const res = await listAlerts({ status: tab.value, limit: 1 });
      statusCounts.value[tab.value] = res.total;
      sum += res.total;
    }
    statusCounts.value[""] = sum;
  } catch { /* 计数加载失败不影响列表 */ }
}

async function onStatusChange(status: AlertStatus | "") {
  activeStatus.value = status;
  currentPage.value = 1;
  await loadAlerts();
}

async function onUpdateAlert(alert: Alert, newStatus: AlertStatus) {
  try {
    await updateAlertStatus(alert.id, newStatus);
    toast.success(`告警已${newStatus === "acknowledged" ? "确认" : newStatus === "ignored" ? "忽略" : newStatus === "resolved" ? "标记恢复" : "更新"}`);
    await loadAlerts();
    await loadCounts();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e));
  }
}

onMounted(async () => {
  await Promise.all([loadAlerts(), loadCounts()]);
});
</script>

<template>
  <div class="alerts-page">
    <div class="page-head">
      <h1 class="page-title">告警</h1>
    </div>

    <div v-if="errorText" class="error-bar"><span>⚠️</span><span>{{ errorText }}</span></div>

    <!-- 状态 Tab -->
    <div class="status-tabs">
      <button
        v-for="tab in STATUS_TABS"
        :key="tab.value"
        class="status-tab"
        :class="{ active: activeStatus === tab.value }"
        @click="onStatusChange(tab.value)"
      >
        {{ tab.label }}
        <span v-if="statusCounts[tab.value] !== undefined" class="status-tab-count">{{ statusCounts[tab.value] }}</span>
      </button>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <select class="filter-select"><option>类型：全部</option></select>
      <select class="filter-select"><option>严重度：全部</option></select>
    </div>

    <!-- 告警列表 -->
    <div v-if="loading && alerts.length === 0" class="loading-state">加载中…</div>

    <EmptyState
      v-else-if="alerts.length === 0"
      icon="✅"
      title="一切正常，暂无告警"
    />

    <div v-else class="alert-list">
      <div
        v-for="a in alerts"
        :key="a.id"
        class="alert-row"
        :class="rowSeverityClass(a)"
      >
        <span class="alert-severity">{{ severityEmoji(a) }}</span>
        <div class="alert-info">
          <span class="alert-type">{{ alertTypeLabel[a.type] || a.type }}</span>
          <span v-if="a.source_display_name" class="alert-source">{{ a.source_display_name }}</span>
          <div class="alert-msg">{{ a.message }}</div>
        </div>
        <span :class="statusBadgeClass(a.status)">{{ statusLabel(a.status) }}</span>
        <div class="alert-actions">
          <button v-if="a.status === 'active'" class="btn btn--xs btn--warn" @click="onUpdateAlert(a, 'acknowledged')">确认</button>
          <button v-if="a.status === 'active'" class="btn btn--xs btn--muted" @click="onUpdateAlert(a, 'ignored')">忽略</button>
          <button v-if="a.status === 'acknowledged'" class="btn btn--xs btn--success" @click="onUpdateAlert(a, 'resolved')">标记恢复</button>
          <button v-if="a.status === 'acknowledged'" class="btn btn--xs btn--muted" @click="onUpdateAlert(a, 'ignored')">忽略</button>
          <button v-if="a.status === 'ignored'" class="btn btn--xs btn--muted" @click="onUpdateAlert(a, 'active')">重新打开</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.alerts-page { display: flex; flex-direction: column; gap: 16px; }

/* Status Tabs */
.status-tabs { display: flex; gap: 4px; flex-wrap: wrap; }
.status-tab {
  padding: 6px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  transition: 0.15s;
  display: flex;
  gap: 6px;
  align-items: center;
  font-family: inherit;
}
.status-tab:hover { background: #F4F5F7; }
.status-tab.active { background: var(--accent); color: #FFF; }
.status-tab-count {
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  background: #E2E8F0;
  color: var(--text-secondary);
}
.status-tab.active .status-tab-count { background: rgba(255, 255, 255, 0.25); color: #FFF; }

.filter-bar { display: flex; gap: 8px; }

/* Alert List */
.alert-list { display: flex; flex-direction: column; gap: 8px; }
.alert-row {
  background: var(--card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: 0.15s;
}
.alert-row:hover { border-color: #CBD5E1; }
.alert-row--high   { border-left: 3px solid var(--danger); }
.alert-row--medium { border-left: 3px solid var(--warning); }

.alert-severity { font-size: 16px; flex-shrink: 0; }
.alert-info { flex: 1; min-width: 0; }
.alert-type {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary);
}
.alert-source {
  font-size: 11px;
  color: var(--text-muted);
  margin-left: 8px;
}
.alert-msg {
  font-size: 12px;
  color: var(--text);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.alert-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
</style>
