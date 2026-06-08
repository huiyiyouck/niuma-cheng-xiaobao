<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { Alert, AlertStatus } from "@/lib/types";
import { listAlerts, updateAlertStatus, batchUpdateAlerts } from "@/lib/api";
import EmptyState from "@/components/EmptyState.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import { useToast } from "@/composables/useToast";

const toast = useToast();

const alerts = ref<Alert[]>([]);
const total = ref(0);
const loading = ref(false);
const errorText = ref<string | null>(null);
const batchLoading = ref(false);

const activeStatus = ref<AlertStatus | "">("active");
const statusCounts = ref<Record<string, number>>({ "": 0, active: 0, acknowledged: 0, resolved: 0, ignored: 0 });

const STATUS_TABS: { value: AlertStatus | ""; label: string; color: string }[] = [
  { value: "", label: "全部", color: "" },
  { value: "active", label: "未处理", color: "var(--danger)" },
  { value: "acknowledged", label: "已确认", color: "var(--warning)" },
  { value: "resolved", label: "已恢复", color: "var(--success)" },
  { value: "ignored", label: "已忽略", color: "var(--text-muted)" },
];

function statusLabel(s: string): string {
  const m: Record<string, string> = { active: "未处理", acknowledged: "已确认", resolved: "已恢复", ignored: "已忽略" };
  return m[s] || s;
}

const alertTypeLabel: Record<string, string> = {
  source_error: "来源异常", x_stream_global: "X Stream 全局",
  x_auth_failure: "X 鉴权失败", system_db: "数据库异常", system_queue: "任务队列异常",
  x_stream_disconnected: "X Stream 断连",
};

function severityLevel(a: Alert): "high" | "medium" | "low" {
  if (a.type === "x_auth_failure" || a.type === "system_db") return "high";
  if (a.severity === "warning") return "medium";
  return "low";
}
function severityDot(a: Alert): string {
  const lv = severityLevel(a);
  return lv === "high" ? "#EF4444" : lv === "medium" ? "#F59E0B" : "#3B82F6";
}
function formatTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso); const now = Date.now();
  const diff = Math.floor((now - d.getTime()) / 60000);
  if (diff < 1) return "刚刚";
  if (diff < 60) return `${diff} 分钟前`;
  return `${Math.floor(diff / 60)} 小时前`;
}

async function loadAlerts() {
  loading.value = true; errorText.value = null;
  try {
    const params: any = { limit: 200, offset: 0 };
    if (activeStatus.value) params.status = activeStatus.value;
    const res = await listAlerts(params);
    alerts.value = res.alerts; total.value = res.total;
    if (res.counts) {
      statusCounts.value.active = res.counts.active;
      statusCounts.value.acknowledged = res.counts.acknowledged;
      statusCounts.value.resolved = res.counts.resolved;
      statusCounts.value.ignored = res.counts.ignored;
      statusCounts.value[""] = res.counts.active + res.counts.acknowledged + res.counts.resolved + res.counts.ignored;
    }
  } catch (e) { errorText.value = e instanceof Error ? e.message : String(e); }
  finally { loading.value = false; }
}

async function onStatusChange(status: AlertStatus | "") { activeStatus.value = status; await loadAlerts(); }

async function onUpdateAlert(alert: Alert, newStatus: AlertStatus) {
  try {
    await updateAlertStatus(alert.id, newStatus);
    toast.success(`告警已${statusLabel(newStatus)}`);
    await loadAlerts();
  } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
}

async function onBatchUpdate(toStatus: string) {
  batchLoading.value = true;
  try {
    const r = await batchUpdateAlerts(activeStatus.value || "active", toStatus);
    const label = toStatus === "acknowledged" ? "确认" : toStatus === "ignored" ? "忽略" : "标记恢复";
    toast.success(`已批量${label} ${r.updated} 条`);
    await loadAlerts();
  } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
  finally { batchLoading.value = false; }
}

onMounted(async () => { await loadAlerts(); });
</script>

