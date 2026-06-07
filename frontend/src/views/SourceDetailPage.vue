<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { SourceWithPositions, DisplayPosition, IdentityChangeRecord } from "@/lib/types";
import { getSource, getIdentityHistory, toggleDisplayPosition, removeDisplayPosition, deleteSource, pauseSource, resumeSource, updateSource, listSpaces, listChannels, addDisplayPosition } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge.vue";
import ErrorBar from "@/components/base/ErrorBar.vue";
import LoadingState from "@/components/base/LoadingState.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseModal from "@/components/base/BaseModal.vue";
import { useToast } from "@/composables/useToast";
import { useModal } from "@/composables/useModal";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const modal = useModal();

const sourceId = route.params.id as string;
const source = ref<SourceWithPositions | null>(null);
const loading = ref(false);
const errorText = ref<string | null>(null);

const identityHistory = ref<IdentityChangeRecord[]>([]);
const showHistory = ref(true);

const canEditIdentity = computed(() => {
  if (!source.value) return false;
  const s = source.value.availability_status;
  return s === "awaiting_repair" || s === "source_error";
});

const toggling = ref(new Set<string>());

// 编辑模式
const editing = ref(false);
const editForm = ref({ display_name: "", domain_tags: [] as string[], source_role: "", attention_level: "", notes: "" });
const saving = ref(false);

function startEdit() {
  if (!source.value) return;
  editForm.value = {
    display_name: source.value.display_name,
    domain_tags: Array.isArray(source.value.domain_tags) ? [...source.value.domain_tags] : [],
    source_role: source.value.source_role,
    attention_level: source.value.attention_level,
    notes: source.value.notes || "",
  };
  editing.value = true;
  // 滚动到标签与备注卡片
  setTimeout(() => {
    const el = document.querySelector('.info-card--tags');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 100);
}
function cancelEdit() { editing.value = false; }
async function saveEdit() {
  if (!source.value) return;
  saving.value = true;
  try {
    const payload: Record<string, unknown> = {};
    if (editForm.value.display_name !== source.value.display_name) payload.display_name = editForm.value.display_name;
    if (JSON.stringify(editForm.value.domain_tags) !== JSON.stringify(source.value.domain_tags)) payload.domain_tags = editForm.value.domain_tags;
    if (editForm.value.source_role !== source.value.source_role) payload.source_role = editForm.value.source_role;
    if (editForm.value.attention_level !== source.value.attention_level) payload.attention_level = editForm.value.attention_level;
    const newNotes = editForm.value.notes || null;
    if (newNotes !== (source.value.notes || null)) payload.notes = newNotes;
    if (Object.keys(payload).length === 0) { editing.value = false; return; }
    await updateSource(source.value.id, payload);
    toast.success("已保存");
    editing.value = false;
    await loadSource();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e));
  } finally {
    saving.value = false;
  }
}

const DOMAIN_OPTIONS = ["AI", "财经", "开源", "科技", "其他"];
const ROLE_OPTIONS = [
  { value: "official", label: "官方" },
  { value: "media", label: "媒体" },
  { value: "kol", label: "KOL" },
  { value: "community", label: "社区" },
  { value: "paper_institute", label: "论文机构" },
  { value: "other", label: "其他" },
];
const LEVEL_OPTIONS = [
  { value: "core", label: "核心" },
  { value: "regular", label: "常规" },
  { value: "observe", label: "观察" },
];

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

// 添加到空间弹窗
const showAddToSpace = ref(false);
const addPositions = ref<{ spaceId: string; spaceName: string; channelId: string | null; channelName: string | null; alreadyAdded: boolean }[]>([]);
const addingToSpace = ref(false);
const addingPosKey = ref<string>("");

async function openAddToSpace() {
  try {
    const spaces = await listSpaces();
    const positions: typeof addPositions.value = [];
    const existingKeys = new Set<string>();
    // 收集已存在的位置
    if (source.value) {
      for (const p of source.value.display_positions || []) {
        existingKeys.add(`${p.space_id}:${p.channel_id || "__root__"}`);
      }
    }
    for (const space of spaces) {
      const key = `${space.id}:__root__`;
      positions.push({ spaceId: space.id, spaceName: space.name, channelId: null, channelName: null, alreadyAdded: existingKeys.has(key) });
      try {
        const channels = await listChannels(space.id);
        for (const ch of channels) {
          const chKey = `${space.id}:${ch.id}`;
          positions.push({ spaceId: space.id, spaceName: space.name, channelId: ch.id, channelName: ch.name, alreadyAdded: existingKeys.has(chKey) });
        }
      } catch { /* 无频道 */ }
    }
    addPositions.value = positions;
    showAddToSpace.value = true;
  } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
}

