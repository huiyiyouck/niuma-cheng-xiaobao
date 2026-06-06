<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import type { Space, Channel, SourceWithPositions, UUID } from "@/lib/types";
import { listSpaces, listChannels, listSpaceSources, removeDisplayPosition, addDisplayPosition } from "@/lib/api";
import SpacePills from "@/components/SpacePills.vue";
import SourceCard from "@/components/SourceCard.vue";
import EmptyState from "@/components/EmptyState.vue";
import { useToast } from "@/composables/useToast";
import { useModal } from "@/composables/useModal";
import { createChannel, updateChannel, deleteChannel, getChannelDeletePreview } from "@/lib/api";

const toast = useToast();
const modal = useModal();

const spaces = ref<Space[]>([]);
const channels = ref<Channel[]>([]);
const sources = ref<SourceWithPositions[]>([]);
const loading = ref(false);
const errorText = ref<string | null>(null);
const selectedSpaceId = ref<UUID | null>(null);
const selectedChannelId = ref<UUID | null>(null);

// 频道管理状态
const creatingChannel = ref(false);
const newChannelName = ref("");
const editingChannelId = ref<string | null>(null);
const editChannelName = ref("");

onMounted(async () => { await refreshSpaces(); });

async function refreshSpaces() {
  try {
    spaces.value = await listSpaces();
    if (!selectedSpaceId.value && spaces.value.length > 0) selectedSpaceId.value = spaces.value[0].id;
  } catch (e) { errorText.value = e instanceof Error ? e.message : String(e); }
}
async function refreshChannels() {
  if (!selectedSpaceId.value) { channels.value = []; return; }
  try { channels.value = await listChannels(selectedSpaceId.value); } catch { channels.value = []; }
}
async function refreshSources() {
  if (!selectedSpaceId.value) { sources.value = []; return; }
  loading.value = true; errorText.value = null;
  try { sources.value = await listSpaceSources(selectedSpaceId.value, selectedChannelId.value); }
  catch (e) { errorText.value = e instanceof Error ? e.message : String(e); }
  finally { loading.value = false; }
}

async function onSpaceSelect(id: string) { selectedSpaceId.value = id; selectedChannelId.value = null; }
async function onChannelSelect(id: string | null) { selectedChannelId.value = id; }

async function doCreateChannel() {
  const name = newChannelName.value.trim();
  if (!name || !selectedSpaceId.value) return;
  try { await createChannel(selectedSpaceId.value, { name }); newChannelName.value = ""; creatingChannel.value = false; toast.success("频道已创建"); refreshChannels(); }
  catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
}
async function doRenameChannel() {
  if (!editingChannelId.value || !selectedSpaceId.value) return;
  try { await updateChannel(selectedSpaceId.value, editingChannelId.value, { name: editChannelName.value.trim() }); editingChannelId.value = null; toast.success("已重命名"); refreshChannels(); }
  catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
}
async function doDeleteChannel(ch: Channel) {
  try {
    let preview = { positions_count: 0, conflict_count: 0 };
    try { preview = await getChannelDeletePreview(selectedSpaceId.value!, ch.id); } catch {}
    const ok = await modal.confirm("删除频道", `将移除 <b>${preview.positions_count}</b> 个展示位置。Source 和新闻保留。`, { confirmText: "确认删除", danger: true });
    if (!ok) return;
    await deleteChannel(selectedSpaceId.value!, ch.id, "remove_all");
    toast.success("已删除"); refreshChannels(); refreshSources();
  } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
}

async function onRemovePosition(positionId: string) {
  try { await removeDisplayPosition(positionId); toast.success("已移除"); refreshSources(); }
  catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
}

watch(selectedSpaceId, () => { refreshChannels(); refreshSources(); });
watch(selectedChannelId, () => refreshSources());
</script>

