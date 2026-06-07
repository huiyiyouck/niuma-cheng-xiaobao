<script setup lang="ts">
import { ref, watch } from "vue";
import type { SourceWithPositions, UUID } from "@/lib/types";
import { listSources, addDisplayPosition } from "@/lib/api";
import BaseModal from "@/components/base/BaseModal.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import TypeBadge from "@/components/base/TypeBadge.vue";
import { useToast } from "@/composables/useToast";

const props = defineProps<{
  spaceId: UUID;
  channelId: UUID | null;
  spaceName: string;
  channelName: string;
  existingSourceIds?: UUID[];
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

const existingIds = new Set(props.existingSourceIds || []);

function isAlreadyAdded(id: string) { return existingIds.has(id); }

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
    await addDisplayPosition({ source_id: s.id, space_id: props.spaceId, channel_id: props.channelId });
    existingIds.add(s.id); // 立即标记为已添加
    toast.success(`已添加「${s.display_name}」到当前位置`);
    emit("added");
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e));
  } finally {
    adding.value = null;
  }
}

function availText(s: string) {
  return s === "normal" ? "正常" : s === "source_error" ? "异常" : s === "awaiting_repair" ? "待修复" : s === "source_removed" ? "已移除" : s;
}

doSearch();
</script>

<template>
  <BaseModal :title="`添加信息源到 ${spaceName} · ${channelName}`" @close="emit('close')">
    <div class="search-panel">
      <!-- 搜索框 -->
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input class="search-input" v-model="keyword" placeholder="搜索信息源名称、身份…" autofocus />
      </div>

      <!-- 结果列表 -->
      <div class="result-list">
        <div v-if="loading" class="result-state">加载中…</div>
        <div v-else-if="results.length === 0 && keyword" class="result-state">无匹配结果</div>

        <template v-for="s in results" :key="s.id">
          <div class="result-row" :class="{ 'is-added': isAlreadyAdded(s.id) }">
            <div class="result-left">
              <span class="result-name">{{ s.display_name }}</span>
              <span class="result-identity">{{ s.source_identity }}</span>
            </div>
            <div class="result-center">
              <TypeBadge :type="s.type" />
              <span class="result-domain" v-if="s.domain_tags?.[0]">{{ s.domain_tags[0] }}</span>
              <span class="result-status" :class="s.availability_status">{{ availText(s.availability_status) }}</span>
            </div>
            <div class="result-right">
              <BaseButton v-if="isAlreadyAdded(s.id)" size="xs" disabled>✓ 已添加</BaseButton>
              <BaseButton v-else size="xs" variant="primary" :disabled="adding === s.id" @click="onAdd(s)">
                {{ adding === s.id ? '…' : '＋ 添加' }}
              </BaseButton>
            </div>
          </div>
        </template>

        <!-- 新建入口 -->
        <div class="result-row result-row--new" @click="emit('createNew')">
          <div class="result-left">
            <span class="result-name new-name">＋ 新建信息源</span>
            <span class="result-identity">在信息源库中没有找到？创建一个新的</span>
          </div>
          <div class="result-right">
            <BaseButton size="xs" variant="primary">新建</BaseButton>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <BaseButton @click="emit('close')">关闭</BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.search-panel { display: flex; flex-direction: column; gap: 10px; }

.search-box {
  display: flex; align-items: center;
  background: var(--card); border: 1px solid var(--border);
  border-radius: 10px; padding: 0 14px; transition: .15s;
}
.search-box:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(52,152,219,0.08); }
.search-icon { font-size: 14px; opacity: 0.4; margin-right: 8px; }
.search-input {
  flex: 1; border: none; padding: 10px 0; font-size: 13px;
  outline: none; background: transparent; color: var(--text);
}

.result-list {
  border: 1px solid var(--border-light); border-radius: 10px;
  overflow: hidden; max-height: 340px; overflow-y: auto;
}
.result-state { padding: 24px; text-align: center; font-size: 13px; color: var(--text-muted); }

.result-row {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; border-bottom: 1px solid var(--border-light);
  transition: background 0.1s;
}
.result-row:last-of-type { border-bottom: none; }
.result-row:hover:not(.is-added) { background: var(--hover-bg); }
.result-row.is-added { opacity: 0.45; pointer-events: none; }
.result-row--new {
  cursor: pointer; border-top: 1px solid var(--border);
  background: var(--accent-light);
}
.result-row--new:hover { background: #E8F4FD; }

.result-left { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.result-name { font-size: 13px; font-weight: 700; color: var(--text); }
.result-identity {
  font-size: 11px; color: var(--text-muted);
  font-family: var(--font-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.new-name { color: var(--accent); }

.result-center { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }
.result-domain {
  font-size: 10px; padding: 1px 6px; border-radius: 8px;
  background: var(--accent-light); color: var(--accent); font-weight: 600;
}
.result-status {
  font-size: 10px; font-weight: 600;
  padding: 1px 6px; border-radius: 8px;
}
.result-status.normal { background: var(--success-light); color: var(--success); }
.result-status.source_error,
.result-status.awaiting_repair { background: var(--warning-light); color: var(--warning); }
.result-status.source_removed { background: #F1F5F9; color: var(--text-muted); }

.result-right { flex-shrink: 0; }
</style>
