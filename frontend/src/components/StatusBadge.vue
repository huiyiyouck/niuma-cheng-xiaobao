<script setup lang="ts">
import { computed } from "vue";

// v0.5: 统一双维度状态 Badge
// kind: availability | operational | alert
// status: 对应维度枚举值
// size: sm | md

const props = withDefaults(defineProps<{
  kind: "availability" | "operational" | "alert";
  status: string;
  size?: "sm" | "md";
}>(), { size: "md" });

// 可用性状态映射
const availabilityMap: Record<string, { label: string; bg: string; text: string }> = {
  normal: { label: "正常", bg: "var(--success-light)", text: "var(--success)" },
  awaiting_repair: { label: "待修复", bg: "var(--warning-light)", text: "var(--warning)" },
  source_error: { label: "来源异常", bg: "var(--danger-light)", text: "var(--danger)" },
  source_removed: { label: "来源已移除", bg: "#F1F5F9", text: "var(--text-muted)" },
};

// 运行状态映射
const operationalMap: Record<string, { label: string; bg: string; text: string; dot: boolean }> = {
  fetching: { label: "抓取中", bg: "var(--success-light)", text: "var(--success)", dot: true },
  stopped: { label: "已停止", bg: "#F1F5F9", text: "var(--text-muted)", dot: false },
  unused: { label: "未使用", bg: "#F1F5F9", text: "var(--text-muted)", dot: false },
};

// 告警状态映射
const alertMap: Record<string, { label: string; bg: string; text: string }> = {
  unprocessed: { label: "未处理", bg: "var(--danger-light)", text: "var(--danger)" },
  acknowledged: { label: "已确认", bg: "var(--warning-light)", text: "var(--warning)" },
  recovered: { label: "已恢复", bg: "var(--success-light)", text: "var(--success)" },
  ignored: { label: "已忽略", bg: "#F1F5F9", text: "var(--text-muted)" },
};

const config = computed(() => {
  if (props.kind === "availability") return availabilityMap[props.status] || availabilityMap.normal;
  if (props.kind === "operational") return operationalMap[props.status] || operationalMap.unused;
  if (props.kind === "alert") return alertMap[props.status] || alertMap.unprocessed;
  return { label: props.status, bg: "#F1F5F9", text: "var(--text-muted)" };
});

const isOperational = computed(() => props.kind === "operational");
const showDot = computed(() => isOperational.value && (operationalMap[props.status]?.dot ?? false));
</script>

<template>
  <span
    class="status-badge"
    :class="[`status-badge--${size}`, `status-badge--${kind}`]"
    :style="{ background: config.bg, color: config.text }"
  >
    <span v-if="showDot" class="status-dot-inline" :style="{ background: config.text }"></span>
    {{ config.label }}
  </span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 20px;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
}
.status-badge--md {
  padding: 2px 10px;
  font-size: 12px;
}
.status-badge--sm {
  padding: 2px 8px;
  font-size: 11px;
}
.status-dot-inline {
  width: 6px; height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
