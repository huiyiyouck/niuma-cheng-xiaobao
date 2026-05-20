<script setup lang="ts">
import type { ChannelSpace, UUID } from "@/lib/types";

defineProps<{
  spaces: ChannelSpace[];
  selectedId: UUID | null;
  minScore: number;
}>();

const emit = defineEmits<{
  select: [id: UUID | null];
  changeScore: [val: number];
  changeSort: [val: "latest" | "score"];
}>();
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
      <label class="score-filter">
        评分 ≥ <strong>{{ minScore.toFixed(1) }}</strong>
        <input type="range" min="0" max="10" step="0.5" :value="minScore"
          @input="emit('changeScore', parseFloat(($event.target as HTMLInputElement).value))" />
      </label>
      <select class="sort-select" @change="emit('changeSort', ($event.target as HTMLSelectElement).value as any)">
        <option value="latest">最新</option>
        <option value="score">评分最高</option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.filter-bar {
  background: var(--card); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 10px 14px;
  margin-bottom: 16px; display: flex; align-items: center;
  gap: 16px; flex-wrap: wrap; box-shadow: var(--shadow-soft);
}
.pills { display: flex; gap: 6px; flex-wrap: wrap; }
.pill {
  padding: 5px 12px; border-radius: 999px; font-size: 11px;
  font-weight: 600; border: 1px solid var(--border);
  background: var(--card); color: var(--muted); cursor: pointer;
}
.pill.active { background: var(--primary); color: #fff; border-color: var(--primary); }
.filter-right { margin-left: auto; display: flex; align-items: center; gap: 10px; }
.score-filter { font-size: 11px; color: var(--muted); display: flex; align-items: center; gap: 4px; }
.score-filter input { width: 80px; }
.sort-select { padding: 6px 10px; border-radius: 8px; border: 1px solid var(--border); font-size: 11px; }
</style>
