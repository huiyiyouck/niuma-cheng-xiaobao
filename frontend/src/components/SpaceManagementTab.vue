<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import type { Space, Channel, SourceWithPositions, UUID } from "@/lib/types";
import { listSpaces, listChannels, listSpaceSources, removeDisplayPosition, addDisplayPosition } from "@/lib/api";
import { createChannel, updateChannel, deleteChannel, getChannelDeletePreview } from "@/lib/api";
import SpacePills from "@/components/SpacePills.vue";
import SourceCard from "@/components/SourceCard.vue";
import EmptyState from "@/components/EmptyState.vue";
import { useToast } from "@/composables/useToast";
import { useModal } from "@/composables/useModal";

const toast = useToast();
const modal = useModal();
const spaces = ref<Space[]>([]);
const channels = ref<Channel[]>([]);
const sources = ref<SourceWithPositions[]>([]);
const loading = ref(false);
const errorText = ref<string | null>(null);
const selectedSpaceId = ref<UUID | null>(null);
const selectedChannelId = ref<UUID | null>(null);

// 频道弹窗
const showChannelCreate = ref(false);
const showChannelEdit = ref(false);
const channelForm = ref({ name: "" });
const editingChannel = ref<Channel | null>(null);

onMounted(async () => { await refreshSpaces(); });