<template>
  <div class="space-mgmt">
    <div v-if="errorText" class="error-bar">&#9888; {{ errorText }}</div>
    <SpacePills :spaces="spaces" :selectedId="selectedSpaceId" mode="full" @select="onSpaceSelect" @changed="refreshSpaces()" />

    <div v-if="!selectedSpaceId" class="empty-wrap">
      <EmptyState icon="📁" title="暂无空间" description="点击上方「+ 新建空间」创建第一个空间" />
    </div>

    <div v-else class="split-layout">
      <!-- 左侧频道栏 -->
      <div class="split-left">
        <div class="split-left-header">
          <span class="side-label">频道</span>
        </div>
        <div class="channel-list">
          <div class="channel-item all" :class="{ selected: selectedChannelId === null }" @click="onChannelSelect(null)">
            <span class="ch-name">全部</span>
            <span class="ch-badge">聚合</span>
          </div>
          <div v-for="ch in channels" :key="ch.id" class="channel-item" :class="{ selected: selectedChannelId === ch.id }" @click="onChannelSelect(ch.id)">
            <template v-if="editingChannelId === ch.id">
              <input class="ch-edit-input" v-model="editChannelName" @keydown.enter="doRenameChannel" @keydown.escape="editingChannelId = null" @click.stop />
            </template>
            <template v-else>
              <span class="ch-name">{{ ch.name }}</span>
              <span class="ch-count">{{ ch.source_count ?? 0 }}</span>
            </template>
            <div class="ch-actions">
              <button class="act-icon" title="编辑" @click.stop="editingChannelId = ch.id; editChannelName = ch.name">✎</button>
              <button class="act-icon danger" title="删除" @click.stop="doDeleteChannel(ch)">✕</button>
            </div>
          </div>
        </div>
        <!-- 新建频道按钮 -->
        <div v-if="!creatingChannel" class="channel-add-btn" @click="creatingChannel = true">＋ 新建频道</div>
        <div v-else class="channel-add-form">
          <input class="ch-edit-input" v-model="newChannelName" placeholder="频道名称" @keydown.enter="doCreateChannel" @keydown.escape="creatingChannel = false" />
          <button class="act-icon" @click="doCreateChannel">✓</button>
          <button class="act-icon danger" @click="creatingChannel = false">✕</button>
        </div>
      </div>

      <!-- 右侧内容区 -->
      <div class="split-right">
        <div class="split-right-header">
          <div>
            <span class="ctx-label">当前：</span>
            <span class="ctx-value">{{ spaces.find(s => s.id === selectedSpaceId)?.name || '' }}</span>
            <span class="ctx-sep">·</span>
            <span class="ctx-value">{{ selectedChannelId === null ? '全部' : (channels.find(c => c.id === selectedChannelId)?.name || '') }}</span>
            <span class="ctx-count">{{ sources.length }} 个信息源</span>
          </div>
        </div>
        <div v-if="loading" class="loading-state">加载中…</div>
        <div v-else-if="sources.length === 0" class="empty-wrap">
          <EmptyState icon="📡" title="当前位置暂无信息源" description="点击「添加信息源」开始" />
        </div>
        <div v-else class="source-list">
          <SourceCard v-for="s in sources" :key="s.id" :source="s" :currentSpaceId="selectedSpaceId!" :currentChannelId="selectedChannelId" @refresh="refreshSources()" @remove="onRemovePosition" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.space-mgmt { display: flex; flex-direction: column; gap: 12px; }
.empty-wrap { margin: 12px 0; }
.error-bar { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 8px; background: var(--danger-light); border: 1px solid rgba(231,76,60,0.2); color: #991b1b; font-size: 12px; }

/* 左右分栏 */
.split-layout { display: grid; grid-template-columns: 240px 1fr; gap: 20px; }
@media (max-width: 768px) { .split-layout { grid-template-columns: 1fr; } }

/* 左侧频道栏 */
.split-left { background: var(--card); border: 1px solid var(--border-light); border-radius: 14px; overflow: hidden; align-self: start; }
.split-left-header { display: flex; align-items: center; padding: 14px 18px 10px; }
.side-label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; }

.channel-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 18px;
  cursor: pointer; transition: background 0.12s; border-bottom: 1px solid var(--border-light);
}
.channel-item:last-child { border-bottom: none; }
.channel-item:hover { background: #F8FAFB; }
.channel-item.selected { background: var(--accent-light); border-left: 3px solid var(--accent); padding-left: 15px; }
.channel-item.all { font-weight: 600; }
.ch-name { font-size: 13px; font-weight: 600; flex: 1; }
.ch-count { font-size: 11px; color: var(--text-muted); margin-left: auto; }
.ch-badge { font-size: 10px; padding: 1px 6px; border-radius: 6px; background: #F1F5F9; color: var(--text-muted); font-weight: 400; }
.ch-actions { display: flex; gap: 2px; opacity: 0; transition: opacity 0.15s; }
.channel-item:hover .ch-actions { opacity: 1; }
.ch-edit-input { border: 2px solid var(--accent); border-radius: 6px; padding: 3px 6px; font-size: 12px; font-weight: 600; outline: none; width: 100%; }

.channel-add-btn {
  width: 100%; padding: 10px; border: none; border-top: 1px dashed var(--border);
  background: transparent; color: var(--accent); font-size: 12px; font-weight: 600;
  cursor: pointer; transition: background 0.15s;
}
.channel-add-btn:hover { background: var(--accent-light); }
.channel-add-form { display: flex; gap: 4px; align-items: center; padding: 10px 14px; border-top: 1px dashed var(--border); }

.act-icon {
  width: 28px; height: 28px; border-radius: 8px; border: 1px solid transparent;
  background: transparent; cursor: pointer; font-size: 13px;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-muted); transition: all 0.15s; flex-shrink: 0;
}
.act-icon:hover { background: #F4F5F7; border-color: var(--border); color: var(--text); }
.act-icon.danger:hover { background: var(--danger-light); border-color: var(--danger); color: var(--danger); }

/* 右侧 */
.split-right { min-width: 0; }
.split-right-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 4px; }
.ctx-label { font-size: 12px; color: var(--text-muted); }
.ctx-value { font-size: 14px; font-weight: 700; color: var(--accent); }
.ctx-sep { color: var(--border); margin: 0 6px; }
.ctx-count { font-size: 11px; color: var(--text-muted); margin-left: 10px; }
.source-list { display: flex; flex-direction: column; gap: 10px; }
.loading-state { text-align: center; padding: 24px; color: var(--text-muted); font-size: 13px; }
</style>
