<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { Plus, MoreHorizontal, Edit2, Trash2, ChevronDown, X, ChevronLeft, ChevronRight, ChevronUp } from "lucide-vue-next";
import { cn } from "@/lib/utils";
import DeleteConfirmDialog from "./DeleteConfirmDialog.vue";
import AddSourceDrawer from "./AddSourceDrawer.vue";
import SpaceEditDialog from "./SpaceEditDialog.vue";
import ChannelEditDialog from "./ChannelEditDialog.vue";
import PlacementTooltip from "@/components/ui/PlacementTooltip.vue";
import { listSpaces, listChannels, listSpaceSources, pauseSource, resumeSource, deleteSpace, deleteChannel, createSpace, updateSpace, createChannel, updateChannel } from "@/lib/api";

const typeLabels: Record<string, string> = { x_twitter: "X/Twitter", rss: "RSS" };
function fmtAgo(iso?: string): string {
  if (!iso) return "从未";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
}

const spaces = ref<any[]>([]);
const channels = ref<any[]>([{ id: "all", name: "全部", sourceCount: 0, isAll: true }]);
const sources = ref<any[]>([]);
const selectedSpace = ref("");
const selectedChannel = ref("all");
const hoveredSpace = ref<string | null>(null);
const hoveredChannel = ref<string | null>(null);
const spaceEditDialog = ref<{ open: boolean; space: any }>({ open: false, space: null });
const channelEditDialog = ref<{ open: boolean; channel: any }>({ open: false, channel: null });
const deleteDialog = ref<{ open: boolean; data: any }>({ open: false, data: null });
const addSourceDrawer = ref(false);

const currentSpace = computed(() => spaces.value.find((s) => s.id === selectedSpace.value));
const currentChannel = computed(() => channels.value.find((c) => c.id === selectedChannel.value));
const isInAllChannel = computed(() => selectedChannel.value === "all");
const filteredSources = computed(() => sources.value);

function mapSpace(s: any) {
  return { id: s.id, name: s.name, icon: s.icon || "📁", description: s.description || "", channelCount: s.channel_count ?? 0, sourceCount: s.source_count ?? 0 };
}
function mapSource(s: any) {
  return {
    id: s.id, name: s.display_name ?? s.source_identity ?? "未命名", type: typeLabels[s.type] ?? s.type,
    availability: s.availability_status ?? "normal", isRunning: !s.paused,
    tags: Array.isArray(s.domain_tags) ? s.domain_tags : [], identity: s.source_identity ?? "",
    fetchConfig: `最近抓取: ${fmtAgo(s.last_fetched_at)}  历史新闻: ${s.total_news_count ?? 0}`,
    placements: (s.display_positions ?? []).map((p: any) => ({ space: p.space_name, channel: p.channel_name })),
  };
}

async function loadSpaces() {
  try {
    const r: any = await listSpaces();
    spaces.value = (r ?? []).map(mapSpace);
    if (!selectedSpace.value && spaces.value.length) await selectSpace(spaces.value[0].id);
  } catch { spaces.value = []; }
}
async function loadChannels() {
  try {
    const r: any = await listChannels(selectedSpace.value);
    channels.value = [
      { id: "all", name: "全部", sourceCount: currentSpace.value?.sourceCount ?? 0, isAll: true },
      ...(r ?? []).map((c: any) => ({ id: c.id, name: c.name, sourceCount: c.source_count ?? 0, isAll: false })),
    ];
  } catch { channels.value = [{ id: "all", name: "全部", sourceCount: 0, isAll: true }]; }
}
async function loadSources() {
  try {
    const r: any = await listSpaceSources(selectedSpace.value, selectedChannel.value === "all" ? null : selectedChannel.value);
    sources.value = (r ?? []).map(mapSource);
  } catch { sources.value = []; }
}

async function selectSpace(id: string) {
  selectedSpace.value = id;
  selectedChannel.value = "all";
  await Promise.all([loadChannels(), loadSources()]);
}
async function selectChannel(id: string) {
  selectedChannel.value = id;
  await loadSources();
}
function handleSpaceEdit(space: any) { spaceEditDialog.value = { open: true, space }; }
function handleSpaceDelete(space: any) { deleteDialog.value = { open: true, data: { type: "space", id: space.id, name: space.name, channelCount: space.channelCount, placementCount: space.sourceCount, newsCount: 0 } }; }
function handleChannelEdit(channel: any) { if (channel?.isAll) return; channelEditDialog.value = { open: true, channel: channel ? { id: channel.id, name: channel.name, description: "" } : null }; }
function handleChannelDelete(channel: any) { deleteDialog.value = { open: true, data: { type: "channel", id: channel.id, name: channel.name, spaceName: currentSpace.value?.name, placementCount: channel.sourceCount, sourceCount: channel.sourceCount, newsCount: 0 } }; }
function handleSourceRemove(source: any) { deleteDialog.value = { open: true, data: { type: "remove-placement", sourceName: source.name, location: `${currentSpace.value?.name} / ${currentChannel.value?.name}` } }; }
function currentChannelOf(source: any) { return source.placements.find((p: any) => p.space === currentSpace.value?.name)?.channel || "未分配"; }