async function refreshSpaces() {
  try { spaces.value = await listSpaces(); if (!selectedSpaceId.value && spaces.value.length > 0) selectedSpaceId.value = spaces.value[0].id; }
  catch (e) { errorText.value = e instanceof Error ? e.message : String(e); }
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

function onSpaceSelect(id: string) { selectedSpaceId.value = id; selectedChannelId.value = null; }
function onChannelSelect(id: string | null) { selectedChannelId.value = id; }

function openChannelCreate() { channelForm.value = { name: "" }; showChannelCreate.value = true; }
async function doCreateChannel() {
  const name = channelForm.value.name.trim();
  if (!name || !selectedSpaceId.value) return;
  try { await createChannel(selectedSpaceId.value, { name }); showChannelCreate.value = false; toast.success("频道已创建"); refreshChannels(); }
  catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
}

function openChannelEdit(ch: Channel) { editingChannel.value = ch; channelForm.value = { name: ch.name }; showChannelEdit.value = true; }
async function doEditChannel() {
  if (!editingChannel.value || !selectedSpaceId.value) return;
  try { await updateChannel(selectedSpaceId.value, editingChannel.value.id, { name: channelForm.value.name.trim() }); showChannelEdit.value = false; toast.success("已更新"); refreshChannels(); }
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

    <div v-if="!selectedSpaceId" class="empty-wrap"><EmptyState icon="📁" title="暂无空间" description="点击上方「+ 新建空间」创建第一个空间" /></div>

    <div v-else class="split-layout">
      <div class="split-left">
        <div class="split-left-header"><span class="side-label">频道</span></div>
        <div class="channel-list">
          <div class="channel-item all" :class="{ selected: selectedChannelId === null }" @click="onChannelSelect(null)">
            <span class="ch-name">全部</span><span class="ch-badge">聚合</span>
          </div>
          <div v-for="ch in channels" :key="ch.id" class="channel-item" :class="{ selected: selectedChannelId === ch.id }" @click="onChannelSelect(ch.id)">
            <span class="ch-name">{{ ch.name }}</span>
            <span class="ch-count">{{ ch.source_count ?? 0 }}</span>
            <div class="ch-actions">
              <button class="act-icon" title="编辑" @click.stop="openChannelEdit(ch)">✎</button>
              <button class="act-icon danger" title="删除" @click.stop="doDeleteChannel(ch)">✕</button>
            </div>
          </div>
        </div>
        <div class="channel-add-btn" @click="openChannelCreate">＋ 新建频道</div>
      </div>

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
        <div v-else-if="sources.length === 0" class="empty-wrap"><EmptyState icon="📡" title="当前位置暂无信息源" description="点击「添加信息源」开始" /></div>
        <div v-else class="source-list">
          <SourceCard v-for="s in sources" :key="s.id" :source="s" :currentSpaceId="selectedSpaceId!" :currentChannelId="selectedChannelId" @refresh="refreshSources()" @remove="onRemovePosition" />
        </div>
      </div>
    </div>

    <!-- 新建频道弹窗 -->
    <div v-if="showChannelCreate" class="modal-overlay" @click.self="showChannelCreate = false">
      <div class="modal-dialog">
        <h3>新建频道</h3>
        <div class="form-g"><label class="form-l">频道名称</label><input class="form-f" v-model="channelForm.name" placeholder="如：模型动态、行业资讯" @keydown.enter="doCreateChannel" /></div>
        <div class="modal-actions">
          <button class="btn btn-cancel" @click="showChannelCreate = false">取消</button>
          <button class="btn btn-primary" @click="doCreateChannel">确认创建</button>
        </div>
      </div>
    </div>

    <!-- 编辑频道弹窗 -->
    <div v-if="showChannelEdit" class="modal-overlay" @click.self="showChannelEdit = false">
      <div class="modal-dialog">
        <h3>编辑频道</h3>
        <div class="form-g"><label class="form-l">频道名称</label><input class="form-f" v-model="channelForm.name" @keydown.enter="doEditChannel" /></div>
        <div class="modal-actions">
          <button class="btn btn-cancel" @click="showChannelEdit = false">取消</button>
          <button class="btn btn-primary" @click="doEditChannel">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.space-mgmt { display: flex; flex-direction: column; gap: 12px; }
.empty-wrap { margin: 12px 0; }
.error-bar { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 8px; background: var(--danger-light); border: 1px solid rgba(231,76,60,0.2); color: #991b1b; font-size: 12px; }

.split-layout { display: grid; grid-template-columns: 240px 1fr; gap: 20px; }
@media (max-width: 768px) { .split-layout { grid-template-columns: 1fr; } }

.split-left { background: var(--card); border: 1px solid var(--border-light); border-radius: 14px; overflow: hidden; align-self: start; }
.split-left-header { display: flex; align-items: center; padding: 14px 18px 10px; }
.side-label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; }

.channel-item { display: flex; align-items: center; gap: 10px; padding: 10px 18px; cursor: pointer; transition: background 0.12s; border-bottom: 1px solid var(--border-light); }
.channel-item:last-child { border-bottom: none; }
.channel-item:hover { background: #F8FAFB; }
.channel-item.selected { background: var(--accent-light); border-left: 3px solid var(--accent); padding-left: 15px; }
.channel-item.all { font-weight: 600; }
.ch-name { font-size: 13px; font-weight: 600; flex: 1; }
.ch-count { font-size: 11px; color: var(--text-muted); margin-left: auto; }
.ch-badge { font-size: 10px; padding: 1px 6px; border-radius: 6px; background: #F1F5F9; color: var(--text-muted); font-weight: 400; }
.ch-actions { display: flex; gap: 2px; opacity: 0; transition: opacity 0.15s; }
.channel-item:hover .ch-actions { opacity: 1; }
.channel-add-btn { width: 100%; padding: 10px; border: none; border-top: 1px dashed var(--border); background: transparent; color: var(--accent); font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.15s; }
.channel-add-btn:hover { background: var(--accent-light); }

.act-icon { width: 28px; height: 28px; border-radius: 8px; border: 1px solid transparent; background: transparent; cursor: pointer; font-size: 13px; display: flex; align-items: center; justify-content: center; color: var(--text-muted); transition: all 0.15s; flex-shrink: 0; }
.act-icon:hover { background: #F4F5F7; border-color: var(--border); color: var(--text); }
.act-icon.danger:hover { background: var(--danger-light); border-color: var(--danger); color: var(--danger); }

.split-right { min-width: 0; }
.split-right-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 4px; }
.ctx-label { font-size: 12px; color: var(--text-muted); }
.ctx-value { font-size: 14px; font-weight: 700; color: var(--accent); }
.ctx-sep { color: var(--border); margin: 0 6px; }
.ctx-count { font-size: 11px; color: var(--text-muted); margin-left: 10px; }
.source-list { display: flex; flex-direction: column; gap: 10px; }
.loading-state { text-align: center; padding: 24px; color: var(--text-muted); font-size: 13px; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 100; display: flex; align-items: center; justify-content: center; }
.modal-dialog { background: var(--card); border-radius: 12px; box-shadow: 0 12px 32px rgba(0,0,0,0.12); padding: 24px; min-width: 380px; max-width: 440px; }
.modal-dialog h3 { font-size: 15px; font-weight: 800; margin: 0 0 16px 0; }
.form-g { margin-bottom: 12px; }
.form-l { display: block; font-size: 11px; font-weight: 700; color: var(--text-muted); margin-bottom: 4px; }
.form-f { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 13px; }
.form-f:focus { border-color: var(--accent); outline: none; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
.btn { padding: 8px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: .15s; }
.btn-cancel { border: 1px solid var(--border); background: var(--card); color: var(--text-secondary); }
.btn-cancel:hover { border-color: var(--accent); color: var(--accent); }
.btn-primary { border: none; background: var(--accent); color: #FFF; }
.btn-primary:hover { opacity: 0.9; }
</style>
