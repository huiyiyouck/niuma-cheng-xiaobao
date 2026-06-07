<script setup lang="ts">
import type { SpaceStats } from "@/lib/types";

defineProps<{ stats: SpaceStats }>();

const cards = [
  { key: "total_news" as const, label: "总新闻数", color: "#1a1a2e" },
  { key: "today_new" as const, label: "今日新增", color: "#2ecc71" },
  { key: "active_sources" as const, label: "活跃 Source", color: "#3498db" },
  { key: "channel_count" as const, label: "频道数", color: "#9b59b6" },
];
</script>

<template>
  <div class="stats-grid">
    <div v-for="c in cards" :key="c.key" class="stat-card">
      <div class="stat-value" :style="{ color: c.color }">
        {{ (stats as any)[c.key] >= 0 ? (stats as any)[c.key] : "--" }}
      </div>
      <div class="stat-label">{{ c.label }}</div>
    </div>
  </div>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
.stat-card {
  background: var(--card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 16px 18px;
  box-shadow: var(--shadow-soft);
}
.stat-value {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.5px;
  line-height: 1.2;
}
.stat-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 2px;
}
</style>