async function doAddToSpace(pos: typeof addPositions.value[0]) {
  if (pos.alreadyAdded || !source.value) return;
  addingToSpace.value = true;
  addingPosKey.value = `${pos.spaceId}:${pos.channelId || "__root__"}`;
  try {
    await addDisplayPosition({ source_id: source.value.id, space_id: pos.spaceId, channel_id: pos.channelId });
    pos.alreadyAdded = true; // 立即标记
    toast.success(`已添加到 ${pos.spaceName}${pos.channelName ? ' · ' + pos.channelName : '（根节点）'}`);
    await loadSource();
  } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
  finally { addingToSpace.value = false; addingPosKey.value = ""; }
}

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
      <RouterLink to="/admin#library" class="crumb">信息源库</RouterLink>
      <span class="crumb-sep">/</span>
      <span class="crumb current">{{ source?.display_name || '信息源详情' }}</span>
    </div>

    <ErrorBar :message="errorText" />

    <LoadingState v-if="loading" />

    <template v-else-if="source">
      <!-- 页头 -->
      <div class="detail-header">
        <h2 class="detail-name">{{ source.display_name }}</h2>
        <div class="detail-badges">
          <span class="type-pill">{{ typeLabel(source.type) }}</span>
          <StatusBadge kind="availability" :status="source.availability_status" size="md" />
          <StatusBadge kind="operational" :status="source.operational_status" size="md" />
        </div>
      </div>

      <!-- 双栏布局 -->
      <div class="detail-grid">
        <!-- 左栏 -->
        <div class="detail-main">
          <!-- 基本资料 -->
          <div class="info-card">
            <h3 class="info-title">基本资料</h3>
            <div class="kv-list">
              <div class="kv-row">
                <span class="kv-label">来源身份</span>
                <code class="kv-code">{{ source.source_identity }}</code>
                <span v-if="canEditIdentity" class="editable-hint">（待修复状态下可编辑）</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">展示名称</span>
                <span class="kv-value">{{ source.display_name }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">类型</span>
                <span class="kv-value">{{ typeLabel(source.type) }}</span>
              </div>
            </div>
          </div>

          <!-- 标签与备注 -->
          <div class="info-card info-card--tags">
            <div class="info-title-row">
              <h3 class="info-title">标签与备注</h3>
              <div v-if="editing" class="edit-actions">
                <BaseButton size="xs" @click="cancelEdit">取消</BaseButton>
                <BaseButton size="xs" variant="primary" :disabled="saving" @click="saveEdit">{{ saving ? '保存中…' : '保存' }}</BaseButton>
              </div>
            </div>
            <div class="kv-list">
              <div class="kv-row">
                <span class="kv-label">领域标签</span>
                <template v-if="editing">
                  <div class="checkbox-group">
                    <label v-for="dt in DOMAIN_OPTIONS" :key="dt" class="checkbox-label">
                      <input type="checkbox" :value="dt" v-model="editForm.domain_tags" />
                      {{ dt }}
                    </label>
                  </div>
                </template>
                <div v-else class="tag-list">
                  <span v-for="t in source.domain_tags" :key="t" class="info-tag">{{ t }}</span>
                  <span v-if="source.domain_tags.length === 0" class="kv-empty">—</span>
                </div>
              </div>
              <div class="kv-row">
                <span class="kv-label">来源角色</span>
                <template v-if="editing">
                  <select class="form-f form-f--sm" v-model="editForm.source_role">
                    <option v-for="r in ROLE_OPTIONS" :key="r.value" :value="r.value">{{ r.label }}</option>
                  </select>
                </template>
                <span v-else class="kv-value">{{ ROLE_OPTIONS.find(r => r.value === source!.source_role)?.label || source!.source_role }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">关注级别</span>
                <template v-if="editing">
                  <select class="form-f form-f--sm" v-model="editForm.attention_level">
                    <option v-for="l in LEVEL_OPTIONS" :key="l.value" :value="l.value">{{ l.label }}</option>
                  </select>
                </template>
                <span v-else class="kv-value">{{ LEVEL_OPTIONS.find(l => l.value === source!.attention_level)?.label || source!.attention_level }}</span>
              </div>
              <div class="kv-row" v-if="editing || source.content_topics.length > 0">
                <span class="kv-label">内容主题</span>
                <div class="tag-list">
                  <span v-for="t in source.content_topics" :key="t" class="info-tag topic-tag">{{ t }}</span>
                </div>
              </div>
              <div class="kv-row" v-if="editing || source.notes">
                <span class="kv-label">备注</span>
                <template v-if="editing">
                  <textarea class="form-f" v-model="editForm.notes" rows="2" placeholder="备注信息…" />
                </template>
                <span v-else class="kv-value">{{ source.notes }}</span>
              </div>
            </div>
          </div>

          <!-- 抓取状态 -->
          <div class="info-card">
            <h3 class="info-title">抓取状态</h3>
            <div class="kv-list">
              <div class="kv-row">
                <span class="kv-label">最近抓取</span>
                <span class="kv-value">{{ formatTime(source.last_fetched_at) }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">本次抓取条数</span>
                <span class="kv-value">{{ source.last_fetch_count ?? 0 }} 条</span>
              </div>
              <div class="kv-row" v-if="source.next_fetch_at">
                <span class="kv-label">下次抓取</span>
                <span class="kv-value">{{ formatTime(source.next_fetch_at) }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">连续失败</span>
                <span class="kv-value" :class="{ 'fail-count': source.consecutive_failures >= 3 }">{{ source.consecutive_failures }} 次</span>
              </div>
              <div class="kv-row" v-if="source.last_error">
                <span class="kv-label">最近错误</span>
                <span class="kv-value err-text">{{ source.last_error }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">已生成新闻</span>
                <span class="kv-value">{{ source.total_news_count }} 条</span>
              </div>
              <div class="kv-row" v-if="source.last_verified_at">
                <span class="kv-label">最近验证</span>
                <span class="kv-value">{{ formatTime(source.last_verified_at) }}</span>
              </div>
            </div>
          </div>

          <!-- 身份变更历史 -->
          <div class="info-card">
            <h3 class="info-title" @click="showHistory = !showHistory" style="cursor:pointer; user-select:none;">
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
            <div v-else-if="showHistory" class="kv-empty">无变更记录</div>
          </div>
        </div>

        <!-- 右栏 -->
        <div class="detail-sidebar">
          <!-- 使用概况 -->
          <div class="sidebar-card">
            <h3 class="sidebar-title">使用概况</h3>
            <div class="pos-stats">
              <div class="pos-stat">
                <span class="pos-stat-num">{{ positionStats.total }}</span>
                <span class="pos-stat-label">展示位置</span>
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
                <span class="pos-stat-label">空间</span>
              </div>
            </div>
          </div>

          <!-- 展示位置 -->
          <div class="sidebar-card">
            <h3 class="sidebar-title">展示位置</h3>
            <div v-if="source.paused" class="global-pause-note">该源已全局暂停，所有展示位置暂不生效</div>
            <div v-if="source.display_positions.length > 0" class="pos-list">
              <div v-for="pos in source.display_positions" :key="pos.id" class="pos-item" :class="{ 'pos--paused': source.paused }">
                <div class="pos-info">
                  <span class="pos-space">{{ pos.space_name }}</span>
                  <span v-if="pos.channel_name" class="pos-arrow">→</span>
                  <span v-if="pos.channel_name" class="pos-channel">{{ pos.channel_name }}</span>
                  <span v-else class="pos-root">根节点</span>
                </div>
                <div class="pos-actions">
                  <span class="pos-enabled-tag" :class="source.paused ? 'tag-off' : (pos.enabled ? 'tag-on' : 'tag-off')">
                    {{ source.paused ? '已暂停' : (pos.enabled ? '启用' : '暂停') }}
                  </span>
                  <BaseButton size="xs" :disabled="source.paused || toggling.has(pos.id)" @click="onTogglePosition(pos)" :title="pos.enabled ? '仅在此位置暂停展示，其他位置不受影响' : '恢复在此位置的展示'">
                    {{ pos.enabled ? '暂停' : '恢复' }}
                  </BaseButton>
                  <BaseButton size="xs" variant="danger" :disabled="source.paused" @click="onRemovePosition(pos)" title="从此位置移除展示，Source 和历史新闻保留">移除</BaseButton>
                </div>
              </div>
            </div>
            <div v-else class="no-positions muted">暂无展示位置</div>
          </div>

          <!-- 操作 -->
          <div class="sidebar-card">
            <h3 class="sidebar-title">操作</h3>
            <div class="sidebar-btn-group">
              <BaseButton block @click="startEdit">编辑信息源</BaseButton>
              <BaseButton block @click="openAddToSpace">添加到空间</BaseButton>
              <BaseButton block :variant="source.paused ? 'primary' : 'default'" @click="onTogglePause" :title="source.paused ? '恢复后 Worker 将继续从该源抓取数据' : '暂停后 Worker 不再从该源抓取，已抓新闻保留'">
                {{ source.paused ? '▶ 恢复抓取' : '⏸ 暂停抓取' }}
              </BaseButton>
            </div>
            <div v-if="source.type !== 'x_twitter'" class="sidebar-btn-danger">
              <BaseButton block variant="danger" @click="onDeleteSource">删除信息源</BaseButton>
            </div>
          </div>

          <!-- 添加到空间弹窗 -->
          <BaseModal v-if="showAddToSpace" title="添加到空间" @close="showAddToSpace = false">
            <div class="add-space-list">
              <div v-for="pos in addPositions" :key="`${pos.spaceId}:${pos.channelId || '__root__'}`" class="add-space-row" :class="{ 'is-added': pos.alreadyAdded }">
                <div class="add-space-info">
                  <span class="add-space-name">{{ pos.spaceName }}</span>
                  <span class="add-space-arrow">→</span>
                  <span v-if="pos.channelName" class="add-space-chan">{{ pos.channelName }}</span>
                  <span v-else class="add-space-root">根节点</span>
                </div>
                <BaseButton v-if="pos.alreadyAdded" size="xs" disabled>已添加</BaseButton>
                <BaseButton v-else size="xs" variant="primary" :disabled="addingToSpace" @click="doAddToSpace(pos)">
                  {{ addingToSpace && addingPosKey === `${pos.spaceId}:${pos.channelId || '__root__'}` ? '…' : '＋ 添加' }}
                </BaseButton>
              </div>
            </div>
            <template #footer>
              <BaseButton @click="showAddToSpace = false">关闭</BaseButton>
            </template>
          </BaseModal>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.detail-page { display: flex; flex-direction: column; gap: 14px; }

/* 面包屑 */
.breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.crumb { color: var(--accent); text-decoration: none; font-weight: 600; }
.crumb:hover { text-decoration: underline; }
.crumb-sep { color: var(--text-muted); }
.crumb.current { color: var(--text-muted); }

/* 页头 */
.detail-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
.detail-name { font-size: 20px; font-weight: 900; margin: 0; }
.detail-badges { display: flex; gap: 6px; align-items: center; }
.type-pill {
  font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 20px;
  background: #F1F5F9; color: var(--text-secondary);
}

/* 双栏 */
.detail-grid { display: grid; grid-template-columns: 1fr 360px; gap: 20px; }
@media (max-width: 768px) { .detail-grid { grid-template-columns: 1fr; } }

/* 左栏 */
.detail-main { display: flex; flex-direction: column; gap: 14px; }

/* 信息卡片 */
.info-card {
  background: var(--card); border: 1px solid var(--border-light);
  border-radius: 12px; padding: 16px 20px; box-shadow: var(--shadow-soft);
}
.info-title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.info-title {
  font-size: 12px; font-weight: 700; color: var(--text-muted);
  text-transform: uppercase; margin: 0;
}
.edit-actions { display: flex; gap: 6px; }

/* KV 列表 */
.kv-list { display: flex; flex-direction: column; gap: 10px; }
.kv-row { display: flex; align-items: center; gap: 12px; }
.kv-label { font-size: 12px; color: var(--text-muted); font-weight: 600; min-width: 64px; flex-shrink: 0; }
.kv-value { font-size: 13px; font-weight: 600; color: var(--text); }
.kv-code {
  font-size: 12px; background: #F8FAFB; padding: 2px 6px; border-radius: 4px;
  font-family: monospace; color: var(--text-secondary); word-break: break-all;
}
.kv-empty { font-size: 12px; color: var(--text-muted); }
.editable-hint { font-size: 10px; color: var(--warning); }
.err-text { color: var(--danger); }
.fail-count { color: var(--danger); font-weight: 900; }

/* 标签 */
.tag-list { display: flex; gap: 4px; flex-wrap: wrap; }
.info-tag {
  padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600;
  background: var(--accent-light); color: var(--accent);
}
.topic-tag { background: #F3E8FF; color: #8E44AD; }

/* 编辑表单 */
.checkbox-group { display: flex; gap: 8px; flex-wrap: wrap; }
.checkbox-label { font-size: 12px; display: flex; align-items: center; gap: 3px; cursor: pointer; }
.form-f {
  width: 100%; padding: 5px 10px; border: 1px solid var(--border);
  border-radius: 6px; font-size: 12px; font-family: inherit;
  background: var(--card); color: var(--text);
}
.form-f:focus { outline: none; border-color: var(--accent); }
.form-f--sm { width: auto; min-width: 100px; }
select.form-f { padding: 5px 8px; }
textarea.form-f { resize: vertical; }

/* 使用概况 */
.pos-stats { display: flex; gap: 16px; }
.pos-stat { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.pos-stat-num { font-size: 22px; font-weight: 900; color: var(--text); }
.pos-stat-num.green { color: var(--success); }
.pos-stat-num.muted-num { color: var(--text-muted); }
.pos-stat-label { font-size: 10px; color: var(--text-muted); font-weight: 600; }

/* 展示位置列表 */
.pos-list { display: flex; flex-direction: column; gap: 6px; }
.pos-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; border: 1px solid var(--border-light);
  border-radius: 8px; background: #F8FAFB;
}
.pos-info { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.pos-space { font-weight: 700; }
.pos-arrow { color: var(--text-muted); }
.pos-channel { color: var(--accent); font-weight: 600; }
.pos-root { color: var(--text-muted); font-style: italic; }
.pos-actions { display: flex; gap: 6px; align-items: center; }
.pos-enabled-tag { padding: 1px 6px; border-radius: 10px; font-size: 10px; font-weight: 700; }
.tag-on { background: var(--success-light); color: var(--success); }
.tag-off { background: #F1F5F9; color: var(--text-muted); }
.no-positions { font-size: 12px; text-align: center; padding: 12px 0; }
.global-pause-note {
  font-size: 11px; color: #92400e; background: var(--warning-light);
  padding: 6px 10px; border-radius: 6px; margin-bottom: 10px;
}
.pos--paused { opacity: 0.55; }

/* 右栏 */
.detail-sidebar { display: flex; flex-direction: column; gap: 14px; }
.sidebar-card {
  background: var(--card); border: 1px solid var(--border-light);
  border-radius: 12px; padding: 16px; box-shadow: var(--shadow-soft);
}
.sidebar-title {
  font-size: 12px; font-weight: 700; color: var(--text-muted);
  text-transform: uppercase; margin: 0 0 12px; user-select: none;
}

.x-hint { font-size: 11px; color: var(--text-muted); margin: 0 0 8px 0; line-height: 1.4; }
.sidebar-btn-group { display: flex; flex-direction: column; gap: 6px; }
.sidebar-btn-danger { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border-light); }

/* 添加到空间列表 */
.add-space-list { display: flex; flex-direction: column; gap: 6px; max-height: 360px; overflow-y: auto; }
.add-space-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; border: 1px solid var(--border-light); border-radius: 8px;
  gap: 10px; transition: 0.15s;
}
.add-space-row:hover:not(.is-added) { border-color: var(--accent); background: var(--accent-light); }
.add-space-row.is-added { opacity: 0.45; background: var(--hover-bg); }
.add-space-info { display: flex; align-items: center; gap: 6px; font-size: 13px; }
.add-space-name { font-weight: 700; }
.add-space-arrow { color: var(--text-muted); }
.add-space-chan { color: var(--accent); font-weight: 600; }
.add-space-root { color: var(--text-muted); font-style: italic; }
.toggle-icon { font-size: 14px; }

/* 身份变更历史时间轴 */
.history-timeline {
  display: flex; flex-direction: column; gap: 0;
  position: relative; padding-left: 20px; margin-top: 4px;
}
.history-timeline::before {
  content: ''; position: absolute; left: 5px; top: 6px; bottom: 6px;
  width: 2px; background: #E2E8F0; border-radius: 2px;
}
.history-node { display: flex; align-items: flex-start; gap: 10px; padding: 6px 0; position: relative; }
.timeline-dot {
  position: absolute; left: -17px; top: 10px;
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--accent); border: 2px solid var(--card); z-index: 1;
}
.history-content { flex: 1; min-width: 0; }
.history-change { display: flex; align-items: center; gap: 4px; font-size: 11px; }
.history-old { color: var(--text-muted); text-decoration: line-through; font-size: 10px; }
.history-arrow { color: var(--text-muted); font-size: 10px; }
.history-new { color: var(--text); font-weight: 600; font-size: 10px; }
.history-time { font-size: 9px; }
</style>
