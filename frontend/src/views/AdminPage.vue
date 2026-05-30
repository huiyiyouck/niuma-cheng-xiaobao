<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import {
  listSpaces, createSpace, listSources, listChannelSources, listAlerts,
  bindSource, updateChannelSource,
} from "@/lib/api";
import type { ChannelSpace, Source, ChannelSourceWithSource, Alert, UUID } from "@/lib/types";
import CreateSpaceModal from "@/components/CreateSpaceModal.vue";
import SubChannelManager from "@/components/SubChannelManager.vue";
import AlertList from "@/components/AlertList.vue";
import SourceCard from "@/components/SourceCard.vue";
import InlineAddSource from "@/components/InlineAddSource.vue";
import { useToast } from "@/composables/useToast";
import { useModal } from "@/composables/useModal";

const toast = useToast();
const modal = useModal();

const spaces = ref<ChannelSpace[]>([]);
const sources = ref<Source[]>([]);
const bindings = ref<ChannelSourceWithSource[]>([]);
const alerts = ref<Alert[]>([]);
const selectedSpaceId = ref<UUID | null>(null);
const errorText = ref<string | null>(null);

const showCreateSpace = ref(false);
const showAddSource = ref(false);
const showSubDrawer = ref(false);

const editingBindingId = ref<UUID | null>(null);

async function refreshAll() {
  try {
    spaces.value = await listSpaces();
    sources.value = await listSources();
    if (!selectedSpaceId.value && spaces.value.length > 0) selectedSpaceId.value = spaces.value[0].id;
    await refreshSpaceData();
  } catch (e) { errorText.value = e instanceof Error ? e.message : String(e); }
}

async function refreshSpaceData() {
  if (!selectedSpaceId.value) return;
  try {
    bindings.value = await listChannelSources(selectedSpaceId.value);
    alerts.value = await listAlerts(selectedSpaceId.value, 200);
  } catch (e) { errorText.value = e instanceof Error ? e.message : String(e); }
}

async function onCreateSpace(name: string, desc: string) {
  try {
    await createSpace({ name, description: desc || undefined });
    showCreateSpace.value = false;
    toast.success("频道空间已创建");
    await refreshAll();
  } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
}

async function onDeleteSpace() {
  if (!selectedSpaceId.value) return;
  const name = spaces.value.find(s => s.id === selectedSpaceId.value)?.name || "";
  // Fetch delete preview
  try {
    const res = await fetch(`/v1/channel-spaces/${selectedSpaceId.value}/delete-preview`);
    const stats = await res.json();
    const ok = await modal.confirm(
      "删除频道空间",
      `确定删除 <strong>${name}</strong> 吗？将级联删除：<br>
      信息源绑定 ${stats.channel_sources} 个 · 子频道 ${stats.sub_channels} 个 · 新闻 ${stats.processed_news} 条 · 原始数据 ${stats.raw_items} 条 · 告警 ${stats.alerts} 条`,
      { confirmText: "确认删除", danger: true },
    );
    if (!ok) return;
    await fetch(`/v1/channel-spaces/${selectedSpaceId.value}`, { method: "DELETE" });
    toast.success("频道空间已删除");
    selectedSpaceId.value = null;
    await refreshAll();
  } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
}

async function onAcknowledgeAll() {
  if (!selectedSpaceId.value) return;
  const activeCount = alerts.value.filter(a => a.status === "active").length;
  if (activeCount === 0) return;
  const ok = await modal.confirm(
    "全部标记已确认",
    `确定将当前频道空间所有未处理告警（${activeCount} 条）标记为已确认？`,
    { confirmText: "确认" },
  );
  if (!ok) return;
  try {
    const res = await fetch("/v1/alerts/acknowledge-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel_space_id: selectedSpaceId.value }),
    });
    const data = await res.json();
    toast.success(`已标记 ${data.updated} 条告警`);
    await refreshSpaceData();
  } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
}

watch(selectedSpaceId, () => {
  showAddSource.value = false;
  editingBindingId.value = null;
  refreshSpaceData();
});

onMounted(refreshAll);
</script>

