<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { SourceWithPositions, DisplayPosition, IdentityChangeRecord } from "@/lib/types";
import { getSource, getIdentityHistory, toggleDisplayPosition, removeDisplayPosition, deleteSource, pauseSource, resumeSource } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge.vue";
import ErrorBar from "@/components/base/ErrorBar.vue";
import LoadingState from "@/components/base/LoadingState.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import { useToast } from "@/composables/useToast";
import { useModal } from "@/composables/useModal";

// v0.5: Source 详情页
// 双栏布局（CSS Grid 1fr 360px）：面包屑、双状态 Badge、展示位置列表、身份变更历史

const route = useRoute();
const router = useRouter();
const toast = useToast();
const modal = useModal();

const sourceId = route.params.id as string;
const source = ref<SourceWithPositions | null>(null);
const loading = ref(false);
const errorText = ref<string | null>(null);

// 身份变更历史
const identityHistory = ref<IdentityChangeRecord[]>([]);
const showHistory = ref(true); // 默认展开

// 可编辑状态（来源身份编辑权限）
const canEditIdentity = computed(() => {
  if (!source.value) return false;
  const s = source.value.availability_status;
  return s === "awaiting_repair" || s === "source_error";
});

const toggling = ref(new Set<string>());

async function loadSource() {
  loading.value = true;
  errorText.value = null;
  try {
    source.value = await getSource(sourceId);
  } catch (e) {
    errorText.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

async function loadHistory() {
  try {
    identityHistory.value = await getIdentityHistory(sourceId);
  } catch { /* 历史加载失败不影响主内容 */ }
}

onMounted(async () => {
  await Promise.all([loadSource(), loadHistory()]);
});

function typeLabel(t: string): string {
  return t === "x_twitter" ? "X/Twitter" : "RSS";
}

function formatTime(iso: string | null): string {
  if (!iso) return "--";
  return new Date(iso).toLocaleString();
}

async function onTogglePosition(pos: DisplayPosition) {
  toggling.value.add(pos.id);
  try {
    await toggleDisplayPosition(pos.id, !pos.enabled);
    await loadSource();
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
    `确定从${targetDesc}移除吗？`,
    { confirmText: "确认移除", danger: true },
  );
  if (!ok) return;
  try {
    await removeDisplayPosition(pos.id);
    toast.success("已移除");
    await loadSource();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e));
  }
}

async function onDeleteSource() {
  if (!source.value) return;
  const ok = await modal.confirm(
    "删除信息源",
    `确定删除 <b>${source.value.display_name}</b>？历史新闻将保留，所有展示位置将被移除。`,
    { confirmText: "确认删除", danger: true },
  );
  if (!ok) return;
  try {
    await deleteSource(source.value.id);
    toast.success("信息源已删除");
    router.push("/admin");
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e));
  }
}

async function onTogglePause() {
  if (!source.value) return;
  const id = source.value.id;
  const wasPaused = source.value.paused;
  try {
    if (wasPaused) {
      await resumeSource(id);
      toast.success("已恢复，历史新闻重新可见");
    } else {
      await pauseSource(id);
      toast.success("已暂停，前端将隐藏其新闻");
    }
    await loadSource();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e));
  }
}

// 启用/暂停/总数统计
const positionStats = computed(() => {
  if (!source.value) return { total: 0, enabled: 0, paused: 0, spaces: 0 };
  const positions = source.value.display_positions || [];
  const enabled = positions.filter(p => p.enabled).length;
  const spaces = new Set(positions.map(p => p.space_id)).size;
  return { total: positions.length, enabled, paused: positions.length - enabled, spaces };
});
</script>

