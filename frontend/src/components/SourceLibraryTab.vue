<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { SourceWithPositions, SourceListParams, Space, UUID } from "@/lib/types";
import { listSources, listSpaces, deleteSource, getSourceDeleteImpact, syncXRules } from "@/lib/api";
import SourceTable from "@/components/SourceTable.vue";
import SourceCreateForm from "@/components/SourceCreateForm.vue";
import Pagination from "@/components/Pagination.vue";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog.vue";
import ErrorBar from "@/components/base/ErrorBar.vue";
import LoadingState from "@/components/base/LoadingState.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import FilterSelect from "@/components/base/FilterSelect.vue";
import { useToast } from "@/composables/useToast";
import { useRouter } from "vue-router";

const toast = useToast();
const router = useRouter();

const sources = ref<SourceWithPositions[]>([]);
const spaces = ref<Space[]>([]);
const total = ref(0);
const loading = ref(false);
const errorText = ref<string | null>(null);

const currentPage = ref(1);
const pageSize = ref(20);
const searchQuery = ref("");
const filters = ref<Record<string, string>>({
  type: "", availability_status: "", operational_status: "",
  domain_tag: "", source_role: "", attention_level: "", space_id: "",
});

const showCreateForm = ref(false);

const deleteTarget = ref<{ id: string; name: string } | null>(null);
const deleteImpact = ref<{ affectedPositions: number; preservedNews: number; additionalInfo?: string }>({
  affectedPositions: 0,
  preservedNews: 0,
});
const showDeleteDialog = ref(false);

onMounted(async () => {
  try { spaces.value = await listSpaces(); } catch { /* 不影响 */ }
  await loadSources();
});

async function loadSources() {
  loading.value = true;
  errorText.value = null;
  try {
    const params: SourceListParams = {
      limit: pageSize.value,
      offset: (currentPage.value - 1) * pageSize.value,
    };
    if (searchQuery.value) params.search = searchQuery.value;
    if (filters.value.type) params.type = filters.value.type as any;
    if (filters.value.availability_status) params.availability_status = filters.value.availability_status as any;
    if (filters.value.operational_status) params.operational_status = filters.value.operational_status as any;
    if (filters.value.domain_tag) params.domain_tag = filters.value.domain_tag as any;
    if (filters.value.source_role) params.source_role = filters.value.source_role as any;
    if (filters.value.attention_level) params.attention_level = filters.value.attention_level as any;
    if (filters.value.space_id) params.space_id = filters.value.space_id as any;

    const res = await listSources(params);
    sources.value = res.sources;
    total.value = res.total;
  } catch (e) {
    errorText.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

function applyFilter(key: string, value: string) {
  filters.value = { ...filters.value, [key]: value };
  currentPage.value = 1;
  loadSources();
}

function onPageChange(page: number) { currentPage.value = page; loadSources(); }
function onPageSizeChange(size: number) { pageSize.value = size; currentPage.value = 1; loadSources(); }

function viewSource(id: string) { router.push(`/sources/${id}`); }
function editSource(id: string) { router.push(`/sources/${id}`); }

async function prepareDelete(id: string) {
  const s = sources.value.find(x => x.id === id);
  if (!s) return;
  try {
    const impact = await getSourceDeleteImpact(id);
    deleteImpact.value = {
      affectedPositions: impact.affected_positions,
      preservedNews: impact.preserved_news,
      additionalInfo: impact.additional_info,
    };
  } catch {
    deleteImpact.value = {
      affectedPositions: s.display_positions?.length || 0,
      preservedNews: s.total_news_count || 0,
    };
  }
  deleteTarget.value = { id, name: s.display_name };
  showDeleteDialog.value = true;
}

async function doDelete() {
  if (!deleteTarget.value) return;
  try {
    await deleteSource(deleteTarget.value.id);
    toast.success("信息源已删除，历史新闻已保留");
    showDeleteDialog.value = false;
    deleteTarget.value = null;
    await loadSources();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e));
  }
}

async function onSourceCreated(sourceId: string) {
  showCreateForm.value = false;
  toast.success("信息源已创建");
  await loadSources();
  router.push(`/sources/${sourceId}`);
}

const xSyncing = ref(false);
async function onSyncXRules() {
  xSyncing.value = true;
  try {
    const r = await syncXRules();
    toast.success(`X 规则同步完成：+${r.added} ~${r.updated} -${r.removed} ↻${r.restored}`);
    await loadSources();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e));
  } finally {
    xSyncing.value = false;
  }
}

