<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { SourceWithPositions, SourceListParams, Space, UUID } from "@/lib/types";
import { listSources, listSpaces, deleteSource, getSourceDeleteImpact } from "@/lib/api";
import SearchFilterBar from "@/components/SearchFilterBar.vue";
import SourceTable from "@/components/SourceTable.vue";
import SourceCreateForm from "@/components/SourceCreateForm.vue";
import Pagination from "@/components/Pagination.vue";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog.vue";
import { useToast } from "@/composables/useToast";
import { useRouter } from "vue-router";

// v0.5: 信息源库 Tab
// 四层结构：操作栏 + SearchFilterBar + SourceTable + Pagination

const toast = useToast();
const router = useRouter();

const sources = ref<SourceWithPositions[]>([]);
const spaces = ref<Space[]>([]);
const total = ref(0);
const loading = ref(false);
const errorText = ref<string | null>(null);

// 分页/筛选/搜索状态
const currentPage = ref(1);
const pageSize = ref(20);
const searchQuery = ref("");
const filters = ref<Record<string, string>>({});

// 新建表单
const showCreateForm = ref(false);

// 删除确认
const deleteTarget = ref<{ id: string; name: string } | null>(null);
const deleteImpact = ref<{ affectedPositions: number; preservedNews: number; additionalInfo?: string }>({
  affectedPositions: 0,
  preservedNews: 0,
});
const showDeleteDialog = ref(false);

onMounted(async () => {
  try {
    spaces.value = await listSpaces();
  } catch { /* space 加载失败不影响列表 */ }
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

function onSearch(q: string) {
  searchQuery.value = q;
  currentPage.value = 1;
  loadSources();
}

function onFilter(f: Record<string, string>) {
  filters.value = f;
  currentPage.value = 1;
  loadSources();
}

function onPageChange(page: number) {
  currentPage.value = page;
  loadSources();
}

function onPageSizeChange(size: number) {
  pageSize.value = size;
  currentPage.value = 1;
  loadSources();
}

function viewSource(id: string) {
  router.push(`/sources/${id}`);
}

function editSource(id: string) {
  router.push(`/sources/${id}`);
}

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
    // 删除预览失败不阻塞
    deleteImpact.value = { affectedPositions: sources.value.find(x => x.id === id)?.display_positions?.length || 0, preservedNews: sources.value.find(x => x.id === id)?.total_news_count || 0 };
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
</script>

<template>
  <div class="source-library">
    <div v-if="errorText" class="error-bar"><span>&#9888;</span><span>{{ errorText }}</span></div>

    <!-- 操作栏 -->
    <div class="toolbar">
      <button v-if="!showCreateForm" class="btn primary" @click="showCreateForm = true">+ 新建信息源</button>
      <span class="total-info muted">共 {{ total }} 个信息源</span>
    </div>

    <!-- 新建表单 -->
    <SourceCreateForm
      v-if="showCreateForm"
      entryPoint="library"
      @created="onSourceCreated"
      @cancel="showCreateForm = false"
    />

    <!-- 搜索筛选 -->
    <SearchFilterBar
      :spaces="spaces.map(s => ({ id: s.id, name: s.name }))"
      @search="onSearch"
      @filter="onFilter"
    />

    <!-- 加载/表格 -->
    <div v-if="loading" class="loading-state">加载中…</div>
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
.source-library {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}
.btn {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid var(--border);
  background: var(--card);
  cursor: pointer;
}
.btn.primary {
  background: var(--accent);
  color: #FFF;
  border-color: var(--accent);
}
.total-info {
  font-size: 12px;
  margin-left: auto;
}
.loading-state {
  text-align: center;
  padding: 24px;
  color: var(--text-muted);
  font-size: 13px;
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
