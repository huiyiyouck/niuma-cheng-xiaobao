<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import {
  listSpaces, createSpace, listSources, listChannelSources,
  bindSource, updateChannelSource, listAlerts
} from "@/lib/api";
import type { ChannelSpace, ChannelSourceWithSource, Source, Alert, UUID } from "@/lib/types";
import SpaceSelector from "@/components/SpaceSelector.vue";
import ChannelCard from "@/components/ChannelCard.vue";
import AlertList from "@/components/AlertList.vue";
import CreateSpaceModal from "@/components/CreateSpaceModal.vue";
import BindSourceModal from "@/components/BindSourceModal.vue";
import EditChannelModal from "@/components/EditChannelModal.vue";

const spaces = ref<ChannelSpace[]>([]);
const sources = ref<Source[]>([]);
const bindings = ref<ChannelSourceWithSource[]>([]);
const alerts = ref<Alert[]>([]);
const selectedSpaceId = ref<UUID | null>(null);
const errorText = ref<string | null>(null);

const showCreateSpace = ref(false);
const showBindSource = ref(false);
const editingChannel = ref<ChannelSourceWithSource | null>(null);

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
    alerts.value = await listAlerts(selectedSpaceId.value, 50);
  } catch (e) { errorText.value = e instanceof Error ? e.message : String(e); }
}

async function onCreateSpace(name: string, desc: string) {
  await createSpace({ name, description: desc || undefined });
  showCreateSpace.value = false;
  await refreshAll();
}

async function onBindSource(sourceId: UUID, enabled: boolean, everySeconds: number, maxItems: number) {
  await bindSource(selectedSpaceId.value!, {
    source_id: sourceId, enabled,
    fetch_policy: { schedule: { every_seconds: everySeconds }, budget: { max_items_per_run: maxItems } },
  });
  showBindSource.value = false;
  await refreshSpaceData();
}

async function onToggleChannel(cs: ChannelSourceWithSource) {
  await updateChannelSource(cs.channel_source.id, { enabled: !cs.channel_source.enabled });
  await refreshSpaceData();
}

async function onEditChannel(enabled: boolean, everySeconds: number, maxItems: number) {
  if (!editingChannel.value) return;
  await updateChannelSource(editingChannel.value.channel_source.id, {
    enabled,
    fetch_policy: { schedule: { every_seconds: everySeconds }, budget: { max_items_per_run: maxItems } },
  });
  editingChannel.value = null;
  await refreshSpaceData();
}

watch(selectedSpaceId, () => refreshSpaceData());
onMounted(refreshAll);
</script>

<template>
  <div class="page">
    <div v-if="errorText" class="error">{{ errorText }}</div>
    <SpaceSelector :spaces="spaces" :selectedId="selectedSpaceId" @select="(id) => selectedSpaceId = id" @create="showCreateSpace = true" />

    <div class="section-card">
      <div class="section-top">
        <div class="section-title">📡 已绑定的渠道</div>
        <button class="btn primary" style="padding:6px 14px;font-size:12px;border-radius:10px" @click="showBindSource = true">+ 绑定新渠道</button>
      </div>
      <div v-if="bindings.length === 0" class="muted" style="padding:10px 0">暂无绑定</div>
      <ChannelCard
        v-for="cs in bindings" :key="cs.channel_source.id" :cs="cs"
        @toggle="onToggleChannel(cs)"
        @edit="editingChannel = cs"
      />
    </div>

    <AlertList :alerts="alerts" />

    <CreateSpaceModal v-if="showCreateSpace" @close="showCreateSpace = false" @submit="onCreateSpace" />
    <BindSourceModal v-if="showBindSource" :sources="sources" @close="showBindSource = false" @submit="onBindSource" />
    <EditChannelModal v-if="editingChannel" :cs="editingChannel" @close="editingChannel = null" @submit="onEditChannel" />
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 16px; }
.section-card {
  background: var(--card); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-soft);
}
.section-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.section-title { font-weight: 900; font-size: 15px; }
.error { padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(239,68,68,.25); background: rgba(239,68,68,.06); color: #991b1b; font-size: 13px; }
</style>
