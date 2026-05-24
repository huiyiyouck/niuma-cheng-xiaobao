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

function sourceUrl(item: ProcessedNews): string | null {
  const v = item.source_refs?.url;
  return typeof v === "string" && v.length > 0 ? v : null;
}
</script>

<template>
  <Transition name="panel">
    <div v-if="item" class="panel-backdrop" @click.self="emit('close')">
      <div class="panel">
        <button class="panel-close" @click="emit('close')">✕</button>
        <div class="panel-body">
          <div class="panel-score">
            <ScoreBadge :score="item.importance_score ?? null" />
          </div>
          <h2 class="panel-title">{{ item.title }}</h2>
          <div class="panel-meta">
            <span v-if="item.published_at">{{ fmtTime(item.published_at) }}</span>
            <span>语言: {{ item.language }}</span>
          </div>
          <p class="panel-summary">{{ item.summary }}</p>

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

          <div class="panel-links" v-if="sourceUrl(item)">
            <a :href="sourceUrl(item)!" target="_blank" rel="noreferrer">📎 查看原文</a>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.panel-backdrop {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(15, 23, 42, 0.2);
  backdrop-filter: blur(2px);
}
.panel {
  position: absolute; right: 0; top: 0; bottom: 0;
  width: 440px; max-width: 92vw;
  background: var(--card); border-left: 1px solid var(--border);
  box-shadow: -8px 0 30px rgba(2, 6, 23, 0.1);
  overflow-y: auto; padding: 28px 24px;
}
.panel-close {
  position: absolute; top: 12px; right: 16px;
  border: none; background: none; font-size: 18px;
  cursor: pointer; color: var(--muted);
}
.panel-body { display: flex; flex-direction: column; gap: 14px; }
.panel-score { margin-bottom: 4px; }
.panel-title { font-size: 18px; font-weight: 900; line-height: 1.4; margin: 0; }
.panel-meta { display: flex; gap: 12px; font-size: 11px; color: var(--muted); }
.panel-summary { font-size: 14px; color: #334155; line-height: 1.8; margin: 0; }
.panel-section { margin-top: 4px; }
.panel-section-title { font-size: 11px; font-weight: 700; color: var(--muted); margin-bottom: 8px; text-transform: uppercase; }
.panel-bullets { margin: 0; padding-left: 18px; font-size: 13px; color: #475569; display: flex; flex-direction: column; gap: 6px; }
.panel-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.panel-links { margin-top: 8px; }
.panel-links a { font-size: 13px; font-weight: 600; }

.panel-enter-active, .panel-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.panel-enter-from, .panel-leave-to {
  transform: translateX(40px); opacity: 0;
}
</style>
