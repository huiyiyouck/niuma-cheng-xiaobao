<script setup lang="ts">
import type { SourceWithPositions } from "@/lib/types";
import { computed } from "vue";
import StatusBadge from "@/components/StatusBadge.vue";

// v0.5: 信息源库表格行
// 分列展示：信息源、类型、标签、运行状态、使用位置、最近抓取、历史新闻、操作
const props = defineProps<{
  source: SourceWithPositions;
}>();

const emit = defineEmits<{
  view: [id: string];
  edit: [id: string];
  delete: [id: string];
}>();

function typeLabel(t: string): string {
  return t === "x_twitter" ? "X/Twitter" : "RSS";
}

function formatTime(iso: string | null): string {
  if (!iso) return "--";
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "刚刚";
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
}

// 启用位置数 / 总位置数
const positionSummary = computed(() => {
  const positions = props.source.display_positions || [];
  const enabled = positions.filter(p => p.enabled).length;
  return `${enabled}/${positions.length}`;
});
</script>

<template>
  <tr class="table-row" @click="emit('view', source.id)">
    <!-- 信息源名称 -->
    <td class="col-name">
      <div class="name-cell">
        <span class="source-name">{{ source.display_name }}</span>
        <span class="source-identity muted">{{ source.source_identity }}</span>
      </div>
    </td>
    <!-- 类型 -->
    <td class="col-type">
      <span class="type-badge" :class="source.type === 'x_twitter' ? 'type-twitter' : 'type-rss'">
        {{ typeLabel(source.type) }}
      </span>
    </td>
    <!-- 标签 -->
    <td class="col-tags">
      <div class="tags-cell">
        <span v-if="source.domain_tags.length > 0" class="mini-tag">{{ source.domain_tags[0] }}</span>
        <span v-if="source.domain_tags.length > 1" class="mini-tag more-tag">+{{ source.domain_tags.length - 1 }}</span>
        <span class="mini-tag role-tag">{{ source.source_role }}</span>
        <span class="mini-tag level-tag">{{ source.attention_level === 'core' ? '核心' : source.attention_level === 'regular' ? '常规' : '观察' }}</span>
      </div>
    </td>
    <!-- 双维度状态 -->
    <td class="col-status">
      <div class="status-cell">
        <StatusBadge kind="availability" :status="source.availability_status" size="sm" />
        <StatusBadge kind="operational" :status="source.operational_status" size="sm" />
      </div>
    </td>
    <!-- 使用位置 -->
    <td class="col-positions">
      <span class="pos-count">{{ positionSummary }}</span>
    </td>
    <!-- 最近抓取 -->
    <td class="col-fetch">
      <span class="muted">{{ formatTime(source.last_fetched_at) }}</span>
    </td>
    <!-- 历史新闻 -->
    <td class="col-news">
      <span>{{ source.total_news_count }}</span>
    </td>
    <!-- 操作 -->
    <td class="col-actions" @click.stop>
      <button class="btn-xs" @click="emit('edit', source.id)">编辑</button>
      <button class="btn-xs btn-danger" @click="emit('delete', source.id)">删除</button>
    </td>
  </tr>
</template>

<style scoped>
.table-row {
  cursor: pointer;
  transition: background 0.1s;
  border-bottom: 1px solid var(--border-light);
}
.table-row:hover { background: #F8FAFB; }
.table-row:last-child { border-bottom: none; }
.table-row td {
  padding: 10px 14px;
  font-size: 13px;
  vertical-align: middle;
}
.col-name { min-width: 180px; }
.name-cell { display: flex; flex-direction: column; gap: 2px; }
.source-name { font-weight: 700; color: var(--text); font-size: 13px; }
.source-identity { font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }
.col-type { min-width: 80px; }
.type-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 700;
}
.type-twitter { background: var(--accent-light); color: var(--accent); }
.type-rss { background: var(--warning-light); color: var(--warning); }
.col-tags { min-width: 140px; }
.tags-cell { display: flex; gap: 4px; flex-wrap: wrap; }
.mini-tag {
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
  background: #F1F5F9;
  color: var(--text-secondary);
}
.more-tag { background: var(--accent-light); color: var(--accent); }
.role-tag { background: #E8F8F0; color: var(--success); }
.level-tag { background: var(--warning-light); color: var(--warning); }
.col-status { min-width: 150px; }
.status-cell { display: flex; gap: 4px; flex-wrap: wrap; }
.col-positions { min-width: 60px; text-align: center; }
.pos-count { font-weight: 700; font-size: 12px; color: var(--text-secondary); }
.col-fetch { min-width: 80px; }
.col-news { min-width: 60px; text-align: center; }
.col-actions { min-width: 110px; }
.btn-xs {
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 600;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text-secondary);
  cursor: pointer;
  margin-right: 4px;
}
.btn-xs:hover { background: #F4F5F7; }
.btn-danger { color: var(--danger); }
.btn-danger:hover { background: var(--danger-light); }
</style>
