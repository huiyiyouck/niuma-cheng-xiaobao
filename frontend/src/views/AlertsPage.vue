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

const activeStatus = ref<AlertStatus | "">("unprocessed");
const currentPage = ref(1);
const pageSize = ref(20);

// 各状态计数
const statusCounts = ref<Record<string, number>>({
  unprocessed: 0,
  acknowledged: 0,
  recovered: 0,
  ignored: 0,
});

const STATUS_TABS: { value: AlertStatus | ""; label: string }[] = [
  { value: "", label: "全部" },
  { value: "unprocessed", label: "未处理" },
  { value: "acknowledged", label: "已确认" },
  { value: "recovered", label: "已恢复" },
  { value: "ignored", label: "已忽略" },
];

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
    <div class="page-header">
      <span class="page-title">&#128680; 告警中心</span>
      <span class="page-sub">全局 · 所有空间</span>
    </div>

    <div v-if="errorText" class="error-bar"><span>&#9888;</span><span>{{ errorText }}</span></div>

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
        <span v-if="statusCounts[tab.value] !== undefined" class="tab-count">{{ statusCounts[tab.value] }}</span>
      </button>
    </div>

    <!-- 告警列表 -->
    <div v-if="loading && alerts.length === 0" class="loading-state">加载中…</div>

    <EmptyState
      v-else-if="alerts.length === 0"
      icon="&#9989;"
      title="暂无告警"
      description="系统运行正常"
    />

    <div v-else class="alert-list">
      <div
        v-for="a in alerts"
        :key="a.id"
        class="alert-row"
        :class="{ 'row--error': a.type === 'x_auth_failure' || a.type === 'system_db' }"
      >
        <!-- 时间 -->
        <span class="alert-time">{{ formatTime(a.created_at) }}</span>

        <!-- 类型 -->
        <span class="alert-type-tag">{{ alertTypeLabel[a.type] || a.type }}</span>

        <!-- 状态 -->
        <StatusBadge kind="alert" :status="a.status" size="sm" />

        <!-- 消息 -->
        <span class="alert-msg">{{ a.message }}</span>

        <!-- 关联 Source -->
        <button
          v-if="a.source_id"
          class="btn-xs"
          @click="viewSource(a.source_id)"
        >
          {{ a.source_display_name || '查看来源' }}
        </button>
        <span v-else class="no-source">--</span>

        <!-- 操作按钮 -->
        <div class="alert-actions">
          <template v-if="a.status === 'unprocessed'">
            <button class="btn-xs" @click="onUpdateAlert(a, 'acknowledged')">确认</button>
            <button class="btn-xs" @click="onUpdateAlert(a, 'ignored')">忽略</button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.alerts-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.page-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 2px;
}
.page-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}
.page-sub {
  font-size: 11px;
  color: var(--text-muted);
}
.status-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.status-tab {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 6px;
}
.status-tab:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.status-tab.active {
  background: var(--accent);
  color: #FFF;
  border-color: var(--accent);
}
.tab-count {
  font-size: 10px;
  background: rgba(255,255,255,0.3);
  padding: 1px 6px;
  border-radius: 10px;
}
.status-tab:not(.active) .tab-count {
  background: #F1F5F9;
  color: var(--text-muted);
}
.loading-state {
  text-align: center;
  padding: 24px;
  color: var(--text-muted);
  font-size: 13px;
}
.alert-list {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  background: var(--card);
  overflow: hidden;
}
.alert-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  font-size: 12px;
  border-bottom: 1px solid var(--border-light);
  flex-wrap: wrap;
}
.alert-row:last-child { border-bottom: none; }
.alert-row:hover { background: #F8FAFB; }
.row--error { background: var(--danger-light); }
.row--error:hover { background: rgba(231,76,60,0.06); }
.alert-time {
  font-size: 10px;
  color: var(--text-muted);
  font-family: monospace;
  white-space: nowrap;
  flex-shrink: 0;
}
.alert-type-tag {
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
  background: #F1F5F9;
  color: var(--text-secondary);
  flex-shrink: 0;
}
.alert-msg {
  flex: 1;
  color: var(--text-secondary);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.no-source {
  color: var(--text-muted);
  font-size: 10px;
}
.alert-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.btn-xs {
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 600;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
}
.btn-xs:hover { background: #F4F5F7; }
.error-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--danger-light);
  border: 1px solid rgba(231,76,60,0.2);
  color: #991b1b;
  font-size: 12px;
}
</style>
