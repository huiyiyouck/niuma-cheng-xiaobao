<script setup lang="ts">
import { computed, ref } from "vue";
import type { SourceWithPositions, DisplayPosition } from "@/lib/types";
import { toggleDisplayPosition } from "@/lib/api";
import { useToast } from "@/composables/useToast";
import { useModal } from "@/composables/useModal";
import StatusBadge from "@/components/StatusBadge.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import TypeBadge from "@/components/base/TypeBadge.vue";
import MiniTag from "@/components/base/MiniTag.vue";
import { useRouter } from "vue-router";

import type { Channel } from "@/lib/types";
import { moveDisplayPosition } from "@/lib/api";

const props = defineProps<{
  source: SourceWithPositions;
  currentSpaceId: string;
  currentChannelId: string | null;
  channels?: Channel[];
}>();

const emit = defineEmits<{
  refresh: [];
  remove: [positionId: string];
}>();

const toast = useToast();
const modal = useModal();
const router = useRouter();

const toggling = ref(new Set<string>());
const moving = ref(new Set<string>());

function onMoveSelect(posId: string, e: Event) {
  const val = (e.target as HTMLSelectElement).value;
  movePosition(posId, val === "__root__" ? null : val || null);
}

async function movePosition(posId: string, newChannelId: string | null) {
  moving.value.add(posId);
  try {
    await moveDisplayPosition(posId, newChannelId);
    emit("refresh");
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e));
  } finally {
    moving.value.delete(posId);
  }
}

const relevantPositions = computed(() => {
  return (props.source.display_positions || []).filter(p => {
    if (p.space_id !== props.currentSpaceId) return false;
    // 指定频道 → 只显示该频道的；全部 → 显示所有（根+各频道）
    if (props.currentChannelId) return p.channel_id === props.currentChannelId;
    return true;
  });
});

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

const isRemoved = computed(() => props.source.availability_status === "source_removed");

async function onTogglePosition(pos: DisplayPosition) {
  toggling.value.add(pos.id);
  try {
    await toggleDisplayPosition(pos.id, !pos.enabled);
    emit("refresh");
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e));
  } finally {
    toggling.value.delete(pos.id);
  }
}

async function onRemovePosition(pos: DisplayPosition) {
  const targetDesc = pos.channel_name ? `频道「${pos.channel_name}」` : "空间根节点";
  const ok = await modal.confirm(
    "移除展示位置",
    `确定从${targetDesc}移除「${props.source.display_name}」吗？Source 本身和历史新闻将保留。`,
    { confirmText: "确认移除", danger: true },
  );
  if (!ok) return;
  emit("remove", pos.id);
}

function viewDetail() {
  router.push(`/sources/${props.source.id}`);
}

const domainLabel = computed(() => props.source.domain_tags?.[0] || "");
const levelLabel = computed(() =>
  props.source.attention_level === "core" ? "核心"
    : props.source.attention_level === "regular" ? "常规" : "观察",
);
</script>

