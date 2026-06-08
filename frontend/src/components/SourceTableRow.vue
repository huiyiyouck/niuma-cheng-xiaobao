<script setup lang="ts">
import type { SourceWithPositions } from "@/lib/types";
import { computed } from "vue";
import StatusBadge from "@/components/StatusBadge.vue";
import TypeBadge from "@/components/base/TypeBadge.vue";
import MiniTag from "@/components/base/MiniTag.vue";
import BaseButton from "@/components/base/BaseButton.vue";

const props = defineProps<{
  source: SourceWithPositions;
}>();

const emit = defineEmits<{
  view: [id: string];
  edit: [id: string];
  delete: [id: string];
}>();

function formatTime(iso: string | null): string {
  if (!iso) return "--";
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
}

const positionSummary = computed(() => {
  const positions = props.source.display_positions || [];
  const total = positions.length || Number((props.source as any).position_count ?? 0);
  const enabled = positions.length
    ? positions.filter(p => p.enabled).length
    : Number((props.source as any).enabled_position_count ?? 0);
  return `${total} 个位置（${enabled} 启用）`;
});

const levelLabel = computed(() =>
  props.source.attention_level === "core" ? "核心"
    : props.source.attention_level === "regular" ? "常规" : "观察",
);

const roleLabel = computed(() => {
  const map: Record<string, string> = {
    official: "官方",
    media: "媒体",
    kol: "KOL",
    community: "社区",
    paper_institute: "论文机构",
    other: "其他",
  };
  return map[props.source.source_role] || props.source.source_role;
});
</script>

<template>
  <tr class="table-row" :class="{ 'row-paused': source.paused }" @click="emit('view', source.id)">
    <td class="col-name">
      <div class="name-cell">
        <span class="source-name">
          {{ source.display_name }}
          <MiniTag v-if="source.source_origin === 'x_synced'" variant="domain" class="x-sync-tag">X 同步</MiniTag>
          <MiniTag v-if="source.paused" variant="level" class="paused-tag">已暂停</MiniTag>
        </span>
        <span class="source-identity muted">{{ source.source_identity }}</span>
      </div>
    </td>
    <td class="col-type">
      <TypeBadge :type="source.type" />
    </td>
    <td class="col-tags">
      <div class="tags-cell">
        <MiniTag v-if="source.domain_tags.length > 0" variant="domain">{{ source.domain_tags[0] }}</MiniTag>
        <MiniTag v-if="source.domain_tags.length > 1" variant="domain">{{ source.domain_tags[1] }}</MiniTag>
        <MiniTag v-if="source.domain_tags.length > 2" variant="domain">+{{ source.domain_tags.length - 2 }}</MiniTag>
        <MiniTag variant="role">{{ roleLabel }}</MiniTag>
        <MiniTag variant="level">{{ levelLabel }}</MiniTag>
      </div>
    </td>
    <td class="col-availability">
      <StatusBadge kind="availability" :status="source.availability_status" size="sm" />
    </td>
    <td class="col-operational">
      <StatusBadge kind="operational" :status="source.operational_status" size="sm" />
    </td>
    <td class="col-positions">
      <div class="pos-cell" @click.stop>
        <span class="pos-hover">{{ positionSummary }}</span>
        <div class="pos-pop">
          <div v-if="!source.display_positions || source.display_positions.length === 0" class="pos-pop-empty">暂无位置明细</div>
          <div v-for="p in source.display_positions || []" :key="p.id" class="pos-pop-r">
            <span class="pos-pop-loc">{{ p.space_name }} · {{ p.channel_name || '根节点' }}</span>
            <span :class="p.enabled ? 'pos-pop-on' : 'pos-pop-off'">{{ p.enabled ? '● 启用' : '⏸ 暂停' }}</span>
          </div>
        </div>
      </div>
    </td>
    <td class="col-fetch">
      <span class="muted">{{ formatTime(source.last_fetched_at) }}</span>
    </td>
    <td class="col-news">
      <button class="news-link" @click.stop="emit('view', source.id)">{{ source.total_news_count }}</button>
    </td>
    <td class="col-actions" @click.stop>
      <BaseButton size="xs" @click="emit('view', source.id)">详情</BaseButton>
      <BaseButton v-if="source.type !== 'x_twitter'" size="xs" variant="danger" @click="emit('delete', source.id)">删除</BaseButton>
    </td>
  </tr>
</template>

<style scoped>
.table-row {
  cursor: pointer;
  transition: background 0.1s;
  border-bottom: 1px solid var(--border-light);
}
.table-row:hover { background: var(--hover-bg); }
.table-row:last-child { border-bottom: none; }
.table-row td {
  padding: 10px 14px;
  font-size: 12px;
  vertical-align: middle;
}
.col-name { min-width: 200px; }
.name-cell { display: flex; flex-direction: column; gap: 2px; }
.source-name { font-weight: 700; color: var(--text); font-size: 13px; }
.source-identity { font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px; font-family: var(--font-mono); }
.col-type { min-width: 80px; }
.col-tags { min-width: 160px; }
.tags-cell { display: flex; gap: 4px; flex-wrap: wrap; }
.col-availability { min-width: 90px; }
.col-operational { min-width: 80px; }
.col-positions { min-width: 140px; }
.pos-cell { position: relative; display: inline-flex; }
.pos-hover {
  color: var(--accent);
  cursor: help;
  font-size: 11px;
  font-weight: 700;
  text-decoration: underline dotted var(--accent);
  text-underline-offset: 3px;
}
.pos-pop {
  display: none;
  position: absolute;
  z-index: 20;
  left: 0;
  top: calc(100% + 8px);
  width: 240px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card);
  box-shadow: var(--shadow-soft);
}
.pos-cell:hover .pos-pop { display: block; }
.pos-pop-r {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 5px 4px;
  font-size: 11px;
}
.pos-pop-empty { padding: 6px 4px; font-size: 11px; color: var(--text-muted); }
.pos-pop-loc { color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pos-pop-on { color: var(--success); flex-shrink: 0; }
.pos-pop-off { color: var(--text-muted); flex-shrink: 0; }
.col-fetch { min-width: 100px; }
.col-news { min-width: 80px; text-align: center; }
.news-link {
  border: none;
  background: transparent;
  color: var(--accent);
  font-weight: 700;
  cursor: pointer;
  padding: 0;
}
.col-actions { min-width: 110px; display: flex; gap: 4px; }
.row-paused { background: var(--hover-bg, #f6f7f8); opacity: 0.7; }
.x-sync-tag { margin-left: 6px; }
.paused-tag { margin-left: 4px; }
</style>
