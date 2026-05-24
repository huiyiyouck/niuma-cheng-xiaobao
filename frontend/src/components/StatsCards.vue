<script setup lang="ts">
import type { ChannelStats } from "@/lib/types";

defineProps<{ stats: ChannelStats }>();

const cards = [
  { key: "total_news" as const, label: "总新闻数", color: "#1a1a2e" },
  { key: "today_new" as const, label: "今日新增", color: "#2ecc71" },
  { key: "active_sources" as const, label: "活跃 Source", color: "#3498db" },
  { key: "sub_channel_count" as const, label: "子频道数", color: "#9b59b6" },
];
</script>

<template>
  <div class="stats-grid">
    <div v-for="c in cards" :key="c.key" class="stat-card">
      <div class="stat-label">{{ c.label }}</div>
      <div class="stat-value" v-if="stats[c.key] >= 0" :style="{ color: c.color }">{{ stats[c.key] }}</div>
      <div class="stat-value muted" v-else>--</div>
    </div>
  </div>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
.stat-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px;
  box-shadow: var(--shadow-soft);
}
.stat-label { font-size: 11px; color: var(--muted); font-weight: 600; margin-bottom: 6px; }
.stat-value { font-size: 28px; font-weight: 900; margin-top: 2px; }
.stat-value.muted { font-size: 16px; color: var(--muted); }
</style>
