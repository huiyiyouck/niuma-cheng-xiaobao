<script setup lang="ts">
import { ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import type { ChannelSpace, UUID, NewsSort } from "@/lib/types";

const props = defineProps<{
  spaces: ChannelSpace[];
  selectedId: UUID | null;
  minScore: number;
  sortBy: NewsSort;
}>();

const emit = defineEmits<{
  select: [id: UUID | null];
  changeScore: [val: number];
  changeSort: [val: NewsSort];
  search: [q: string];
}>();

const searchInput = ref("");
const debouncedSearch = useDebounceFn((q: string) => emit("search", q), 300);
watch(searchInput, (v) => debouncedSearch(v));
</script>

<template>
  <div class="filter-bar">
    <div class="pills">
      <button class="pill" :class="{ active: selectedId == null }" @click="emit('select', null)">全部</button>
      <button
        v-for="s in spaces" :key="s.id"
        class="pill"
        :class="{ active: selectedId === s.id }"
        @click="emit('select', s.id)"
      >{{ s.name }}</button>
    </div>
    <div class="filter-right">
      <input
        class="search-input"
        v-model="searchInput"
        placeholder="搜索新闻…"
        @keydown.enter="emit('search', searchInput)"
        @change="emit('search', searchInput)"
      />
      <span class="sep"></span>
      <label class="score-filter">
        评分 ≥ <strong>{{ minScore.toFixed(1) }}</strong>
        <input type="range" min="0" max="10" step="0.5" :value="minScore"
          @input="emit('changeScore', parseFloat(($event.target as HTMLInputElement).value))" />
      </label>
      <select
        class="sort-select"
        :value="sortBy"
        @change="emit('changeSort', ($event.target as HTMLSelectElement).value as NewsSort)"
      >
        <option value="published_desc">最新优先</option>
        <option value="score_desc">最高评分</option>
        <option value="score_asc">最低评分</option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.filter-bar {
  background: var(--card); border: 1px solid var(--border-light);
  border-radius: 12px; padding: 10px 16px; margin-bottom: 14px;
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  box-shadow: var(--shadow-soft);
}
.pills { display: flex; gap: 6px; flex-wrap: wrap; }
.pill {
  padding: 5px 12px; border-radius: 20px; font-size: 11px;
  font-weight: 600; border: 1px solid var(--border);
  background: var(--card); color: var(--text-secondary); cursor: pointer;
  transition: all 0.15s;
}
.pill:hover { border-color: var(--accent); color: var(--accent); }
.pill.active { background: var(--accent); color: #FFF; border-color: var(--accent); }
.filter-right { margin-left: auto; display: flex; align-items: center; gap: 10px; }
.search-input {
  padding: 6px 10px; border-radius: 8px; border: 1px solid var(--border);
  font-size: 11px; min-width: 150px;
}
.search-input:focus { outline: none; border-color: var(--accent); }
.sep { width: 1px; height: 20px; background: var(--border); }
.score-filter { font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; }
.score-filter input { width: 80px; accent-color: var(--accent); }
.sort-select { padding: 6px 10px; border-radius: 8px; border: 1px solid var(--border); font-size: 11px; min-width: 110px; }
</style>
