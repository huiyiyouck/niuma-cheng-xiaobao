<script setup lang="ts">
import type { Alert } from "@/lib/types";
import { useToast } from "@/composables/useToast";

defineProps<{ alerts: Alert[] }>();
const emit = defineEmits<{ refresh: [] }>();
const toast = useToast();

function severityClass(s: string) {
  return s === "error" || s === "critical" ? "alert--danger" : "alert--warn";
}
function severityLabel(s: string) {
  return s === "error" || s === "critical" ? "🔴 严重" : "⚠ 警告";
}
function statusClass(s: string) {
  if (s === "active") return "status--active";
  if (s === "acknowledged") return "status--acknowledged";
  return "status--resolved";
}
function statusLabel(s: string) {
  if (s === "active") return "● 未处理";
  if (s === "acknowledged") return "● 已确认";
  return "● 已解决";
}

async function updateStatus(a: Alert, status: string) {
  try {
    const res = await fetch(`/v1/alerts/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || "操作失败");
    toast.success(status === "resolved" ? "已标记为已解决" : "已标记为已确认");
    emit("refresh");
  } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
}
</script>

<template>
  <div class="alert-section">
    <div class="section-title">🔔 近期告警</div>
    <div v-if="alerts.length === 0" class="muted" style="padding:10px 0">暂无告警</div>
    <div v-for="a in alerts" :key="a.id" class="alert" :class="severityClass(a.severity)">
      <div class="alert-top">
        <span :class="'alert-status ' + statusClass(a.status)">{{ statusLabel(a.status) }}</span>
        <span class="alert-sev">{{ severityLabel(a.severity) }}</span>
        <span>{{ a.type }}</span>
        <span style="font-size:10px; color: var(--text-muted)">{{ new Date(a.created_at).toLocaleString() }}</span>
      </div>
      <div class="alert-msg">{{ a.message }}</div>
      <div class="alert-actions" v-if="a.status === 'active' || a.status === 'acknowledged'">
        <button v-if="a.status === 'active'" class="btn-xs" @click="updateStatus(a, 'acknowledged')">标记已确认</button>
        <button class="btn-xs btn-xs--gray" @click="updateStatus(a, 'resolved')">标记已解决</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.alert-section {
  background: var(--card); border: 1px solid var(--border);
  border-radius: 12px; padding: 20px; box-shadow: var(--shadow-soft);
}
.section-title { font-weight: 800; font-size: 15px; margin-bottom: 12px; color: var(--text); }
.alert {
  border: 1px solid var(--border-light); border-radius: 10px;
  padding: 10px 14px; margin-bottom: 8px; background: var(--card);
}
.alert--warn { border-left: 3px solid var(--warning); }
.alert--danger { border-left: 3px solid var(--danger); }
.alert-top { display: flex; gap: 8px; align-items: center; font-size: 11px; margin-bottom: 4px; }
.alert-sev { font-weight: 700; }
.alert--warn .alert-sev { color: var(--warning); }
.alert--danger .alert-sev { color: var(--danger); }
.alert-msg { font-size: 12px; color: var(--text-secondary); line-height: 1.5; }

.alert-status {
  display: inline-block; padding: 1px 8px; border-radius: 20px;
  font-size: 10px; font-weight: 700;
}
.status--active { background: var(--danger-light); color: var(--danger); }
.status--acknowledged { background: var(--warning-light); color: var(--warning); }
.status--resolved { background: #F1F5F9; color: var(--text-muted); }

.alert-actions { margin-top: 6px; display: flex; gap: 6px; }
.btn-xs {
  padding: 2px 8px; font-size: 10px; border-radius: 4px; border: none;
  background: none; cursor: pointer; color: var(--warning); font-weight: 600;
}
.btn-xs:hover { text-decoration: underline; }
.btn-xs--gray { color: var(--text-muted); }
</style>
