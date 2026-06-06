<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import type { Space, Channel, SourceWithPositions, UUID } from "@/lib/types";
import { listSpaces, listChannels, listSpaceSources, removeDisplayPosition, addDisplayPosition, getSpaceDeletePreview, deleteSpace } from "@/lib/api";
import SpacePills from "@/components/SpacePills.vue";
import ChannelPills from "@/components/ChannelPills.vue";
import SourceCard from "@/components/SourceCard.vue";
import SourceCreateForm from "@/components/SourceCreateForm.vue";
import EmptyState from "@/components/EmptyState.vue";
import { useToast } from "@/composables/useToast";

// v0.5: 空间管理 Tab
// 三层结构：SpacePills + ChannelPills + SourceCard 列表

const toast = useToast();

const spaces = ref<Space[]>([]);
const channels = ref<Channel[]>([]);
const sources = ref<SourceWithPositions[]>([]);
const loading = ref(false);
const errorText = ref<string | null>(null);

const selectedSpaceId = ref<UUID | null>(null);
const selectedChannelId = ref<UUID | null>(null); // null = 全部
const showAddSource = ref(false);

// 初始加载
onMounted(async () => {
  await refreshSpaces();
});

async function refreshSpaces() {
  try {
    spaces.value = await listSpaces();
    if (!selectedSpaceId.value && spaces.value.length > 0) {
      selectedSpaceId.value = spaces.value[0].id;
    }
  } catch (e) {
    errorText.value = e instanceof Error ? e.message : String(e);
  }
}

async function refreshChannels() {
  if (!selectedSpaceId.value) { channels.value = []; return; }
  try {
    channels.value = await listChannels(selectedSpaceId.value);
  } catch { channels.value = []; }
}

async function refreshSources() {
  if (!selectedSpaceId.value) { sources.value = []; return; }
  loading.value = true;
  errorText.value = null;
  try {
    sources.value = await listSpaceSources(selectedSpaceId.value, selectedChannelId.value);
  } catch (e) {
    errorText.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

async function onSpaceSelect(id: string) {
  selectedSpaceId.value = id;
  selectedChannelId.value = null;
  showAddSource.value = false;
}

async function onChannelSelect(id: string | null) {
  selectedChannelId.value = id;
  showAddSource.value = false;
}

async function onRemovePosition(positionId: string) {
  try {
    await removeDisplayPosition(positionId);
    toast.success("展示位置已移除");
    await refreshSources();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e));
  }
}

async function onSourceCreated(sourceId: string) {
  showAddSource.value = false;
  // 创建成功后自动添加展示位置
  try {
    await addDisplayPosition(sourceId, {
      space_id: selectedSpaceId.value!,
      channel_id: selectedChannelId.value,
    });
    toast.success("已添加到当前位置");
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e));
  }
  await refreshSources();
}

watch(selectedSpaceId, () => {
  refreshChannels();
  refreshSources();
});
watch(selectedChannelId, () => refreshSources());
</script>

<template>
  <div class="space-mgmt">
    <div v-if="errorText" class="error-bar"><span>&#9888;</span><span>{{ errorText }}</span></div>

    <!-- 空间 Pill 行 -->
    <SpacePills
      :spaces="spaces"
      :selectedId="selectedSpaceId"
      mode="full"
      @select="onSpaceSelect"
      @changed="refreshSpaces()"
    />

    <!-- 频道 Pill 行 -->
    <ChannelPills
      v-if="selectedSpaceId"
      :channels="channels"
      :selectedId="selectedChannelId"
      mode="full"
      @select="onChannelSelect"
      @changed="refreshChannels()"
    />

    <!-- 空状态 -->
    <EmptyState
      v-if="!selectedSpaceId"
      icon="&#128194;"
      title="暂无空间"
      description="点击「+ 新建空间」创建第一个空间"
    />

    <template v-else>
      <!-- 加载中 -->
      <div v-if="loading" class="loading-state">加载中...</div>

      <!-- Source 列表 -->
      <div v-else-if="sources.length === 0" class="empty-section">
        <EmptyState
          icon="&#128225;"
          title="当前位置暂无信息源"
          :description="selectedChannelId ? '在该频道下添加信息源' : '在空间根节点添加信息源'"
        />
      </div>

      <div v-else class="source-list">
        <SourceCard
          v-for="s in sources"
          :key="s.id"
          :source="s"
          :currentSpaceId="selectedSpaceId"
          :currentChannelId="selectedChannelId"
          @refresh="refreshSources()"
          @remove="onRemovePosition"
        />
      </div>

      <!-- 添加信息源 -->
      <div class="add-section">
        <button
          v-if="!showAddSource"
          class="btn add-btn"
          @click="showAddSource = true"
        >+ 添加信息源</button>
        <SourceCreateForm
          v-else
          entryPoint="space_management"
          :targetSpaceId="selectedSpaceId"
          :targetChannelId="selectedChannelId"
          @created="onSourceCreated"
          @cancel="showAddSource = false"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.space-mgmt {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.source-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.add-section {
  margin-top: 4px;
}
.add-btn {
  width: 100%;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  border: 1px dashed var(--accent);
  background: var(--card);
  color: var(--accent);
  cursor: pointer;
}
.add-btn:hover {
  background: var(--accent-light);
}
.loading-state {
  text-align: center;
  padding: 24px;
  color: var(--text-muted);
  font-size: 13px;
}
.empty-section {
  margin: 12px 0;
}
.error-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--danger-light);
  border: 1px solid rgba(231,76,60,0.2);
  color: #991b1b;
  font-size: 12px;
}
</style>
