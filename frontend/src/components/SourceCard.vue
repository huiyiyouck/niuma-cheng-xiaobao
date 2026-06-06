<script setup lang="ts">
import { computed, ref } from "vue";
import type { SourceWithPositions, DisplayPosition } from "@/lib/types";
import { toggleDisplayPosition } from "@/lib/api";
import { useToast } from "@/composables/useToast";
import { useModal } from "@/composables/useModal";
import StatusBadge from "@/components/StatusBadge.vue";
import { useRouter } from "vue-router";

// v0.5: 空间管理 Tab 内的 SourceCard（替代旧版 SourceCard）
// 展示双维度状态 + 标签 + 抓取信息 + 告警内联条 + 操作按钮
const props = defineProps<{
  source: SourceWithPositions;
  currentSpaceId: string;
  currentChannelId: string | null;
}>();

const emit = defineEmits<{
  refresh: [];
  remove: [positionId: string];
}>();

const toast = useToast();
const modal = useModal();
const router = useRouter();

const toggling = ref(new Set<string>());

// 当前空间/频道下的展示位置
const relevantPositions = computed(() => {
  return (props.source.display_positions || []).filter(p => {
    if (p.space_id !== props.currentSpaceId) return false;
    if (props.currentChannelId) return p.channel_id === props.currentChannelId;
    return p.channel_id === null;
  });
});

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

// 来源已移除时不可操作
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

// 领域标签
const domainLabel = computed(() => props.source.domain_tags?.[0] || "");
</script>

<template>
  <div class="source-card" :class="{ 'card--removed': isRemoved }">
    <!-- 第 1 行：名称 + 类型 + 双状态 Badge -->
    <div class="card-row1">
      <span class="card-name" :class="{ 'name--removed': isRemoved }" @click="viewDetail">
        {{ source.display_name }}
        <span v-if="isRemoved" class="removed-tag">来源已移除</span>
      </span>
      <span class="type-badge" :class="source.type === 'x_twitter' ? 'type-twitter' : 'type-rss'">
        {{ typeLabel(source.type) }}
      </span>
      <StatusBadge kind="availability" :status="source.availability_status" size="sm" />
      <StatusBadge kind="operational" :status="source.operational_status" size="sm" />
    </div>

    <!-- 第 2 行：标签 + 抓取信息 -->
    <div class="card-row2">
      <span v-if="domainLabel" class="mini-tag">{{ domainLabel }}</span>
      <span class="mini-tag role-tag">{{ source.source_role }}</span>
      <span class="mini-tag level-tag">{{ source.attention_level === 'core' ? '核心' : source.attention_level === 'regular' ? '常规' : '观察' }}</span>
      <span class="sep">·</span>
      <span>身份: <code class="identity-code">{{ source.source_identity }}</code></span>
      <span class="sep">·</span>
      <span>最近抓取: {{ formatTime(source.last_fetched_at) }}</span>
      <span class="sep">·</span>
      <span>历史新闻: {{ source.total_news_count }}</span>
    </div>

    <!-- 第 3 行：告警内联条 -->
    <div v-if="source.availability_status === 'source_error' || source.availability_status === 'awaiting_repair'" class="card-alert">
      <span class="alert-icon">&#9888;</span>
      <span v-if="source.availability_status === 'source_error'">
        连续失败 {{ source.consecutive_failures }} 次，来源异常
      </span>
      <span v-else>
        待修复：{{ source.verify_error || '需要验证来源身份' }}
      </span>
    </div>

    <!-- 第 4 行：展示位置（当前空间/频道内） + 操作 -->
    <div class="card-row3" v-if="!isRemoved">
      <div class="positions-info">
        <span v-if="relevantPositions.length === 0" class="muted">当前无展示位置</span>
        <div v-for="pos in relevantPositions" :key="pos.id" class="position-item">
          <span class="pos-target">
            {{ pos.channel_name ? `频道「${pos.channel_name}」` : '空间根节点' }}
          </span>
          <button
            class="btn-xs"
            :class="{ 'btn--pause': pos.enabled, 'btn--resume': !pos.enabled }"
            :disabled="toggling.has(pos.id)"
            @click="onTogglePosition(pos)"
          >
            {{ pos.enabled ? '暂停' : '恢复' }}
          </button>
          <button class="btn-xs btn-danger" @click="onRemovePosition(pos)">移除</button>
        </div>
      </div>
      <div class="card-actions">
        <button class="btn-xs" @click="viewDetail">详情</button>
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
  background: #F8FAFB;
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
.type-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 700;
}
.type-twitter { background: var(--accent-light); color: var(--accent); }
.type-rss { background: var(--warning-light); color: var(--warning); }
.card-row2 {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
  font-size: 11px;
  color: var(--text-secondary);
}
.mini-tag {
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
  background: #F1F5F9;
  color: var(--text-secondary);
}
.role-tag { background: #E8F8F0; color: var(--success); }
.level-tag { background: var(--warning-light); color: var(--warning); }
.sep { color: var(--border); }
.identity-code {
  font-size: 10px;
  background: #F8FAFB;
  padding: 1px 4px;
  border-radius: 4px;
  color: var(--text-muted);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
  vertical-align: middle;
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
}
.btn-xs {
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 600;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text-secondary);
  cursor: pointer;
}
.btn-xs:hover { background: #F4F5F7; }
.btn-xs:disabled { opacity: 0.4; cursor: not-allowed; }
.btn--pause { color: var(--warning); }
.btn--resume { color: var(--success); }
.btn-danger { color: var(--danger); }
.btn-danger:hover { background: var(--danger-light); }
</style>
