<script setup lang="ts">
import { ref, watch } from "vue";
import type { SourceWithPositions, UUID } from "@/lib/types";
import { listSources, addDisplayPosition } from "@/lib/api";
import BaseModal from "@/components/base/BaseModal.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import { useToast } from "@/composables/useToast";

const props = defineProps<{
  spaceId: UUID;
  channelId: UUID | null;
  spaceName: string;
  channelName: string;
}>();

const emit = defineEmits<{
  close: [];
  added: [];
  createNew: [];
}>();

const toast = useToast();
const keyword = ref("");
const results = ref<SourceWithPositions[]>([]);
const loading = ref(false);
const adding = ref<UUID | null>(null);

let timer: ReturnType<typeof setTimeout> | null = null;

async function doSearch() {
  loading.value = true;
  try {
    const res = await listSources({ search: keyword.value.trim() || undefined, limit: 20 });
    results.value = res.sources || [];
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e));
    results.value = [];
  } finally {
    loading.value = false;
  }
}

watch(keyword, () => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(doSearch, 250);
});

async function onAdd(s: SourceWithPositions) {
  adding.value = s.id;
  try {
    await addDisplayPosition(s.id, { space_id: props.spaceId, channel_id: props.channelId });
    toast.success(`已添加「${s.display_name}」到当前位置`);
    emit("added");
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e));
  } finally {
    adding.value = null;
  }
}

function typeLabel(t: string) { return t === "x_twitter" ? "X/Twitter" : "RSS"; }
function availText(s: string) {
  return s === "normal" ? "正常" : s === "source_error" ? "异常" : s === "awaiting_repair" ? "待修复" : s === "source_removed" ? "已移除" : s;
}

doSearch();
</script>

<template>
  <BaseModal :title="`添加信息源到 ${spaceName} · ${channelName}`" @close="emit('close')">
    <p class="hint">先从信息源库中搜索已有 Source，未找到再新建</p>

    <input
      class="form-f search-input"
      v-model="keyword"
      placeholder="搜索已有信息源…"
      autofocus
    />

    <div class="result-box">
      <div v-if="loading" class="result-empty">加载中…</div>
      <div v-else-if="results.length === 0" class="result-empty">搜索无结果？</div>
      <template v-else>
        <div v-for="s in results" :key="s.id" class="result-row">
          <div class="result-info">
            <span class="result-name">{{ s.display_name }}</span>
            <span class="result-meta">{{ typeLabel(s.type) }} · {{ s.domain_tags?.[0] || '—' }} · {{ availText(s.availability_status) }}</span>
          </div>
          <BaseButton size="xs" variant="primary" :disabled="adding === s.id" @click="onAdd(s)">
            {{ adding === s.id ? '添加中…' : '添加' }}
          </BaseButton>
        </div>
      </template>
    </div>

    <BaseButton block @click="emit('createNew')">＋ 新建信息源</BaseButton>

    <template #footer>
      <BaseButton @click="emit('close')">取消</BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.hint {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0 0 12px 0;
}
.search-input { margin-bottom: 10px; }
.result-box {
  border: 1px solid var(--border-light);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 10px;
  max-height: 280px;
  overflow-y: auto;
}
.result-row {
  padding: 10px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-light);
  gap: 10px;
}
.result-row:last-child { border-bottom: none; }
.result-info { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; }
.result-name { font-size: 13px; font-weight: 600; color: var(--text); }
.result-meta { font-size: 11px; color: var(--text-muted); }
.result-empty {
  padding: 14px;
  text-align: center;
  font-size: 12px;
  color: var(--text-muted);
}
</style>