<template>
  <div class="source-card" :class="{ 'card--removed': isRemoved }">
    <!-- 第 1 行：名称 + 类型 + 双状态 Badge -->
    <div class="card-row1">
      <span class="card-name" :class="{ 'name--removed': isRemoved }" @click="viewDetail">
        {{ source.display_name }}
        <span v-if="isRemoved" class="removed-tag">来源已移除</span>
      </span>
      <TypeBadge :type="source.type" />
      <StatusBadge kind="availability" :status="source.availability_status" size="sm" />
      <StatusBadge kind="operational" :status="source.operational_status" size="sm" />
    </div>

    <!-- 第 2 行：标签 + 抓取信息 -->
    <div class="card-row2">
      <MiniTag v-if="domainLabel" variant="domain">{{ domainLabel }}</MiniTag>
      <MiniTag variant="role">{{ source.source_role }}</MiniTag>
      <MiniTag variant="level">{{ levelLabel }}</MiniTag>
      <span class="sep">·</span>
      <span>身份: <code class="identity-code">{{ source.source_identity }}</code></span>
      <span class="sep">·</span>
      <span>最近抓取: {{ formatTime(source.last_fetched_at) }}</span>
      <span class="sep">·</span>
      <span>历史新闻: {{ source.total_news_count }}</span>
    </div>

    <!-- 第 3 行：告警内联条 -->
    <div v-if="source.availability_status === 'source_error' || source.availability_status === 'awaiting_repair'" class="card-alert">
      <span>⚠️</span>
      <span v-if="source.availability_status === 'source_error'">
        连续失败 {{ source.consecutive_failures }} 次，来源异常
      </span>
      <span v-else>
        待修复：{{ source.verify_error || '需要验证来源身份' }}
      </span>
    </div>

    <!-- 第 4 行：展示位置 + 操作 -->
    <div class="card-actions-row" v-if="!isRemoved">
      <div class="positions-summary">
        <span v-if="relevantPositions.length === 0" class="muted">当前空间无展示位置</span>
        <span v-else class="pos-summary-text">
          <template v-if="currentChannelId === null">
            <span v-if="relevantPositions[0].channel_name" class="pos-loc">{{ relevantPositions[0].channel_name }}</span>
            <span v-else class="pos-loc root">根节点</span>
          </template>
          <span v-if="!relevantPositions[0].enabled" class="pos-paused">已暂停</span>
        </span>
      </div>
      <div class="card-actions">
        <BaseButton size="xs" @click="viewDetail">详情</BaseButton>
        <template v-if="relevantPositions.length === 1">
          <BaseButton
            size="xs"
            :variant="relevantPositions[0].enabled ? 'warn' : 'success'"
            :disabled="toggling.has(relevantPositions[0].id)"
            @click="onTogglePosition(relevantPositions[0])"
          >{{ relevantPositions[0].enabled ? '暂停' : '恢复' }}</BaseButton>
          <div v-if="channels && channels.length > 0 && currentChannelId === null" class="move-wrap">
            <select class="move-select" :value="relevantPositions[0].channel_id || '__root__'" :disabled="moving.has(relevantPositions[0].id)" @change="onMoveSelect(relevantPositions[0].id, $event)">
              <option value="__root__">根节点</option>
              <option v-for="ch in channels" :key="ch.id" :value="ch.id">{{ ch.name }}</option>
            </select>
          </div>
          <BaseButton size="xs" variant="danger" @click="onRemovePosition(relevantPositions[0])">移除</BaseButton>
        </template>
      </div>
    </div>

    <!-- 多位置展开 -->
    <div v-if="!isRemoved && relevantPositions.length > 1" class="positions-info">
      <div v-for="pos in relevantPositions" :key="pos.id" class="position-item">
        <span class="pos-target">
          {{ pos.channel_name ? `频道「${pos.channel_name}」` : '空间根节点' }}
        </span>
        <BaseButton
          size="xs"
          :variant="pos.enabled ? 'warn' : 'success'"
          :disabled="toggling.has(pos.id)"
          @click="onTogglePosition(pos)"
        >{{ pos.enabled ? '暂停' : '恢复' }}</BaseButton>
        <BaseButton size="xs" variant="danger" @click="onRemovePosition(pos)">移除</BaseButton>
        <select v-if="channels && channels.length > 0" class="move-select" :disabled="moving.has(pos.id)" @change="movePosition(pos.id, ($event.target as HTMLSelectElement).value || null)">
          <option value="">移动…</option>
          <option :value="null">根节点</option>
          <option v-for="ch in channels" :key="ch.id" :value="ch.id">{{ ch.name }}</option>
        </select>
      </div>
    </div>
  </div>
</template>

<style scoped>
.source-card {
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 14px 18px;
  background: var(--card);
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.source-card:hover {
  border-color: #CBD5E1;
  box-shadow: var(--shadow-soft);
}
.card--removed {
  opacity: 0.65;
  background: var(--hover-bg);
}
.card-row1 {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.card-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.card-name:hover { color: var(--accent); }
.name--removed { color: var(--text-muted); cursor: default; }
.name--removed:hover { color: var(--text-muted); }
.removed-tag {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted);
  background: #F1F5F9;
  padding: 1px 6px;
  border-radius: 10px;
}
.card-row2 {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
  font-size: 11px;
  color: var(--text-secondary);
}
.sep { color: var(--border); }
.identity-code {
  font-size: 10px;
  background: var(--hover-bg);
  padding: 1px 4px;
  border-radius: 4px;
  color: var(--text-muted);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
  vertical-align: middle;
  font-family: var(--font-mono);
}
.card-alert {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--warning-light);
  border-radius: 8px;
  font-size: 11px;
  color: #92400e;
}
.card-actions-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 2px;
}
.positions-summary { font-size: 11px; color: var(--text-secondary); }
.pos-summary-text { font-weight: 600; }
.pos-on { color: var(--success); }
.pos-mixed { color: var(--warning); }
.card-row3 {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.positions-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.position-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}
.pos-target {
  color: var(--text-secondary);
  font-weight: 600;
}
.card-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  align-items: center;
}
.pos-loc {
  font-size: 11px; color: var(--text-secondary); font-weight: 600;
}
.pos-loc.root { color: var(--text-muted); }
.pos-paused { font-size: 10px; color: var(--warning); margin-left: 6px; }
.move-wrap { position: relative; }
.move-select {
  font-size: 11px; padding: 4px 8px; border-radius: 6px;
  border: 1px solid var(--border); background: var(--card);
  color: var(--accent); cursor: pointer; font-weight: 600;
  font-family: inherit; max-width: 110px;
}
.move-select:hover { border-color: var(--accent); }
</style>
