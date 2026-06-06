<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import type { SourceType, AvailabilityStatus, OperationalStatus, DomainTag, SourceRole, AttentionLevel } from "@/lib/types";

// v0.5: 信息源库搜索筛选栏
// 搜索框 + 多行筛选（类型/可用性/运行/领域/角色/关注/空间）

const props = defineProps<{
  spaces: { id: string; name: string }[];
}>();

const emit = defineEmits<{
  search: [q: string];
  filter: [filters: Record<string, string>];
}>();

const searchInput = ref("");
const debouncedSearch = useDebounceFn((q: string) => emit("search", q), 300);
watch(searchInput, (v) => debouncedSearch(v));

const filters = ref<Record<string, string>>({
  type: "",
  availability_status: "",
  operational_status: "",
  domain_tag: "",
  source_role: "",
  attention_level: "",
  space_id: "",
});

function setFilter(key: string, value: string) {
  filters.value[key] = value;
  emit("filter", { ...filters.value });
}

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "全部类型" },
  { value: "x_twitter", label: "X/Twitter" },
  { value: "rss", label: "RSS" },
];

const AVAILABILITY_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "全部可用性" },
  { value: "normal", label: "正常" },
  { value: "awaiting_repair", label: "待修复" },
  { value: "source_error", label: "来源异常" },
  { value: "source_removed", label: "来源已移除" },
];

const OPERATIONAL_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "全部运行" },
  { value: "fetching", label: "抓取中" },
  { value: "stopped", label: "已停止" },
  { value: "unused", label: "未使用" },
];

const DOMAIN_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "全部领域" },
  { value: "AI", label: "AI" },
  { value: "财经", label: "财经" },
  { value: "开源", label: "开源" },
  { value: "科技", label: "科技" },
  { value: "其他", label: "其他" },
];

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "全部角色" },
  { value: "official", label: "官方" },
  { value: "media", label: "媒体" },
  { value: "kol", label: "KOL" },
  { value: "community", label: "社区" },
  { value: "paper_institute", label: "论文机构" },
  { value: "other", label: "其他" },
];

const ATTENTION_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "全部关注" },
  { value: "core", label: "核心" },
  { value: "regular", label: "常规" },
  { value: "observe", label: "观察" },
];

const activeFilterCount = computed(() => {
  let count = 0;
  for (const v of Object.values(filters.value)) {
    if (v) count++;
  }
  return count;
});
</script>

<template>
  <div class="search-filter-bar">
    <!-- 搜索框行 -->
    <div class="search-row">
      <input
        class="input search-input"
        v-model="searchInput"
        placeholder="搜索名称、来源身份、内容主题、备注…"
        @keydown.enter="emit('search', searchInput)"
      />
      <span class="filter-hint muted">
        {{ activeFilterCount > 0 ? `筛选条件：${activeFilterCount} 个 (AND 逻辑)` : '' }}
      </span>
    </div>

    <!-- 筛选行 -->
    <div class="filter-rows">
      <!-- 第 1 行：类型 + 可用性 + 运行 -->
      <div class="filter-row">
        <select class="select filter-select" :value="filters.type" @change="setFilter('type', ($event.target as HTMLSelectElement).value)">
          <option v-for="o in TYPE_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <select class="select filter-select" :value="filters.availability_status" @change="setFilter('availability_status', ($event.target as HTMLSelectElement).value)">
          <option v-for="o in AVAILABILITY_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <select class="select filter-select" :value="filters.operational_status" @change="setFilter('operational_status', ($event.target as HTMLSelectElement).value)">
          <option v-for="o in OPERATIONAL_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>

      <!-- 第 2 行：领域 + 角色 + 关注 + 空间 -->
      <div class="filter-row">
        <select class="select filter-select" :value="filters.domain_tag" @change="setFilter('domain_tag', ($event.target as HTMLSelectElement).value)">
          <option v-for="o in DOMAIN_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <select class="select filter-select" :value="filters.source_role" @change="setFilter('source_role', ($event.target as HTMLSelectElement).value)">
          <option v-for="o in ROLE_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <select class="select filter-select" :value="filters.attention_level" @change="setFilter('attention_level', ($event.target as HTMLSelectElement).value)">
          <option v-for="o in ATTENTION_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <select class="select filter-select" :value="filters.space_id" @change="setFilter('space_id', ($event.target as HTMLSelectElement).value)">
          <option value="">全部空间</option>
          <option v-for="s in spaces" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-filter-bar {
  background: var(--card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: var(--shadow-soft);
}
.search-row {
  display: flex;
  gap: 10px;
  align-items: center;
}
.search-input {
  flex: 1;
  max-width: 480px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  font-size: 13px;
  outline: none;
}
.search-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(52,152,219,0.08);
}
.filter-hint {
  font-size: 11px;
  flex-shrink: 0;
}
.filter-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.filter-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.filter-select {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  font-size: 12px;
  background: var(--card);
  outline: none;
  min-width: 130px;
}
.filter-select:focus {
  border-color: var(--accent);
}
</style>
