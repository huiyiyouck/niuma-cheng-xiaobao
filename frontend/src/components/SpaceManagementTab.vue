<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import type { Channel, SourceWithPositions, UUID, Space } from "@/lib/types";
import { listSpaces, listChannels, listSpaceSources, removeDisplayPosition } from "@/lib/api";
import { createChannel, updateChannel, deleteChannel, getChannelDeletePreview, reorderChannels } from "@/lib/api";
import SourceCard from "@/components/SourceCard.vue";
import SourceCreateForm from "@/components/SourceCreateForm.vue";
import SlidePanel from "@/components/base/SlidePanel.vue";
import SearchSourceModal from "@/components/SearchSourceModal.vue";
import EmptyState from "@/components/EmptyState.vue";
import ErrorBar from "@/components/base/ErrorBar.vue";
import LoadingState from "@/components/base/LoadingState.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseModal from "@/components/base/BaseModal.vue";
import BaseFormField from "@/components/base/BaseFormField.vue";
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
const channelForm = ref({ name: "", description: "" });
const editingChannel = ref<Channel | null>(null);

// 添加信息源
const showSearchModal = ref(false);
const showCreateForm = ref(false);

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

function onSpaceSelect(id: string) { selectedSpaceId.value = id; selectedChannelId.value = null; }
function onChannelSelect(id: string | null) { selectedChannelId.value = id; }

function openChannelCreate() { channelForm.value = { name: "", description: "" }; showChannelCreate.value = true; }
async function doCreateChannel() {
  const name = channelForm.value.name.trim();
  if (!name || !selectedSpaceId.value) return;
  const desc = channelForm.value.description.trim() || null;
  try { await createChannel(selectedSpaceId.value, { name, description: desc }); showChannelCreate.value = false; toast.success("频道已创建"); refreshChannels(); }
  catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
}

function openChannelEdit(ch: Channel) { editingChannel.value = ch; channelForm.value = { name: ch.name, description: ch.description || "" }; showChannelEdit.value = true; }
async function doEditChannel() {
  if (!editingChannel.value || !selectedSpaceId.value) return;
  const name = channelForm.value.name.trim();
  if (!name) return;
  const desc = channelForm.value.description.trim() || null;
  try { await updateChannel(selectedSpaceId.value!, editingChannel.value.id, { name, description: desc }); showChannelEdit.value = false; toast.success("已更新"); refreshChannels(); }
  catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
}

async function doDeleteChannel(ch: Channel) {
  try {
    let preview: import("@/lib/types").ChannelDeletePreview = { channel_name: ch.name, position_count: 0, has_space_root_position: false };
    try { preview = await getChannelDeletePreview(selectedSpaceId.value!, ch.id); } catch {}
    const ok = await modal.confirm("删除频道", `将移除 <b>${preview.position_count}</b> 个展示位置。Source 和新闻保留。`, { confirmText: "确认删除", danger: true });
    if (!ok) return;
    await deleteChannel(selectedSpaceId.value!, ch.id);
    toast.success("已删除"); refreshChannels(); refreshSources();
  } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
}

async function moveChannel(idx: number, delta: number) {
  if (!selectedSpaceId.value) return;
  const next = idx + delta;
  if (next < 0 || next >= channels.value.length) return;
  const arr = [...channels.value];
  const [m] = arr.splice(idx, 1);
  arr.splice(next, 0, m);
  channels.value = arr;
  try {
    await reorderChannels(selectedSpaceId.value, {
      items: arr.map((c, i) => ({ id: c.id, sort_order: i })),
    });
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e));
    refreshChannels();
  }
}

async function onRemovePosition(positionId: string) {
  try { await removeDisplayPosition(positionId); toast.success("已移除"); refreshSources(); refreshChannels(); }
  catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
}

function openCreateForm() {
  showSearchModal.value = false;
  showCreateForm.value = true;
}

function onSearchAdded() {
  refreshSources();
}

function onSourceCreated() {
  showCreateForm.value = false;
  toast.success("信息源已创建并添加到当前位置");
  refreshSources();
}

watch(selectedSpaceId, () => { refreshChannels(); refreshSources(); });
watch(selectedChannelId, () => refreshSources());
</script>