<template>
  <div class="admin-page">
    <div v-if="errorText" class="error-bar"><span>⚠️</span><span>{{ errorText }}</span></div>

    <!-- 频道空间 Pill 行 -->
    <div class="space-pill-row">
      <div class="space-pills">
        <button
          v-for="s in spaces" :key="s.id"
          class="space-pill" :class="{ active: selectedSpaceId === s.id }"
          @click="selectedSpaceId = s.id"
        >{{ s.name }}</button>
      </div>
      <div class="space-actions">
        <button class="btn-sm" @click="showCreateSpace = true">+ 新建空间</button>
        <button class="btn-sm" @click="showSubDrawer = !showSubDrawer">📂 子频道</button>
        <button
          class="btn-sm" style="color: var(--warning)"
          :disabled="alerts.filter(a => a.status === 'active').length === 0"
          @click="onAcknowledgeAll"
        >全部标记已确认 ({{ alerts.filter(a => a.status === 'active').length }})</button>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!selectedSpaceId" class="empty-state">📂 暂无频道空间<br><small>点击「+ 新建空间」创建</small></div>

    <template v-else>
      <!-- 信息源卡片列表 -->
      <div v-if="bindings.length === 0" class="empty-state">
        📡 当前频道暂无信息源<br><small>点击下方「+ 添加信息源」开始</small>
      </div>
      <div v-else class="source-list">
        <SourceCard
          v-for="b in bindings" :key="b.channel_source.id"
          :binding="b"
          :alerts="alerts.filter(a => a.type === 'source_fetch' || true)"
          :editing="editingBindingId === b.channel_source.id"
          @edit="editingBindingId = b.channel_source.id"
          @cancel="editingBindingId = null"
          @saved="editingBindingId = null; refreshSpaceData()"
          @refresh="refreshSpaceData()"
        />
      </div>

      <!-- 内联添加表单 -->
      <div style="margin-top:14px">
        <button v-if="!showAddSource" class="btn add-btn" @click="showAddSource = true">+ 添加信息源</button>
        <InlineAddSource
          v-else
          :spaceId="selectedSpaceId"
          @added="showAddSource = false; refreshSpaceData()"
          @cancel="showAddSource = false"
        />
      </div>
    </template>

    <!-- 子频道抽屉 -->
    <Teleport to="body">
      <transition name="drawer">
        <div v-if="showSubDrawer" class="drawer-overlay" @click.self="showSubDrawer = false">
          <div class="drawer-panel">
            <SubChannelManager
              :channelSpaceId="selectedSpaceId!"
              @close="showSubDrawer = false"
            />
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- 新建频道空间弹窗 -->
    <CreateSpaceModal
      v-if="showCreateSpace"
      @create="onCreateSpace"
      @close="showCreateSpace = false"
    />
  </div>
</template>

<style scoped>
.admin-page { display: flex; flex-direction: column; gap: 14px; }
.space-pill-row {
  display: flex; gap: 12px; align-items: center; padding: 10px 16px;
  background: var(--card); border: 1px solid var(--border-light); border-radius: 12px;
  box-shadow: var(--shadow-soft);
}
.space-pills { display: flex; gap: 6px; flex-wrap: wrap; flex: 1; }
.space-pill {
  padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 700;
  border: 1px solid var(--border); background: var(--card); color: var(--text-secondary);
  cursor: pointer; transition: all 0.15s;
}
.space-pill:hover { border-color: var(--accent); color: var(--accent); }
.space-pill.active { background: var(--accent); color: #FFF; border-color: var(--accent); }
.space-actions { display: flex; gap: 6px; flex-shrink: 0; }
.btn-sm {
  padding: 6px 14px; font-size: 12px; font-weight: 600; border-radius: 8px;
  border: 1px solid var(--border); background: var(--card); color: var(--text-secondary);
  cursor: pointer; white-space: nowrap;
}
.btn-sm:hover { background: #F4F5F7; }
.btn-sm:disabled { opacity: 0.4; cursor: not-allowed; }
.btn { padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600;
       border: 1px solid var(--border); background: var(--card); cursor: pointer; }
.add-btn { width: 100%; border-style: dashed; border-color: var(--accent); color: var(--accent); }
.add-btn:hover { background: var(--accent-light); }
.source-list { display: flex; flex-direction: column; gap: 10px; }

.drawer-overlay {
  position: fixed; inset: 0; z-index: 50;
  background: rgba(0,0,0,0.3);
  display: flex; justify-content: flex-end;
}
.drawer-panel {
  width: 420px; max-width: 100vw; height: 100vh;
  background: var(--card); overflow-y: auto;
  box-shadow: -4px 0 24px rgba(0,0,0,0.08);
}
.drawer-enter-active { animation: drawerIn 0.3s cubic-bezier(0.4,0,0.2,1); }
@keyframes drawerIn {
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
}

.empty-state { text-align: center; padding: 48px 24px; color: var(--text-muted); font-size: 14px; font-weight: 600; }
.empty-state small { font-size: 12px; font-weight: 400; display: block; margin-top: 4px; }
.error-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; border-radius: 8px;
  background: var(--danger-light); border: 1px solid rgba(231,76,60,0.2);
  color: #991b1b; font-size: 12px;
}
</style>
