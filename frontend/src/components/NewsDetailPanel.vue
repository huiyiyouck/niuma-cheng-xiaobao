<script setup lang="ts">
import type { ProcessedNews } from "@/lib/types";
import TagChip from "@/components/TagChip.vue";
import EntityBadge from "@/components/EntityBadge.vue";
import ScoreBadge from "@/components/ScoreBadge.vue";

defineProps<{ item: ProcessedNews | null }>();
const emit = defineEmits<{ close: [] }>();

function fmtTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString();
}
</script>

<template>
  <Transition name="panel">
    <div v-if="item" class="panel-backdrop" @click.self="emit('close')">
      <div class="panel">
        <!-- Sticky header（原型对齐）-->
        <div class="panel-header">
          <span class="panel-header-label">新闻详情</span>
          <button class="panel-close" @click="emit('close')" title="关闭">✕</button>
        </div>
        <div class="panel-body">
          <div class="panel-score">
            <ScoreBadge :score="item.importance_score ?? null" />
          </div>
          <h2 class="panel-title">{{ item.title }}</h2>
          <div class="panel-meta">
            <span v-if="item.published_at">{{ fmtTime(item.published_at) }}</span>
            <span>语言: {{ item.language }}</span>
            <span v-if="item.source_availability_status === 'source_removed'" class="source-removed">来源已移除</span>
            <span v-else class="source-name">{{ item.source_display_name }}</span>
            <span v-if="item.channel_name" class="channel-info"># {{ item.channel_name }}</span>
          </div>
          <p class="panel-summary" v-if="item.summary">{{ item.summary }}</p>
          <p class="panel-summary muted" v-else>暂无摘要</p>

          <div class="panel-section" v-if="item.bullets && item.bullets.length">
            <div class="panel-section-title">要点</div>
            <ul class="panel-bullets">
              <li v-for="(b, i) in item.bullets" :key="i">{{ b }}</li>
            </ul>
          </div>

          <div class="panel-section" v-if="item.tags && item.tags.length">
            <div class="panel-section-title">标签</div>
            <div class="panel-tags">
              <TagChip v-for="t in item.tags" :key="t" :tag="t" />
            </div>
          </div>

          <div class="panel-section" v-if="item.entities && item.entities.length">
            <div class="panel-section-title">实体</div>
            <EntityBadge :entities="item.entities" />
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.panel-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(15, 23, 42, 0.3);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
.panel {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 480px;
  max-width: 100vw;
  background: var(--card);
  border-left: 1px solid var(--border);
  box-shadow: -8px 0 30px rgba(2, 6, 23, 0.1);
  display: flex;
  flex-direction: column;
}
.panel-header {
  position: sticky;
  top: 0;
  background: var(--card);
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 5;
  flex-shrink: 0;
}
.panel-header-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.panel-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--card);
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  transition: 0.15s;
}
.panel-close:hover {
  background: #F4F5F7;
  color: var(--text);
}
.panel-body {
  padding: 24px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.panel-score { margin-bottom: 4px; }
.panel-title {
  font-size: 20px;
  font-weight: 800;
  line-height: 1.4;
  margin: 0;
  color: var(--text);
}
.panel-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--text-muted);
  flex-wrap: wrap;
  align-items: center;
}
.panel-summary {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.8;
  margin: 0;
}
.panel-section { margin-top: 4px; }
.panel-section-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.panel-bullets {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.panel-tags { display: flex; gap: 6px; flex-wrap: wrap; }

.source-removed { color: var(--text-muted); font-style: italic; }
.source-name { color: var(--accent); font-weight: 600; }
.channel-info { color: var(--text-secondary); }

.panel-enter-active,
.panel-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.panel-enter-from,
.panel-leave-to {
  transform: translateX(40px);
  opacity: 0;
}
</style>
