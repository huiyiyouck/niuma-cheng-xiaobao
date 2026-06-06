<script setup lang="ts">
import { computed } from "vue";

// v0.5: 通用分页组件
const props = withDefaults(defineProps<{
  currentPage: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
}>(), {
  pageSizeOptions: () => [10, 20, 50],
});

const emit = defineEmits<{
  "update:currentPage": [page: number];
  "update:pageSize": [size: number];
}>();

const totalPages = computed(() => Math.max(1, Math.ceil(props.totalItems / props.pageSize)));

const visiblePages = computed(() => {
  const pages: (number | "...")[] = [];
  const tp = totalPages.value;
  const cp = props.currentPage;

  if (tp <= 7) {
    for (let i = 1; i <= tp; i++) pages.push(i);
    return pages;
  }

  pages.push(1);
  if (cp > 3) pages.push("...");

  const start = Math.max(2, cp - 1);
  const end = Math.min(tp - 1, cp + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (cp < tp - 2) pages.push("...");
  pages.push(tp);

  return pages;
});

function goTo(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    emit("update:currentPage", page);
  }
}

function changePageSize(e: Event) {
  const val = parseInt((e.target as HTMLSelectElement).value);
  emit("update:pageSize", val);
}
</script>

<template>
  <div class="pagination" v-if="totalItems > 0">
    <div class="pg-info">
      共 {{ totalItems }} 条
    </div>
    <div class="pg-controls">
      <button class="pg-btn" :disabled="currentPage <= 1" @click="goTo(currentPage - 1)">上一页</button>
      <template v-for="p in visiblePages" :key="p">
        <span v-if="p === '...'" class="pg-ellipsis">…</span>
        <button
          v-else
          class="pg-btn pg-num"
          :class="{ active: p === currentPage }"
          @click="goTo(p)"
        >{{ p }}</button>
      </template>
      <button class="pg-btn" :disabled="currentPage >= totalPages" @click="goTo(currentPage + 1)">下一页</button>
    </div>
    <div class="pg-size">
      <select class="pg-select" :value="pageSize" @change="changePageSize">
        <option v-for="s in pageSizeOptions" :key="s" :value="s">{{ s }} 条/页</option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  justify-content: center;
  flex-wrap: wrap;
}
.pg-info {
  font-size: 12px;
  color: var(--text-muted);
}
.pg-controls {
  display: flex;
  gap: 4px;
  align-items: center;
}
.pg-btn {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}
.pg-btn:hover:not(:disabled) {
  background: #F4F5F7;
  color: var(--text);
}
.pg-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.pg-num.active {
  background: var(--accent);
  color: #FFF;
  border-color: var(--accent);
}
.pg-ellipsis {
  padding: 0 4px;
  color: var(--text-muted);
  font-size: 14px;
}
.pg-size {
  margin-left: auto;
}
.pg-select {
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid var(--border);
  font-size: 12px;
  background: var(--card);
  outline: none;
}
</style>