async function toggleSourcePause(source: any) {
  try { source.isRunning ? await pauseSource(source.id) : await resumeSource(source.id); await loadSources(); } catch { /* ignore */ }
}
async function handleSpaceSave(data: any) {
  try {
    if (spaceEditDialog.value.space?.id) await updateSpace(spaceEditDialog.value.space.id, data);
    else await createSpace(data);
    await loadSpaces();
  } catch { /* ignore */ }
  spaceEditDialog.value = { open: false, space: null };
}
async function handleChannelSave(data: any) {
  try {
    if (channelEditDialog.value.channel?.id) await updateChannel(selectedSpace.value, channelEditDialog.value.channel.id, data);
    else await createChannel(selectedSpace.value, data);
    await loadChannels();
  } catch { /* ignore */ }
  channelEditDialog.value = { open: false, channel: null };
}
async function handleDeleteConfirm() {
  const d = deleteDialog.value.data;
  try {
    if (d?.type === "space") { await deleteSpace(d.id); await loadSpaces(); }
    else if (d?.type === "channel") { await deleteChannel(selectedSpace.value, d.id); await loadChannels(); await loadSources(); }
  } catch { /* ignore */ }
  deleteDialog.value = { open: false, data: null };
}

onMounted(loadSpaces);
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Spaces Row -->
    <div class="border-b border-border p-6">
      <div class="flex items-center gap-2 mb-3">
        <h4 class="text-sm font-medium">空间</h4>
        <button class="p-1 hover:bg-accent rounded"><MoreHorizontal class="h-4 w-4" /></button>
      </div>
      <div class="flex gap-3 flex-wrap">
        <div v-for="(space, idx) in spaces" :key="space.id" @mouseenter="hoveredSpace = space.id" @mouseleave="hoveredSpace = null" class="relative">
          <div
            @click="selectSpace(space.id)"
            @dblclick="handleSpaceEdit(space)"
            :class="cn('w-[180px] p-3 rounded-lg border-2 transition-all text-left relative cursor-pointer', selectedSpace === space.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50')"
          >
            <div class="flex items-start gap-2 mb-2">
              <div class="text-2xl">{{ space.icon }}</div>
              <div class="flex-1 min-w-0"><div class="font-medium">{{ space.name }}</div></div>
              <div v-if="selectedSpace === space.id" class="flex gap-0.5">
                <button @click.stop="handleSpaceEdit(space)" class="p-0.5 hover:bg-accent rounded"><Edit2 class="h-3 w-3" /></button>
                <button @click.stop="handleSpaceDelete(space)" class="p-0.5 hover:bg-accent rounded text-destructive"><X class="h-3 w-3" /></button>
              </div>
            </div>
            <div class="text-xs text-muted-foreground">{{ space.channelCount }}个频道 · {{ space.sourceCount }}个信息源</div>
            <template v-if="hoveredSpace === space.id">
              <button v-if="idx > 0" @click.stop class="absolute -left-7 top-1/2 -translate-y-1/2 p-0.5 hover:bg-accent rounded"><ChevronLeft class="h-4 w-4" /></button>
              <button v-if="idx < spaces.length - 1" @click.stop class="absolute -right-7 top-1/2 -translate-y-1/2 p-0.5 hover:bg-accent rounded"><ChevronRight class="h-4 w-4" /></button>
            </template>
          </div>
        </div>
        <button @click="handleSpaceEdit(null)" class="w-[180px] p-3 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <Plus class="h-5 w-5" /><span>新建空间</span>
        </button>
      </div>
    </div>

    <!-- Content: Channels + Sources -->
    <div class="flex flex-1 overflow-hidden">
      <div class="w-56 border-r border-border bg-card p-4">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-medium">频道</h4>
          <button class="p-1 hover:bg-accent rounded"><MoreHorizontal class="h-4 w-4" /></button>
        </div>
        <div class="space-y-1">
          <div v-for="(channel, idx) in channels" :key="channel.id" @mouseenter="hoveredChannel = channel.id" @mouseleave="hoveredChannel = null" class="relative">
            <button
              @click="selectChannel(channel.id)"
              @dblclick="handleChannelEdit(channel)"
              :class="cn('w-full px-3 py-2 rounded-md transition-colors text-left text-sm', selectedChannel === channel.id ? 'bg-secondary text-secondary-foreground font-medium' : 'hover:bg-accent')"
            >
              <div class="flex items-center justify-between">
                <span>{{ channel.name }}</span>
                <div class="flex items-center gap-2">
                  <span v-if="!channel.isAll" class="text-xs text-muted-foreground">{{ channel.sourceCount }}</span>
                  <button v-if="selectedChannel === channel.id && !channel.isAll" @click.stop="handleChannelDelete(channel)" class="p-0.5 hover:bg-accent rounded text-destructive"><Trash2 class="h-3 w-3" /></button>
                </div>
              </div>
            </button>
            <div v-if="!channel.isAll && hoveredChannel === channel.id" class="absolute -right-6 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
              <button v-if="idx > 1" @click.stop class="p-0.5 hover:bg-accent rounded"><ChevronUp class="h-3 w-3" /></button>
              <button v-if="idx < channels.length - 1" @click.stop class="p-0.5 hover:bg-accent rounded"><ChevronDown class="h-3 w-3" /></button>
            </div>
          </div>
          <button @click="handleChannelEdit(null)" class="w-full px-3 py-2 rounded-md hover:bg-accent text-left text-sm text-primary"><Plus class="h-3 w-3 inline mr-2" />新建频道</button>
        </div>
      </div>

      <div class="flex-1 overflow-auto">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-2 text-sm">
              <span class="text-muted-foreground">当前:</span>
              <span class="text-primary">{{ currentSpace?.name }}</span>
              <span class="text-muted-foreground">·</span>
              <span class="text-primary">{{ currentChannel?.name }}</span>
              <span class="text-muted-foreground">{{ filteredSources.length }}个信息源</span>
            </div>
            <button @click="addSourceDrawer = true" class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 flex items-center gap-2"><Plus class="h-4 w-4" />添加信息源</button>
          </div>

          <div v-if="filteredSources.length === 0" class="text-center py-12">
            <p class="text-muted-foreground">当前频道暂无信息源</p>
            <button @click="addSourceDrawer = true" class="mt-4 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-accent"><Plus class="h-4 w-4 inline mr-2" />添加第一个信息源</button>
          </div>
          <div v-else class="space-y-3">
            <div v-for="source in filteredSources" :key="source.id" class="bg-card border border-border rounded-lg p-4">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <h4 class="font-medium">{{ source.name }}</h4>
                    <span class="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">{{ source.type }}</span>
                    <span :class="cn('px-2 py-0.5 text-xs rounded', source.availability === 'normal' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800')">{{ source.availability === "normal" ? "正常" : "待修复" }}</span>
                    <span class="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded flex items-center gap-1"><span :class="cn('h-1.5 w-1.5 rounded-full', source.isRunning ? 'bg-green-600' : 'bg-gray-400')" />{{ source.isRunning ? "抓取中" : "已停止" }}</span>
                  </div>
                  <div class="flex items-center gap-2 mb-2 flex-wrap text-sm">
                    <span v-for="tag in source.tags" :key="tag" class="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded">{{ tag }}</span>
                    <span class="text-muted-foreground">身份: {{ source.identity }}</span>
                    <span class="text-muted-foreground">{{ source.fetchConfig }}</span>
                  </div>
                  <PlacementTooltip v-if="isInAllChannel" :placements="source.placements">
                    <span class="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer">使用于 {{ source.placements.length }} 个位置</span>
                  </PlacementTooltip>
                </div>
                <div class="flex items-center gap-2 ml-4">
                  <button class="px-3 py-1.5 bg-secondary text-secondary-foreground rounded hover:bg-accent text-sm">详情</button>
                  <button @click="toggleSourcePause(source)" class="px-3 py-1.5 bg-secondary text-secondary-foreground rounded hover:bg-accent text-sm">{{ source.isRunning ? "暂停" : "恢复" }}</button>
                  <span v-if="isInAllChannel" class="px-3 py-1.5 bg-secondary text-secondary-foreground rounded text-sm">{{ currentChannelOf(source) }}</span>
                  <span v-else class="px-3 py-1.5 bg-muted text-muted-foreground rounded text-sm">当前频道: {{ currentChannel?.name }}</span>
                  <button @click="handleSourceRemove(source)" class="px-3 py-1.5 bg-destructive/10 text-destructive rounded hover:bg-destructive/20 text-sm">从此位置移除</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <SpaceEditDialog :open="spaceEditDialog.open" :space="spaceEditDialog.space" @close="spaceEditDialog.open = false" @save="handleSpaceSave" />
    <ChannelEditDialog :open="channelEditDialog.open" :channel="channelEditDialog.channel" @close="channelEditDialog.open = false" @save="handleChannelSave" />
    <DeleteConfirmDialog :open="deleteDialog.open" :data="deleteDialog.data" @close="deleteDialog.open = false" @confirm="handleDeleteConfirm" />
    <AddSourceDrawer :open="addSourceDrawer" :space-name="currentSpace?.name || ''" :channel-name="currentChannel?.name || ''" @close="addSourceDrawer = false" @add-source="addSourceDrawer = false" />
  </div>
</template>