<template>
  <div class="space-mgmt">
    <ErrorBar :message="errorText" />
    <div class="pill-section">
      <SpacePills :spaces="spaces" :selectedId="selectedSpaceId" mode="full" @select="onSpaceSelect" @changed="refreshSpaces()" />
    </div>

    <div v-if="!selectedSpaceId" class="empty-wrap"><EmptyState icon="📁" title="暂无空间" description="点击上方「+ 新建空间」创建第一个空间" /></div>

    <div v-else class="split-layout">
      <!-- 左栏：频道列表 -->
      <div class="split-left">
        <div class="split-left-header">
          <span class="side-label">频道</span>
          <button class="act-icon sort" title="管理频道排序">☰</button>
        </div>
        <div class="channel-list">
          <div class="channel-item all" :class="{ selected: selectedChannelId === null }" @click="onChannelSelect(null)">
            <span class="ch-name">全部</span><span class="ch-badge">聚合</span>
          </div>
          <div v-for="(ch, idx) in channels" :key="ch.id" class="channel-item" :class="{ selected: selectedChannelId === ch.id }" @click="onChannelSelect(ch.id)">
            <span class="ch-name">{{ ch.name }}</span>
            <span class="ch-count">{{ ch.source_count ?? 0 }}</span>
            <div class="ch-actions">
              <button class="act-icon" title="上移" :disabled="idx === 0" @click.stop="moveChannel(idx, -1)">▲</button>
              <button class="act-icon" title="下移" :disabled="idx === channels.length - 1" @click.stop="moveChannel(idx, 1)">▼</button>
              <button class="act-icon" title="编辑" @click.stop="openChannelEdit(ch)">✎</button>
              <button class="act-icon danger" title="删除" @click.stop="doDeleteChannel(ch)">✕</button>
            </div>
          </div>
        </div>
        <div class="channel-add-btn" @click="openChannelCreate">＋ 新建频道</div>
      </div>

      <!-- 右栏：信息源列表 -->
      <div class="split-right">
        <div class="split-right-header">
          <div class="ctx-info">
            <span class="ctx-label">当前：</span>
            <span class="ctx-value">{{ spaces.find(s => s.id === selectedSpaceId)?.name || '' }}</span>
            <span class="ctx-sep">·</span>
            <span class="ctx-value">{{ selectedChannelId === null ? '全部' : (channels.find(c => c.id === selectedChannelId)?.name || '') }}</span>
            <span class="ctx-count">{{ sources.length }} 个信息源</span>
          </div>
          <div class="add-source-wrap">
            <BaseButton variant="primary" size="sm" @click="showSearchModal = true">+ 添加信息源</BaseButton>
          </div>
        </div>

        <!-- 新建信息源侧边抽屉 -->
        <SlidePanel :show="showCreateForm" title="新建信息源" @close="showCreateForm = false">
          <SourceCreateForm
            entryPoint="space_management"
            :targetSpaceId="selectedSpaceId!"
            :targetChannelId="selectedChannelId"
            @created="onSourceCreated"
            @cancel="showCreateForm = false"
          />
        </SlidePanel>
        <LoadingState v-if="loading" />
        <div v-else-if="sources.length === 0" class="empty-wrap"><EmptyState icon="📡" title="当前位置暂无信息源" description="点击「添加信息源」开始" /></div>
        <div v-else class="source-list">
          <SourceCard v-for="s in sources" :key="s.id" :source="s" :currentSpaceId="selectedSpaceId!" :currentChannelId="selectedChannelId" :channels="channels" @refresh="refreshSources()" @remove="onRemovePosition" />
        </div>
      </div>
    </div>

    <!-- 新建频道弹窗 -->
    <BaseModal v-if="showChannelCreate" :title="`新建频道 — ${spaces.find(s => s.id === selectedSpaceId)?.name || ''}`" @close="showChannelCreate = false">
      <BaseFormField label="频道名称">
        <input class="form-f" v-model="channelForm.name" placeholder="如：模型动态、行业资讯" @keydown.enter="doCreateChannel" />
      </BaseFormField>
      <BaseFormField label="描述">
        <input class="form-f" v-model="channelForm.description" placeholder="可选，简短描述此频道的用途" @keydown.enter="doCreateChannel" />
      </BaseFormField>
      <template #footer>
        <BaseButton @click="showChannelCreate = false">取消</BaseButton>
        <BaseButton variant="primary" @click="doCreateChannel">确认创建</BaseButton>
      </template>
    </BaseModal>

    <!-- 编辑频道弹窗 -->
    <BaseModal v-if="showChannelEdit" title="编辑频道" @close="showChannelEdit = false">
      <BaseFormField label="频道名称">
        <input class="form-f" v-model="channelForm.name" @keydown.enter="doEditChannel" />
      </BaseFormField>
      <BaseFormField label="描述">
        <input class="form-f" v-model="channelForm.description" placeholder="可选，简短描述此频道的用途" @keydown.enter="doEditChannel" />
      </BaseFormField>
      <template #footer>
        <BaseButton @click="showChannelEdit = false">取消</BaseButton>
        <BaseButton variant="primary" @click="doEditChannel">保存</BaseButton>
      </template>
    </BaseModal>

    <!-- 添加信息源弹窗（先搜索已有，未找到再新建） -->
    <SearchSourceModal
      v-if="showSearchModal && selectedSpaceId"
      :spaceId="selectedSpaceId"
      :channelId="selectedChannelId"
      :spaceName="spaces.find(s => s.id === selectedSpaceId)?.name || ''"
      :channelName="selectedChannelId === null ? '全部' : (channels.find(c => c.id === selectedChannelId)?.name || '')"
      :existingSourceIds="sources.map(s => s.id)"
      @close="showSearchModal = false"
      @added="onSearchAdded"
      @createNew="openCreateForm"
    />
  </div>
