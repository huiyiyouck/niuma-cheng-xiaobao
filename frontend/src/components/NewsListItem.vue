<script setup lang="ts">
import { ref } from "vue";
import type { ProcessedNews } from "@/lib/types";
import ScoreBadge from "@/components/ScoreBadge.vue";

const props = defineProps<{ item: ProcessedNews }>();

const expanded = ref(true);

function toggle() { expanded.value = !expanded.value; }

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

// v0.5: 来源已移除时不可点击
const isSourceRemoved = props.item.source_availability_status === "source_removed";
</script>

<template>
  <div class="ni" :class="{ expanded, 'ni--removed': isSourceRemoved }" @click="isSourceRemoved ? null : toggle()">
    <div class="ni-row">
      <ScoreBadge :score="item.importance_score ?? null" />
      <div class="ni-body">
        <div class="ni-title">{{ item.title }}</div>
        <div class="ni-meta">
          <!-- v0.5: 显示频道名称 -->
          <span v-if="item.channel_name"># {{ item.channel_name }}</span>
          <span>{{ fmtTime(item.published_at) }}</span>
          <!-- v0.5: 来源已移除 -->
          <span v-if="isSourceRemoved" class="source-removed-label">来源已移除</span>
          <span v-else class="source-label">{{ item.source_display_name }}</span>
        </div>
      </div>
      <span class="ni-arrow">{{ expanded ? '▾' : '▸' }}</span>
    </div>
    <div class="ni-detail" v-if="expanded" @click.stop>
      <p class="ni-summary">{{ item.summary }}</p>
      <div class="ni-tags" v-if="item.tags && item.tags.length">
        <span class="tag" v-for="t in item.tags" :key="t">{{ t }}</span>
      </div>
      <div class="ni-bullets" v-if="item.bullets && item.bullets.length">
        <div v-for="(b, i) in item.bullets" :key="i">{{ b }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ni {
  background: var(--card); border: 1px solid var(--border);
  border-radius: var(--radius); overflow: hidden;
  box-shadow: var(--shadow-soft); cursor: pointer;
}
.ni--removed {
  cursor: default;
  opacity: 0.7;
}
.ni-row {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px;
}
.ni-row:hover { background: #fafbff; }
.ni-body { flex: 1; min-width: 0; }
.ni-title {
  font-size: 13px; font-weight: 700;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.ni-meta { display: flex; gap: 10px; margin-top: 3px; font-size: 11px; color: var(--muted); align-items: center; }
.ni-arrow { font-size: 11px; color: var(--muted); flex-shrink: 0; }
.ni-detail { padding: 0 16px 16px; border-top: 1px solid #f1f5f9; }
.ni-summary { font-size: 13px; color: #334155; line-height: 1.7; margin-top: 12px; }
.ni-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
.tag { padding: 3px 8px; border-radius: 999px; font-size: 10px; background: #f1f5f9; color: #475569; }
.ni-bullets { margin-top: 10px; font-size: 11px; color: var(--muted); }

/* v0.5: 来源已移除灰色标记 */
.source-removed-label {
  color: var(--text-muted);
  font-style: italic;
}
.source-label {
  color: var(--accent);
}
</style>
