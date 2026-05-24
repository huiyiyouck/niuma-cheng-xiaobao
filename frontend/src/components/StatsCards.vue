<script setup lang="ts">
import type { ChannelStats } from "@/lib/types";

defineProps<{ stats: ChannelStats }>();
</script>

<template>
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">今日新增</div>
      <div class="stat-value" v-if="stats.today_new >= 0">{{ stats.today_new }}</div>
      <div class="stat-value muted" v-else>--</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">总新闻数</div>
      <div class="stat-value" v-if="stats.total_news >= 0">{{ stats.total_news }}</div>
      <div class="stat-value muted" v-else>--</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">活跃 Source</div>
      <div class="stat-value" v-if="stats.active_sources >= 0">{{ stats.active_sources }}</div>
      <div class="stat-value muted" v-else>--</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">子频道数</div>
      <div class="stat-value" v-if="stats.sub_channel_count >= 0">{{ stats.sub_channel_count }}</div>
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
  border-radius: var(--radius);
  padding: 14px;
  box-shadow: var(--shadow-soft);
}
.stat-label { font-size: 11px; color: var(--muted); font-weight: 600; }
.stat-value { font-size: 26px; font-weight: 900; color: var(--text); margin-top: 2px; }
</style>