<template>
  <div class="alerts-page">
    <h1 class="page-title">告警</h1>
    <div v-if="errorText" class="error-bar">⚠️ {{ errorText }}</div>

    <!-- 状态 Tab + 计数 -->
    <div class="tabs-row">
      <button v-for="tab in STATUS_TABS" :key="tab.value" class="tab-pill" :class="{ active: activeStatus === tab.value }" @click="onStatusChange(tab.value)">
        {{ tab.label }}
        <span class="tab-count" v-if="statusCounts[tab.value] !== undefined">{{ statusCounts[tab.value] }}</span>
      </button>
    </div>

    <!-- 批量操作 -->
    <div v-if="alerts.length > 0 && (activeStatus === 'active' || activeStatus === 'acknowledged')" class="batch-bar">
      <template v-if="activeStatus === 'active'">
        <span class="batch-label">{{ alerts.length }} 条未处理</span>
        <BaseButton size="xs" variant="primary" :disabled="batchLoading" @click="onBatchUpdate('acknowledged')">一键确认</BaseButton>
        <BaseButton size="xs" :disabled="batchLoading" @click="onBatchUpdate('ignored')">一键忽略</BaseButton>
      </template>
      <template v-if="activeStatus === 'acknowledged'">
        <span class="batch-label">{{ alerts.length }} 条已确认</span>
        <BaseButton size="xs" variant="primary" :disabled="batchLoading" @click="onBatchUpdate('resolved')">一键标记恢复</BaseButton>
        <BaseButton size="xs" :disabled="batchLoading" @click="onBatchUpdate('ignored')">一键忽略</BaseButton>
      </template>
    </div>

    <div v-if="loading && alerts.length === 0" class="loading-state">加载中…</div>
    <EmptyState v-else-if="alerts.length === 0" icon="✅" title="暂无告警" description="一切正常" />

    <!-- 告警列表 -->
    <div v-else class="alert-list">
      <div v-for="a in alerts" :key="a.id" class="alert-card">
        <span class="alert-dot" :style="{ background: severityDot(a) }" />
        <div class="alert-body">
          <div class="alert-top">
            <span class="alert-type-tag">{{ alertTypeLabel[a.type] || a.type }}</span>
            <span v-if="a.source_display_name" class="alert-src">{{ a.source_display_name }}</span>
            <span class="alert-time">{{ formatTime(a.created_at) }}</span>
          </div>
          <div class="alert-msg">{{ a.message }}</div>
        </div>
        <span class="alert-status-badge" :class="a.status">{{ statusLabel(a.status) }}</span>
        <div class="alert-actions">
          <template v-if="a.status === 'active'">
            <button class="act-btn act-ok" @click="onUpdateAlert(a, 'acknowledged')">确认</button>
            <button class="act-btn act-muted" @click="onUpdateAlert(a, 'ignored')">忽略</button>
          </template>
          <template v-if="a.status === 'acknowledged'">
            <button class="act-btn act-ok" @click="onUpdateAlert(a, 'resolved')">恢复</button>
            <button class="act-btn act-muted" @click="onUpdateAlert(a, 'ignored')">忽略</button>
          </template>
          <template v-if="a.status === 'ignored'">
            <button class="act-btn act-muted" @click="onUpdateAlert(a, 'active')">重新打开</button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.alerts-page { display: flex; flex-direction: column; gap: 14px; }
/* .page-title 走全局定义（style.css），不在此重写以保持字号字重一致 */

/* Tabs */
.tabs-row { display: flex; gap: 4px; flex-wrap: wrap; }
.tab-pill {
  padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 600;
  cursor: pointer; border: 1px solid var(--border); background: var(--card);
  color: var(--text-secondary); transition: 0.15s; font-family: inherit;
  display: flex; align-items: center; gap: 6px;
}
.tab-pill:hover { border-color: #CBD5E1; }
.tab-pill.active { background: var(--accent); color: #FFF; border-color: var(--accent); }
.tab-count { font-size: 10px; padding: 0 5px; border-radius: 8px; background: #E2E8F0; color: var(--text-secondary); font-weight: 700; }
.tab-pill.active .tab-count { background: rgba(255,255,255,0.25); color: #FFF; }

/* Batch bar */
.batch-bar { display: flex; align-items: center; gap: 6px; }
.batch-label { font-size: 12px; color: var(--text-muted); margin-right: 4px; }

/* Alert cards */
.alert-list { display: flex; flex-direction: column; gap: 6px; }
.alert-card {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 12px 16px; background: var(--card);
  border: 1px solid var(--border-light); border-radius: 10px;
  transition: 0.15s;
}
.alert-card:hover { border-color: #CBD5E1; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
.alert-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
.alert-body { flex: 1; min-width: 0; }
.alert-top { display: flex; align-items: center; gap: 8px; margin-bottom: 3px; flex-wrap: wrap; }
.alert-type-tag {
  font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 6px;
  background: #F1F5F9; color: var(--text-secondary);
}
.alert-src { font-size: 11px; color: var(--accent); font-weight: 600; }
.alert-time { font-size: 10px; color: var(--text-muted); margin-left: auto; }
.alert-msg { font-size: 12px; color: var(--text); line-height: 1.4; }

.alert-status-badge {
  font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; flex-shrink: 0; margin-top: 2px;
}
.alert-status-badge.active { background: var(--danger-light); color: var(--danger); }
.alert-status-badge.acknowledged { background: var(--warning-light); color: #92400e; }
.alert-status-badge.resolved { background: var(--success-light); color: var(--success); }
.alert-status-badge.ignored { background: #F1F5F9; color: var(--text-muted); }

.alert-actions { display: flex; gap: 4px; flex-shrink: 0; }
.act-btn {
  font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 6px;
  border: 1px solid var(--border); background: var(--card); color: var(--text-secondary);
  cursor: pointer; font-family: inherit; transition: 0.15s; white-space: nowrap;
}
.act-btn:hover { background: #F4F5F7; }
.act-ok:hover { background: var(--accent-light); border-color: var(--accent); color: var(--accent); }
.act-muted:hover { background: #F1F5F9; color: var(--text-muted); }
</style>
