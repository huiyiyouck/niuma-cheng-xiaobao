<script setup lang="ts">
import type { Alert } from "@/lib/types";

defineProps<{ alerts: Alert[] }>();

function severityClass(s: string) {
  return s === "error" || s === "critical" ? "alert--danger" : "alert--warn";
}
function severityLabel(s: string) {
  return s === "error" || s === "critical" ? "🔴 严重" : "⚠ 警告";
}
</script>

<template>
  <div class="alert-section">
    <div class="section-title">🔔 近期告警</div>
    <div v-if="alerts.length === 0" class="muted" style="padding:10px 0">暂无告警</div>
    <div v-for="a in alerts" :key="a.id" class="alert" :class="severityClass(a.severity)">
      <div class="alert-top">
        <span class="alert-sev">{{ severityLabel(a.severity) }}</span>
        <span>{{ a.type }}</span>
        <span>{{ new Date(a.created_at).toLocaleString() }}</span>
      </div>
      <div class="alert-msg">{{ a.message }}</div>
    </div>
  </div>
</template>

<style scoped>
.alert-section {
  background: var(--card); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-soft);
}
.section-title { font-weight: 900; font-size: 15px; margin-bottom: 12px; }
.alert {
  border: 1px solid var(--border); border-radius: 10px;
  padding: 12px 14px; margin-bottom: 8px;
}
.alert--warn { border-left: 3px solid var(--warning); }
.alert--danger { border-left: 3px solid var(--danger); }
.alert-top { display: flex; gap: 8px; font-size: 11px; color: var(--muted); margin-bottom: 4px; }
.alert-sev { font-weight: 700; }
.alert--warn .alert-sev { color: var(--warning); }
.alert--danger .alert-sev { color: var(--danger); }
.alert-msg { font-size: 12px; color: #334155; }
</style>
