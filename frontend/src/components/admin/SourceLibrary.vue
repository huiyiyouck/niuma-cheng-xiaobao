<script setup lang="ts">
import { ref, computed } from "vue";
import { Plus, RefreshCw, ChevronUp, ChevronDown, Repeat } from "lucide-vue-next";
import { cn } from "@/lib/utils";
import DeleteConfirmDialog from "./DeleteConfirmDialog.vue";
import Badge from "@/components/ui/Badge.vue";
import PlacementTooltip from "@/components/ui/PlacementTooltip.vue";

type SortField = "name" | "type" | "availability" | "lastFetch" | "totalNews";
type SortDirection = "asc" | "desc";

const mockSources = [
  { id: "1", name: "Claude code官方账号", identity: "anthropicai", type: "X/Twitter", tags: ["其他", "帖子"], availability: "normal", isRunning: true, placements: [{ space: "AI", channel: "行业资讯" }, { space: "科技", channel: "全部" }], lastFetch: "2小时前", totalNews: 21 },
  { id: "2", name: "加密狗", identity: "jiamigou", type: "X/Twitter", tags: ["其他", "帖子"], availability: "normal", isRunning: true, placements: [{ space: "AI", channel: "行业资讯" }], lastFetch: "2小时前", totalNews: 19 },
  { id: "3", name: "Solanamobile官方账号", identity: "solanamobile", type: "X/Twitter", tags: ["其他", "帖子"], availability: "normal", isRunning: true, placements: [{ space: "财经", channel: "市场动态" }, { space: "财经", channel: "全部" }], lastFetch: "2小时前", totalNews: 28 },
  { id: "4", name: "OpenAI官方账号", identity: "openai", type: "X/Twitter", tags: ["AI", "其他", "帖子"], availability: "normal", isRunning: true, placements: [{ space: "AI", channel: "模型动态" }], lastFetch: "2小时前", totalNews: 21 },
];

const availabilityLabels: Record<string, string> = { normal: "正常", "needs-fix": "待修复", "source-error": "来源异常", removed: "已移除" };

const searchQuery = ref("");
const typeFilter = ref("all");
const availabilityFilter = ref("all");
const runningFilter = ref("all");
const sortField = ref<SortField>("name");
const sortDirection = ref<SortDirection>("asc");
const currentPage = ref(1);
const perPage = ref(20);
const deleteDialog = ref<{ open: boolean; data: any }>({ open: false, data: null });

const hasActiveFilters = computed(
  () => !!searchQuery.value || typeFilter.value !== "all" || availabilityFilter.value !== "all" || runningFilter.value !== "all",
);

function clearFilters() {
  searchQuery.value = "";
  typeFilter.value = "all";
  availabilityFilter.value = "all";
  runningFilter.value = "all";
}
function handleSort(field: SortField) {
  if (sortField.value === field) sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
  else {
    sortField.value = field;
    sortDirection.value = "asc";
  }
}

const filteredSources = computed(() =>
  mockSources.filter((s) => {
    if (searchQuery.value && !s.name.toLowerCase().includes(searchQuery.value.toLowerCase())) return false;
    if (typeFilter.value !== "all" && s.type !== typeFilter.value) return false;
    if (availabilityFilter.value !== "all" && s.availability !== availabilityFilter.value) return false;
    if (runningFilter.value === "running" && !s.isRunning) return false;
    if (runningFilter.value === "stopped" && s.isRunning) return false;
    return true;
  }),
);
const totalPages = computed(() => Math.max(1, Math.ceil(filteredSources.value.length / perPage.value)));
const paginatedSources = computed(() => filteredSources.value.slice((currentPage.value - 1) * perPage.value, currentPage.value * perPage.value));

function tagVariant(tag: string) {
  return tag === "AI" ? "info" : tag === "帖子" ? "warning" : "default";
}
function availVariant(a: string) {
  return a === "normal" ? "success" : a === "needs-fix" ? "warning" : a === "source-error" ? "error" : "default";
}
const columns: { field: SortField; label: string }[] = [
  { field: "name", label: "信息源" },
  { field: "type", label: "类型" },
];
</script>

