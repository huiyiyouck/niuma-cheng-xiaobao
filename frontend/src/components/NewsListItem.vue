<script setup lang="ts">
import { ref } from "vue";
import type { ProcessedNews } from "@/lib/types";
import ScoreBadge from "@/components/ScoreBadge.vue";

const props = defineProps<{ item: ProcessedNews }>();
const emit = defineEmits<{ open: [item: ProcessedNews] }>();

// v0.5 原型对齐：列表卡片默认折叠（标题+一行摘要+meta），点击进入详情 panel
function onClick() {
  if (isSourceRemoved) return;
  emit("open", props.item);
}

function fmtTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return `${Math.floor(diff / 60000)} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

const isSourceRemoved = props.item.source_availability_status === "source_removed";
</script>

<template>
  <div class="news-card" :class="{ 'news-card--removed': isSourceRemoved }" @click="onClick">
    <div class="news-top">
      <div class="news-title">{{ item.title }}</div>
      <ScoreBadge :score="item.importance_score ?? null" />
    </div>
    <p class="news-summary" v-if="item.summary">{{ item.summary }}</p>
    <div class="news-meta">
      <span v-if="item.channel_name" class="news-channel"># {{ item.channel_name }}</span>
      <span v-for="t in (item.tags || []).slice(0, 3)" :key="t" class="news-tag">{{ t }}</span>
      <span v-if="isSourceRemoved" class="source-removed-label">来源已移除</span>
      <span v-else class="source-label">{{ item.source_display_name }}</span>
      <span class="news-time">{{ fmtTime(item.published_at) }}</span>
    </div>
  </div>
</template>

<style scoped>
.news-card {
  background: var(--card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 18px 20px;
  transition: 0.15s;
  cursor: pointer;
}
.news-card:hover {
  border-color: #CBD5E1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
}
.news-card--removed {
  cursor: default;
  opacity: 0.7;
}
.news-card--removed:hover {
  transform: none;
  box-shadow: none;
  border-color: var(--border-light);
}
.news-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.news-title {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.4;
  flex: 1;
  color: var(--text);
}
.news-summary {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 6px 0 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.news-meta {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 8px;
  font-size: 11px;
  color: var(--text-muted);
  flex-wrap: wrap;
}
.news-channel {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--accent-light);
  color: var(--accent);
  font-weight: 600;
}
.news-tag {
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--accent-light);
  color: var(--accent);
  font-size: 10px;
  font-weight: 700;
}
.source-removed-label {
  color: var(--text-muted);
  font-style: italic;
}
.source-label {
  color: var(--text-secondary);
}
.news-time { margin-left: auto; }
</style>