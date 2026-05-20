<script setup lang="ts">
import type { StatsOverview } from "@/lib/types";

defineProps<{ stats: StatsOverview }>();
</script>

<template>
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">今日新增</div>
      <div class="stat-value" v-if="stats.today_new >= 0">{{ stats.today_new }}</div>
      <div class="stat-value muted" v-else>开发中</div>
      <div class="stat-change muted">统计接口开发中</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">平均评分</div>
      <div class="stat-value" v-if="stats.avg_score != null">{{ stats.avg_score.toFixed(1) }}</div>
      <div class="stat-value muted" v-else>开发中</div>
      <div class="stat-change muted">评分系统开发中</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">活跃渠道</div>
      <div class="stat-value" v-if="stats.active_channels >= 0">{{ stats.active_channels }}/{{ stats.total_channels }}</div>
      <div class="stat-value muted" v-else>开发中</div>
      <div class="stat-change muted">统计接口开发中</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">待处理</div>
      <div class="stat-value" v-if="stats.pending_tasks >= 0">{{ stats.pending_tasks }}</div>
      <div class="stat-value muted" v-else>开发中</div>
      <div class="stat-change muted">统计接口开发中</div>
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
.stat-change { font-size: 10px; margin-top: 2px; }
.stat-change.up { color: var(--success); }
.stat-change.down { color: var(--danger); }
.stat-change.muted { color: var(--muted); }
</style>