<template>
  <div class="detail-page">
    <!-- 面包屑 -->
    <div class="breadcrumb">
      <RouterLink to="/admin" class="crumb">管理</RouterLink>
      <span class="crumb-sep">/</span>
      <RouterLink to="/admin#space" class="crumb">空间管理</RouterLink>
      <span class="crumb-sep">/</span>
      <span class="crumb current">{{ source?.display_name || '信息源详情' }}</span>
    </div>

    <ErrorBar :message="errorText" />

    <LoadingState v-if="loading" />

    <template v-else-if="source">
      <!-- 双栏布局 -->
      <div class="detail-grid">
        <!-- 左栏：基本信息 -->
        <div class="detail-main">
          <!-- 头部：名称 + 双状态 Badge -->
          <div class="detail-header">
            <h2 class="detail-name">{{ source.display_name }}</h2>
            <div class="detail-status">
              <StatusBadge kind="availability" :status="source.availability_status" size="md" />
              <StatusBadge kind="operational" :status="source.operational_status" size="md" />
            </div>
          </div>

          <!-- 基本信息卡片 -->
          <div class="info-card">
            <h3 class="info-title">基本信息</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">类型</span>
                <span class="info-value">{{ typeLabel(source.type) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">来源身份</span>
                <code class="info-code">{{ source.source_identity }}</code>
                <span v-if="canEditIdentity" class="editable-hint">（可编辑）</span>
              </div>
              <div class="info-item">
                <span class="info-label">领域标签</span>
                <div class="tag-list">
                  <span v-for="t in source.domain_tags" :key="t" class="info-tag">{{ t }}</span>
                </div>
              </div>
              <div class="info-item">
                <span class="info-label">来源角色</span>
                <span class="info-value">{{ source.source_role }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">关注级别</span>
                <span class="info-value">{{ source.attention_level === 'core' ? '核心' : source.attention_level === 'regular' ? '常规' : '观察' }}</span>
              </div>
              <div class="info-item" v-if="source.content_topics.length > 0">
                <span class="info-label">内容主题</span>
                <div class="tag-list">
                  <span v-for="t in source.content_topics" :key="t" class="info-tag topic-tag">{{ t }}</span>
                </div>
              </div>
              <div class="info-item" v-if="source.notes">
                <span class="info-label">备注</span>
                <span class="info-value">{{ source.notes }}</span>
              </div>
            </div>
          </div>

          <!-- 抓取信息卡片 -->
          <div class="info-card">
            <h3 class="info-title">抓取信息</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">最近抓取</span>
                <span class="info-value">{{ formatTime(source.last_fetched_at) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">最近验证</span>
                <span class="info-value">{{ formatTime(source.last_verified_at) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">连续失败次数</span>
                <span class="info-value" :class="{ 'fail-count': source.consecutive_failures >= 3 }">
                  {{ source.consecutive_failures }}
                </span>
              </div>
              <div class="info-item" v-if="source.verify_error">
                <span class="info-label">验证错误</span>
                <span class="info-value err-text">{{ source.verify_error }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">历史新闻</span>
                <span class="info-value">{{ source.total_news_count }} 条</span>
              </div>
            </div>
          </div>

          <!-- 展示位置统计 -->
          <div class="info-card">
            <h3 class="info-title">展示位置</h3>
            <div class="pos-stats">
              <div class="pos-stat">
                <span class="pos-stat-num">{{ positionStats.total }}</span>
                <span class="pos-stat-label">总位置</span>
              </div>
              <div class="pos-stat">
                <span class="pos-stat-num green">{{ positionStats.enabled }}</span>
                <span class="pos-stat-label">启用</span>
              </div>
              <div class="pos-stat">
                <span class="pos-stat-num muted-num">{{ positionStats.paused }}</span>
                <span class="pos-stat-label">暂停</span>
              </div>
              <div class="pos-stat">
                <span class="pos-stat-num">{{ positionStats.spaces }}</span>
                <span class="pos-stat-label">涉及空间</span>
              </div>
            </div>

            <!-- 位置列表 -->
            <div v-if="source.display_positions.length > 0" class="pos-list">
              <div v-for="pos in source.display_positions" :key="pos.id" class="pos-item">
                <div class="pos-info">
                  <span class="pos-space">{{ pos.space_name }}</span>
                  <span v-if="pos.channel_name" class="pos-arrow">→</span>
                  <span v-if="pos.channel_name" class="pos-channel">{{ pos.channel_name }}</span>
                  <span v-else class="pos-root">根节点</span>
                </div>
                <div class="pos-actions">
                  <span class="pos-enabled-tag" :class="pos.enabled ? 'tag-on' : 'tag-off'">
                    {{ pos.enabled ? '启用' : '暂停' }}
                  </span>
                  <BaseButton size="xs" :disabled="toggling.has(pos.id)" @click="onTogglePosition(pos)">
                    {{ pos.enabled ? '暂停' : '恢复' }}
                  </BaseButton>
                  <BaseButton size="xs" variant="danger" @click="onRemovePosition(pos)">移除</BaseButton>
                </div>
              </div>
            </div>
            <div v-else class="no-positions muted">暂无展示位置</div>
          </div>
        </div>

        <!-- 右栏：侧边栏 -->
        <div class="detail-sidebar">
          <!-- 操作 -->
          <div class="sidebar-card">
            <h3 class="sidebar-title">操作</h3>
            <template v-if="source.type === 'x_twitter'">
              <p class="muted x-hint">由 X Developer Portal 同步管理，平台仅可暂停/恢复</p>
              <BaseButton block :variant="source.paused ? 'primary' : 'default'" @click="onTogglePause">
                {{ source.paused ? '恢复' : '暂停' }}
              </BaseButton>
            </template>
            <template v-else>
              <BaseButton block @click="router.push(`/admin`)">编辑信息源</BaseButton>
              <BaseButton block @click="router.push(`/admin`)">添加到空间</BaseButton>
              <BaseButton block variant="danger" @click="onDeleteSource">删除信息源</BaseButton>
            </template>
          </div>

          <!-- 身份变更历史 -->
          <div class="sidebar-card">
            <h3 class="sidebar-title" @click="showHistory = !showHistory" style="cursor:pointer">
              身份变更历史
              <span class="toggle-icon">{{ showHistory ? '▾' : '▸' }}</span>
            </h3>
            <div v-if="showHistory && identityHistory.length > 0" class="history-timeline">
              <div v-for="h in identityHistory" :key="h.id" class="history-node">
                <div class="timeline-dot" />
                <div class="history-content">
                  <div class="history-change">
                    <code class="history-old">{{ h.old_identity }}</code>
                    <span class="history-arrow">→</span>
                    <code class="history-new">{{ h.new_identity }}</code>
                  </div>
                  <span class="history-time muted">{{ formatTime(h.changed_at) }}</span>
                </div>
              </div>
            </div>
            <div v-else-if="showHistory" class="muted" style="font-size:11px">无变更记录</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.x-hint {
  font-size: 11px;
  color: var(--text-muted);
  margin: 0 0 8px 0;
  line-height: 1.4;
}
.detail-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.crumb {
  color: var(--accent);
  text-decoration: none;
  font-weight: 600;
}
.crumb:hover { text-decoration: underline; }
.crumb-sep { color: var(--text-muted); }
.crumb.current { color: var(--text-muted); }

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 20px;
}
@media (max-width: 768px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}

/* 左栏 */
.detail-main {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.detail-name {
  font-size: 20px;
  font-weight: 900;
  margin: 0;
}
.detail-status {
  display: flex;
  gap: 6px;
}
.info-card {
  background: var(--card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: var(--shadow-soft);
}
.info-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  margin: 0 0 12px;
}
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}
.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.info-label {
  font-size: 10px;
  color: var(--text-muted);
  font-weight: 600;
}
.info-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
.info-code {
  font-size: 12px;
  background: #F8FAFB;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  color: var(--text-secondary);
  word-break: break-all;
}
.editable-hint {
  font-size: 10px;
  color: var(--warning);
}
.err-text { color: var(--danger); }
.fail-count { color: var(--danger); font-weight: 900; }
.tag-list { display: flex; gap: 4px; flex-wrap: wrap; }
.info-tag {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  background: var(--accent-light);
  color: var(--accent);
}
.topic-tag {
  background: #F3E8FF;
  color: #8E44AD;
}

/* 展示位置 */
.pos-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}
.pos-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.pos-stat-num {
  font-size: 22px;
  font-weight: 900;
  color: var(--text);
}
.pos-stat-num.green { color: var(--success); }
.pos-stat-num.muted-num { color: var(--text-muted); }
.pos-stat-label {
  font-size: 10px;
  color: var(--text-muted);
  font-weight: 600;
}
.pos-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pos-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background: #F8FAFB;
}
.pos-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.pos-space { font-weight: 700; }
.pos-arrow { color: var(--text-muted); }
.pos-channel { color: var(--accent); font-weight: 600; }
.pos-root { color: var(--text-muted); font-style: italic; }
.pos-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}
.pos-enabled-tag {
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}
.tag-on { background: var(--success-light); color: var(--success); }
.tag-off { background: #F1F5F9; color: var(--text-muted); }
.no-positions { font-size: 12px; text-align: center; padding: 12px 0; }

/* 右栏 */
.detail-sidebar {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.sidebar-card {
  background: var(--card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 16px;
  box-shadow: var(--shadow-soft);
}
.sidebar-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  margin: 0 0 12px;
  user-select: none;
}
.toggle-icon {
  font-size: 14px;
}
.btn-block {
  width: 100%;
  margin-bottom: 8px;
}
.btn-block:last-child { margin-bottom: 0; }
.history-timeline {
  display: flex; flex-direction: column; gap: 0;
  position: relative; padding-left: 20px;
}
.history-timeline::before {
  content: ''; position: absolute; left: 5px; top: 6px; bottom: 6px;
  width: 2px; background: #E2E8F0; border-radius: 2px;
}
.history-node {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 6px 0; position: relative;
}
.timeline-dot {
  position: absolute; left: -17px; top: 10px;
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--accent); border: 2px solid var(--card);
  z-index: 1;
}
.history-content { flex: 1; min-width: 0; }
.history-change {
  display: flex; align-items: center; gap: 4px; font-size: 11px;
}
.history-old { color: var(--text-muted); text-decoration: line-through; font-size: 10px; }
.history-arrow { color: var(--text-muted); font-size: 10px; }
.history-new { color: var(--text); font-weight: 600; font-size: 10px; }
.history-time { font-size: 9px; }
</style>
