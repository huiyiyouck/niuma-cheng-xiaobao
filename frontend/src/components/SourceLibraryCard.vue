<script setup lang="ts">
import { computed } from "vue";
import type { SourceWithPositions } from "@/lib/types";
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

const hasAlert = computed(() =>
  props.source.availability_status === "source_error" || props.source.availability_status === "awaiting_repair",
);
</script>

<template>
  <div class="lib-card" :class="{ 'card--paused': source.paused, 'card--alert': hasAlert }" @click="emit('view', source.id)">
    <!-- 头部：名称 + 徽章 -->
    <div class="card-header">
      <span class="card-name">
        {{ source.display_name }}
        <MiniTag v-if="source.source_origin === 'x_synced'" variant="domain">X 同步</MiniTag>
        <MiniTag v-if="source.paused" variant="level">已暂停</MiniTag>
      </span>
      <div class="card-badges">
        <TypeBadge :type="source.type" />
        <StatusBadge kind="availability" :status="source.availability_status" size="sm" />
        <StatusBadge kind="operational" :status="source.operational_status" size="sm" />
      </div>
    </div>

    <!-- 身份 -->
    <div class="card-identity">
      <code class="identity-code">{{ source.source_identity }}</code>
    </div>

    <!-- 标签行 -->
    <div class="card-tags">
      <MiniTag v-for="dt in source.domain_tags" :key="dt" variant="domain">{{ dt }}</MiniTag>
      <MiniTag variant="role">{{ source.source_role }}</MiniTag>
      <MiniTag variant="level">{{ levelLabel }}</MiniTag>
    </div>

    <!-- 告警条 -->
    <div v-if="hasAlert" class="card-alert-strip">
      <span>⚠️</span>
      <span v-if="source.availability_status === 'source_error'">
        连续失败 {{ source.consecutive_failures }} 次，来源异常
      </span>
      <span v-else>待修复：{{ source.verify_error || '需要验证来源身份' }}</span>
    </div>

    <!-- 底部：统计 + 操作 -->
    <div class="card-footer">
      <div class="card-stats">
        <span>最近抓取: {{ formatTime(source.last_fetched_at) }}</span>
        <span class="stat-sep">·</span>
        <span>历史新闻: {{ source.total_news_count }}</span>
        <span class="stat-sep">·</span>
        <span>展示位置: {{ positionSummary }}</span>
      </div>
      <div class="card-actions" @click.stop>
        <BaseButton size="xs" @click="emit('edit', source.id)">编辑</BaseButton>
        <BaseButton v-if="source.type !== 'x_twitter'" size="xs" variant="danger" @click="emit('delete', source.id)">删除</BaseButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lib-card {
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 16px 18px 14px;
  background: var(--card);
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.lib-card:hover {
  border-color: #CBD5E1;
  box-shadow: var(--shadow-soft);
}
.card--paused { opacity: 0.6; background: var(--hover-bg); }
.card--alert { border-left: 3px solid var(--warning); }

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}
.card-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.card-badges {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.card-identity {
  margin-top: -4px;
}
.identity-code {
  font-size: 11px;
  background: var(--hover-bg);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.card-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.card-alert-strip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--warning-light);
  border-radius: 8px;
  font-size: 12px;
  color: #92400e;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 6px;
  border-top: 1px solid var(--border-light);
}
.card-stats {
  font-size: 11px;
  color: var(--text-muted);
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.stat-sep { color: var(--border); }
.card-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
</style>