</template>

<style scoped>
.space-mgmt { display: flex; flex-direction: column; gap: 14px; }
.empty-wrap { margin: 12px 0; }
.pill-section { display: flex; flex-direction: column; gap: 8px; }

.split-layout { display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: 20px; align-items: start; }
@media (max-width: 768px) { .split-layout { grid-template-columns: 1fr; } }

.split-left { background: var(--card); border: 1px solid var(--border-light); border-radius: 8px; overflow: hidden; align-self: start; }
.split-left-header { display: flex; align-items: center; gap: 8px; padding: 14px 16px 10px; }
.side-label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.3px; }

.channel-item { display: flex; align-items: center; gap: 10px; padding: 10px 16px; cursor: pointer; transition: background 0.12s; border-bottom: 1px solid var(--border-light); min-height: 43px; }
.channel-item:last-child { border-bottom: none; }
.channel-item:hover { background: var(--hover-bg); }
.channel-item.selected { background: var(--accent-light); border-left: 3px solid var(--accent); padding-left: 13px; }
.channel-item.all { font-weight: 600; }
.ch-name { font-size: 13px; font-weight: 600; flex: 1; }
.ch-count { font-size: 11px; color: var(--text-muted); margin-left: auto; }
.ch-badge { font-size: 10px; padding: 1px 6px; border-radius: 6px; background: #F1F5F9; color: var(--text-muted); font-weight: 400; }
.ch-actions { display: flex; gap: 2px; opacity: 0; transition: opacity 0.15s; }
.channel-item:hover .ch-actions { opacity: 1; }
.channel-add-btn { width: 100%; padding: 10px; border: none; border-top: 1px dashed var(--border); background: transparent; color: var(--accent); font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.15s; text-align: center; }
.channel-add-btn:hover { background: var(--accent-light); }

.act-icon { width: 24px; height: 24px; border-radius: 6px; border: 1px solid transparent; background: transparent; cursor: pointer; font-size: 11px; display: flex; align-items: center; justify-content: center; color: var(--text-muted); transition: all 0.15s; flex-shrink: 0; }
.act-icon.sort { margin-left: auto; }
.act-icon:hover:not(:disabled) { background: #F4F5F7; border-color: var(--border); color: var(--text); }
.act-icon:disabled { opacity: 0.25; cursor: not-allowed; }
.act-icon.danger:hover:not(:disabled) { background: var(--danger-light); border-color: var(--danger); color: var(--danger); }

.split-right { min-width: 0; }
.split-right-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 4px; gap: 12px; }
.ctx-info { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.ctx-label { font-size: 12px; color: var(--text-muted); }
.ctx-value { font-size: 14px; font-weight: 700; color: var(--accent); }
.ctx-sep { color: var(--border); margin: 0 6px; }
.ctx-count { font-size: 11px; color: var(--text-muted); margin-left: 10px; }
.source-list { display: flex; flex-direction: column; gap: 10px; }

.add-source-wrap { position: relative; flex-shrink: 0; }
</style>
