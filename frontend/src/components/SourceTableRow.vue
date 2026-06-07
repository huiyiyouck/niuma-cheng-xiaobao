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
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "刚刚";
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
}

const positionSummary = computed(() => {
  const positions = props.source.display_positions || [];
  const enabled = positions.filter(p => p.enabled).length;
  return `${enabled}/${positions.length}`;
});

const levelLabel = computed(() =>
  props.source.attention_level === "core" ? "核心"
    : props.source.attention_level === "regular" ? "常规" : "观察",
);
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
        <MiniTag v-if="source.domain_tags.length > 1" variant="domain">+{{ source.domain_tags.length - 1 }}</MiniTag>
        <MiniTag variant="role">{{ source.source_role }}</MiniTag>
        <MiniTag variant="level">{{ levelLabel }}</MiniTag>
      </div>
    </td>
    <td class="col-status">
      <div class="status-cell">
        <StatusBadge kind="availability" :status="source.availability_status" size="sm" />
        <StatusBadge kind="operational" :status="source.operational_status" size="sm" />
      </div>
    </td>
    <td class="col-positions">
      <span class="pos-count">{{ positionSummary }}</span>
    </td>
    <td class="col-fetch">
      <span class="muted">{{ formatTime(source.last_fetched_at) }}</span>
    </td>
    <td class="col-news">
      <span>{{ source.total_news_count }}</span>
    </td>
    <td class="col-actions" @click.stop>
      <BaseButton size="xs" @click="emit('edit', source.id)">编辑</BaseButton>
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
  font-size: 13px;
  vertical-align: middle;
}
.col-name { min-width: 180px; }
.name-cell { display: flex; flex-direction: column; gap: 2px; }
.source-name { font-weight: 700; color: var(--text); font-size: 13px; }
.source-identity { font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; font-family: var(--font-mono); }
.col-type { min-width: 80px; }
.col-tags { min-width: 140px; }
.tags-cell { display: flex; gap: 4px; flex-wrap: wrap; }
.col-status { min-width: 150px; }
.status-cell { display: flex; gap: 4px; flex-wrap: wrap; }
.col-positions { min-width: 60px; text-align: center; }
.pos-count { font-weight: 700; font-size: 12px; color: var(--text-secondary); }
.col-fetch { min-width: 80px; }
.col-news { min-width: 60px; text-align: center; }
.col-actions { min-width: 110px; display: flex; gap: 4px; }
.row-paused { background: var(--hover-bg, #f6f7f8); opacity: 0.7; }
.x-sync-tag { margin-left: 6px; }
.paused-tag { margin-left: 4px; }
</style>
