<script setup lang="ts">
import type { SourceWithPositions } from "@/lib/types";
import SourceTableRow from "@/components/SourceTableRow.vue";
import EmptyState from "@/components/EmptyState.vue";

// v0.5: 信息源库表格
// 包含表头 + 行列表
defineProps<{
  sources: SourceWithPositions[];
}>();

const emit = defineEmits<{
  view: [id: string];
  edit: [id: string];
  delete: [id: string];
}>();
</script>

<template>
  <div class="source-table-wrapper table-scroll">
    <table class="source-table" v-if="sources.length > 0">
      <thead>
        <tr class="table-header">
          <th class="col-name">信息源</th>
          <th class="col-type">类型</th>
          <th class="col-tags">标签</th>
          <th class="col-availability">可用性</th>
          <th class="col-operational">运行</th>
          <th class="col-positions">使用位置</th>
          <th class="col-fetch">最近抓取</th>
          <th class="col-news">历史新闻</th>
          <th class="col-actions">操作</th>
        </tr>
      </thead>
      <tbody>
        <SourceTableRow
          v-for="s in sources"
          :key="s.id"
          :source="s"
          @view="emit('view', $event)"
          @edit="emit('edit', $event)"
          @delete="emit('delete', $event)"
        />
      </tbody>
    </table>
    <EmptyState
      v-else
      icon="📡"
      title="暂无匹配的信息源"
      description="试试调整筛选条件或创建新的信息源"
    />
  </div>
</template>

<style scoped>
.source-table-wrapper {
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background: var(--card);
  overflow: hidden;
}
.source-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 900px;
}
.table-header th {
  padding: 10px 14px;
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  text-align: left;
  background: #F8FAFB;
  border-bottom: 2px solid var(--border);
  white-space: nowrap;
}
</style>