<template>
  <div class="p-6">
    <!-- Search and Actions -->
    <div class="flex items-center gap-3 mb-4">
      <div class="flex-1 relative">
        <input v-model="searchQuery" type="text" placeholder="搜索信息源名称、身份、主题、备注..." class="w-full pl-3 pr-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <button class="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 whitespace-nowrap"><Plus class="h-4 w-4 inline mr-2" />新建信息源</button>
      <button class="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-accent whitespace-nowrap"><RefreshCw class="h-4 w-4 inline mr-2" />刷新</button>
      <button class="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-accent whitespace-nowrap"><Repeat class="h-4 w-4 inline mr-2" />同步 X 规则</button>
    </div>

    <!-- Filters -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <span class="text-sm text-muted-foreground whitespace-nowrap">类型:</span>
          <select v-model="typeFilter" class="px-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="all">全部</option><option value="RSS">RSS</option><option value="X/Twitter">X/Twitter</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm text-muted-foreground whitespace-nowrap">可用性:</span>
          <select v-model="availabilityFilter" class="px-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="all">全部</option><option value="normal">正常</option><option value="needs-fix">待修复</option><option value="source-error">来源异常</option><option value="removed">已移除</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm text-muted-foreground whitespace-nowrap">运行状态:</span>
          <select v-model="runningFilter" class="px-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="all">全部</option><option value="running">抓取中</option><option value="stopped">已停止</option>
          </select>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-sm text-muted-foreground">多个筛选为「且」关系，同类多选为「或」</span>
        <button v-if="hasActiveFilters" @click="clearFilters" class="text-sm text-primary hover:underline px-2 py-0.5 rounded hover:bg-primary/10">[重置]</button>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-card border border-border rounded-lg overflow-hidden">
      <table class="w-full">
        <thead class="bg-muted/30 border-b border-border">
          <tr>
            <th v-for="col in columns" :key="col.field" @click="handleSort(col.field)" class="text-left px-4 py-3 text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/50">
              {{ col.label }}
              <ChevronUp v-if="sortField === col.field && sortDirection === 'asc'" class="h-4 w-4 inline" />
              <ChevronDown v-else-if="sortField === col.field" class="h-4 w-4 inline" />
            </th>
            <th class="text-left px-4 py-3 text-sm font-medium text-muted-foreground">标签</th>
            <th @click="handleSort('availability')" class="text-left px-4 py-3 text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/50">
              可用性
              <ChevronUp v-if="sortField === 'availability' && sortDirection === 'asc'" class="h-4 w-4 inline" />
              <ChevronDown v-else-if="sortField === 'availability'" class="h-4 w-4 inline" />
            </th>
            <th class="text-left px-4 py-3 text-sm font-medium text-muted-foreground">运行</th>
            <th class="text-left px-4 py-3 text-sm font-medium text-muted-foreground">使用位置</th>
            <th @click="handleSort('lastFetch')" class="text-left px-4 py-3 text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/50">
              最近抓取
              <ChevronUp v-if="sortField === 'lastFetch' && sortDirection === 'asc'" class="h-4 w-4 inline" />
              <ChevronDown v-else-if="sortField === 'lastFetch'" class="h-4 w-4 inline" />
            </th>
            <th @click="handleSort('totalNews')" class="text-left px-4 py-3 text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/50">
              历史新闻
              <ChevronUp v-if="sortField === 'totalNews' && sortDirection === 'asc'" class="h-4 w-4 inline" />
              <ChevronDown v-else-if="sortField === 'totalNews'" class="h-4 w-4 inline" />
            </th>
            <th class="text-left px-4 py-3 text-sm font-medium text-muted-foreground">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="paginatedSources.length === 0">
            <td colspan="9" class="text-center py-12">
              <div class="text-muted-foreground">{{ hasActiveFilters ? "没有找到匹配的信息源" : "暂无信息源" }}</div>
              <button v-if="hasActiveFilters" @click="clearFilters" class="mt-2 text-sm text-primary hover:underline">清除筛选条件</button>
            </td>
          </tr>
          <tr v-for="source in paginatedSources" :key="source.id" class="border-b border-border hover:bg-muted/20">
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <RouterLink :to="`/sources/${source.id}`" class="font-medium hover:text-primary hover:underline">{{ source.name }}</RouterLink>
                <span v-if="source.type === 'X/Twitter'" class="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">X 同步</span>
              </div>
              <div class="text-xs text-muted-foreground mt-0.5">{{ source.identity }}</div>
            </td>
            <td class="px-4 py-3"><span class="text-sm text-primary">{{ source.type }}</span></td>
            <td class="px-4 py-3">
              <div class="flex gap-1 flex-wrap">
                <Badge v-for="tag in source.tags" :key="tag" :variant="tagVariant(tag)">{{ tag }}</Badge>
              </div>
            </td>
            <td class="px-4 py-3"><Badge :variant="availVariant(source.availability)">{{ availabilityLabels[source.availability] }}</Badge></td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-1.5">
                <span :class="cn('h-2 w-2 rounded-full', source.isRunning ? 'bg-green-500' : 'bg-gray-400')" />
                <span class="text-sm">{{ source.isRunning ? "抓取中" : "已停止" }}</span>
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="text-sm">
                <span v-if="source.placements.length === 0" class="text-muted-foreground">未使用</span>
                <PlacementTooltip v-else :placements="source.placements">
                  <span class="text-primary hover:underline cursor-pointer">{{ source.placements.length }} 个位置（{{ source.placements.length }} 启用）</span>
                </PlacementTooltip>
              </div>
            </td>
            <td class="px-4 py-3 text-sm">{{ source.lastFetch }}</td>
            <td class="px-4 py-3 text-sm text-primary">{{ source.totalNews }}</td>
            <td class="px-4 py-3"><RouterLink :to="`/sources/${source.id}`" class="text-sm text-primary hover:underline">详情</RouterLink></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="flex items-center justify-between mt-4">
      <div class="flex items-center gap-2 text-sm text-muted-foreground">
        <span>共 {{ filteredSources.length }} 条</span>
        <button @click="currentPage = Math.max(1, currentPage - 1)" :disabled="currentPage === 1" class="px-3 py-1 bg-background border border-border rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed">上一页</button>
        <span class="px-3 py-1 bg-primary text-primary-foreground rounded">{{ currentPage }}</span>
        <button @click="currentPage = Math.min(totalPages, currentPage + 1)" :disabled="currentPage === totalPages" class="px-3 py-1 bg-background border border-border rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed">下一页</button>
      </div>
      <select v-model.number="perPage" @change="currentPage = 1" class="px-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring">
        <option :value="20">20 条/页</option><option :value="50">50 条/页</option><option :value="100">100 条/页</option>
      </select>
    </div>

    <DeleteConfirmDialog :open="deleteDialog.open" :data="deleteDialog.data" @close="deleteDialog.open = false" @confirm="deleteDialog.open = false" />
  </div>
</template>