const TYPE_OPTS = [
  { value: "", label: "类型：全部" },
  { value: "x_twitter", label: "X/Twitter" },
  { value: "rss", label: "RSS" },
];
const AVAIL_OPTS = [
  { value: "", label: "可用性：全部" },
  { value: "normal", label: "正常" },
  { value: "needs_fix", label: "待修复" },
  { value: "source_error", label: "来源异常" },
  { value: "removed", label: "已移除" },
];
const OP_OPTS = [
  { value: "", label: "运行状态：全部" },
  { value: "fetching", label: "抓取中" },
  { value: "stopped", label: "已停止" },
];
const DOMAIN_OPTS = [
  { value: "", label: "领域：全部" },
  { value: "AI", label: "AI" },
  { value: "财经", label: "财经" },
  { value: "开源", label: "开源" },
  { value: "科技", label: "科技" },
  { value: "其他", label: "其他" },
];
const ROLE_OPTS = [
  { value: "", label: "角色：全部" },
  { value: "official", label: "官方" },
  { value: "media", label: "媒体" },
  { value: "kol", label: "KOL" },
  { value: "community", label: "社区" },
  { value: "research", label: "论文机构" },
  { value: "other", label: "其他" },
];
const LEVEL_OPTS = [
  { value: "", label: "关注：全部" },
  { value: "core", label: "核心" },
  { value: "regular", label: "常规" },
  { value: "observe", label: "观察" },
];
</script>

<template>
  <div class="source-library">
    <ErrorBar :message="errorText" />

    <!-- 操作栏 -->
    <div class="toolbar">
      <BaseButton v-if="!showCreateForm" variant="primary" @click="showCreateForm = true">+ 新建信息源</BaseButton>
      <span class="total-info muted">共 {{ total }} 个信息源</span>
    </div>

    <!-- 新建表单 -->
    <SourceCreateForm
      v-if="showCreateForm"
      entryPoint="library"
      @created="onSourceCreated"
      @cancel="showCreateForm = false"
    />

    <!-- 搜索 -->
    <div class="lib-search-row">
      <div class="lib-search-box">
        <span class="lib-search-icon">🔍</span>
        <input class="lib-search-input" v-model="searchQuery" placeholder="搜索信息源名称、身份、主题、备注…" @keydown.enter="loadSources()" />
      </div>
      <BaseButton variant="primary" @click="showCreateForm = true">新建信息源</BaseButton>
      <BaseButton :disabled="xSyncing" @click="onSyncXRules">{{ xSyncing ? '同步中…' : '同步 X 规则' }}</BaseButton>
    </div>

    <!-- 筛选 -->
    <div class="filter-row">
      <FilterSelect :modelValue="filters.type" :options="TYPE_OPTS" @update:modelValue="v => applyFilter('type', v)" />
      <FilterSelect :modelValue="filters.availability_status" :options="AVAIL_OPTS" @update:modelValue="v => applyFilter('availability_status', v)" />
      <FilterSelect :modelValue="filters.operational_status" :options="OP_OPTS" @update:modelValue="v => applyFilter('operational_status', v)" />
      <FilterSelect :modelValue="filters.domain_tag" :options="DOMAIN_OPTS" @update:modelValue="v => applyFilter('domain_tag', v)" />
      <FilterSelect :modelValue="filters.source_role" :options="ROLE_OPTS" @update:modelValue="v => applyFilter('source_role', v)" />
      <FilterSelect :modelValue="filters.attention_level" :options="LEVEL_OPTS" @update:modelValue="v => applyFilter('attention_level', v)" />
      <FilterSelect
        :modelValue="filters.space_id"
        :options="[{ value: '', label: '空间：全部' }, ...spaces.map(s => ({ value: s.id, label: s.name }))]"
        @update:modelValue="v => applyFilter('space_id', v)"
      />
      <span class="filter-hint">多个筛选为「且」关系，同类多选为「或」</span>
    </div>

    <!-- 加载/表格 -->
    <LoadingState v-if="loading" />
    <SourceTable
      v-else
      :sources="sources"
      @view="viewSource"
      @edit="editSource"
      @delete="prepareDelete"
    />

    <!-- 分页 -->
    <Pagination
      :currentPage="currentPage"
      :totalItems="total"
      :pageSize="pageSize"
      @update:currentPage="onPageChange"
      @update:pageSize="onPageSizeChange"
    />

    <!-- 删除确认 -->
    <DeleteConfirmDialog
      v-if="showDeleteDialog && deleteTarget"
      title="删除信息源"
      :targetName="deleteTarget.name"
      :impact="deleteImpact"
      :confirmName="deleteTarget.name"
      @confirm="doDelete"
      @cancel="showDeleteDialog = false; deleteTarget = null"
    />
  </div>
</template>

<style scoped>
.source-library { display: flex; flex-direction: column; gap: 12px; }
.toolbar { display: flex; align-items: center; gap: 12px; }
.total-info { font-size: 12px; }

.lib-search-row { display: flex; gap: 12px; align-items: center; }
.lib-search-box {
  flex: 1; display: flex; align-items: center;
  background: var(--card); border: 1px solid var(--border);
  border-radius: 10px; padding: 0 14px; transition: .15s;
}
.lib-search-box:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(52,152,219,0.08);
}
.lib-search-icon { font-size: 14px; opacity: 0.4; margin-right: 8px; }
.lib-search-input { flex: 1; border: none; padding: 9px 0; font-size: 13px; outline: none; background: transparent; }

.filter-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.filter-hint { font-size: 10px; color: var(--text-muted); margin-left: auto; white-space: nowrap; }
</style>
