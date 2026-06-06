<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { Alert, AlertStatus } from "@/lib/types";
import { listAlerts, updateAlertStatus } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge.vue";
import EmptyState from "@/components/EmptyState.vue";
import { useToast } from "@/composables/useToast";
import { useRouter } from "vue-router";

// v0.5: 告警页
// 告警列表 + 状态 Tab（含计数）+ 告警行（操作按钮按状态显示）

const toast = useToast();
const router = useRouter();

const alerts = ref<Alert[]>([]);
const total = ref(0);
const loading = ref(false);
const errorText = ref<string | null>(null);

const activeStatus = ref<AlertStatus | "">("active");
const currentPage = ref(1);
const pageSize = ref(20);

const statusCounts = ref<Record<string, number>>({ active: 0, acknowledged: 0, resolved: 0, ignored: 0 });

const STATUS_TABS: { value: AlertStatus | ""; label: string }[] = [
  { value: "", label: "全部" },
  { value: "active", label: "未处理" },
  { value: "acknowledged", label: "已确认" },
  { value: "resolved", label: "已恢复" },
  { value: "ignored", label: "已忽略" },
];

function statusLabel(s: string): string {
  const m: Record<string,string> = { active:'未处理', acknowledged:'已确认', resolved:'已恢复', ignored:'已忽略' };
  return m[s] || s;
}

const alertTypeLabel: Record<string, string> = {
  source_error: "来源异常",
  x_stream_global: "X Stream 全局",
  x_auth_failure: "X 鉴权失败",
  system_db: "数据库异常",
  system_queue: "任务队列异常",
};

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

    // 同时加载各状态计数（简单策略：全量加载一次计数）
    const allRes = await listAlerts({ limit: 1 });
    // 分别获取各状态计数
    // 简化：从单次查询中解析（实际后端应返回计数）
  } catch (e) {
    errorText.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

async function loadCounts() {
  try {
    // 为每个状态查询计数
    for (const tab of STATUS_TABS) {
      if (tab.value === "") continue;
      const res = await listAlerts({ status: tab.value, limit: 1 });
      statusCounts.value[tab.value] = res.total;
    }
    // 全部 = 各状态之和
    statusCounts.value[""] = Object.values(statusCounts.value).reduce((a, b) => a + b, 0);
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
    toast.success(`告警已${newStatus === 'acknowledged' ? '确认' : newStatus === 'ignored' ? '忽略' : '更新'}`);
    await loadAlerts();
    await loadCounts();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e));
  }
}

function viewSource(sourceId: string | null) {
  if (sourceId) {
    router.push(`/sources/${sourceId}`);
  }
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

onMounted(async () => {
  await Promise.all([loadAlerts(), loadCounts()]);
});
</script>

<template>
  <div class="alerts-page">
    <h1 class="page-title">告警</h1>

    <div v-if="errorText" class="error-bar"><span>&#9888;</span><span>{{ errorText }}</span></div>

    <!-- 状态 Tab（原型对齐：无边框按钮 + 计数） -->
    <div class="status-tabs">
      <button
        v-for="tab in STATUS_TABS"
        :key="tab.value"
        class="status-tab"
        :class="{ active: activeStatus === tab.value }"
        @click="onStatusChange(tab.value)"
      >
        {{ tab.label }}
        <span v-if="statusCounts[tab.value] !== undefined" class="count">{{ statusCounts[tab.value] }}</span>
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
      icon="&#9989;"
      title="一切正常，暂无告警"
    />

    <div v-else class="alert-list">
      <div v-for="a in alerts" :key="a.id" class="alert-row">
        <span class="alert-severity">{{ a.type === 'x_auth_failure' || a.type === 'system_db' ? '🔴' : a.severity === 'warning' ? '🟡' : '🔵' }}</span>
        <div class="alert-info">
          <span class="alert-type">{{ alertTypeLabel[a.type] || a.type }}</span>
          <span v-if="a.source_display_name" class="alert-source">· {{ a.source_display_name }}</span>
          <div class="alert-msg">{{ a.message }}</div>
        </div>
        <span class="badge" :class="'badge-' + a.status">{{ statusLabel(a.status) }}</span>
        <div class="alert-actions">
          <button v-if="a.status === 'active'" class="btn-xs warn" @click="onUpdateAlert(a, 'acknowledged')">确认</button>
          <button v-if="a.status === 'active'" class="btn-xs muted" @click="onUpdateAlert(a, 'ignored')">忽略</button>
          <button v-if="a.status === 'acknowledged'" class="btn-xs success" @click="onUpdateAlert(a, 'resolved')">标记恢复</button>
          <button v-if="a.status === 'ignored'" class="btn-xs muted" @click="onUpdateAlert(a, 'active')">重新打开</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.alerts-page { display: flex; flex-direction: column; gap: 16px; }
.page-title { font-size: 20px; font-weight: 800; margin: 0; }

.status-tabs { display: flex; gap: 4px; flex-wrap: wrap; }
.status-tab { padding: 6px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; background: transparent; color: var(--text-secondary); transition: .15s; display: flex; gap: 6px; align-items: center; }
.status-tab:hover { background: #F4F5F7; }
.status-tab.active { background: var(--accent); color: #FFF; }
.count { padding: 1px 6px; border-radius: 8px; font-size: 11px; font-weight: 700; background: #E2E8F0; color: var(--text-secondary); }
.status-tab.active .count { background: rgba(255,255,255,0.25); color: #FFF; }

.filter-bar { display: flex; gap: 8px; }
.filter-select { border: 1px solid var(--border); border-radius: 8px; padding: 6px 10px; font-size: 12px; background: var(--card); color: var(--text-secondary); cursor: pointer; }

.alert-list { display: flex; flex-direction: column; gap: 8px; }
.alert-row { background: var(--card); border: 1px solid var(--border-light); border-radius: 12px; padding: 14px 18px; display: flex; align-items: center; gap: 12px; transition: .15s; }
.alert-row:hover { border-color: #CBD5E1; }
.alert-severity { font-size: 16px; flex-shrink: 0; }
.alert-info { flex: 1; min-width: 0; }
.alert-type { font-size: 11px; font-weight: 700; color: var(--text-secondary); }
.alert-source { font-size: 11px; color: var(--text-muted); }
.alert-msg { font-size: 12px; color: var(--text); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.alert-actions { display: flex; gap: 4px; flex-shrink: 0; }

.badge { padding: 2px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; white-space: nowrap; }
.badge-active { background: var(--danger-light); color: var(--danger); }
.badge-acknowledged { background: var(--warning-light); color: var(--warning); }
.badge-resolved { background: var(--success-light); color: var(--success); }
.badge-ignored { background: #F1F5F9; color: var(--text-muted); }

.btn-xs { padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 600; cursor: pointer; border: 1px solid var(--border); background: var(--card); color: var(--text-secondary); transition: .15s; white-space: nowrap; }
.btn-xs:hover { border-color: var(--accent); color: var(--accent); }
.btn-xs.warn { color: var(--warning); }
.btn-xs.success { color: var(--success); }
.btn-xs.muted { color: var(--text-muted); }

.loading-state { text-align: center; padding: 24px; color: var(--text-muted); font-size: 13px; }
.error-bar { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 8px; background: var(--danger-light); border: 1px solid rgba(231,76,60,0.2); color: #991b1b; font-size: 12px; }
</style>
