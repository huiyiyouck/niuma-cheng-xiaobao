<script setup lang="ts">
import type { ChannelSourceWithSource } from "@/lib/types";

defineProps<{ cs: ChannelSourceWithSource }>();
const emit = defineEmits<{ toggle: []; edit: [] }>();

function getEverySeconds(cs: ChannelSourceWithSource): number {
  return cs.channel_source.fetch_policy?.schedule?.every_seconds ?? 600;
}
function getMaxItems(cs: ChannelSourceWithSource): number {
  return cs.channel_source.fetch_policy?.budget?.max_items_per_run ?? 20;
}
</script>

<template>
  <div class="ch-card">
    <div class="ch-body">
      <div class="ch-header">
        <span class="ch-name">{{ cs.source.display_name }}</span>
        <span class="badge" :class="cs.channel_source.enabled ? 'badge--success' : 'badge--warning'">
          {{ cs.channel_source.enabled ? '运行中' : '暂停' }}
        </span>
        <span class="badge badge--muted">{{ cs.source.type }}</span>
      </div>
      <div class="ch-meta">
        <span>⏱ 每 {{ getEverySeconds(cs) }}秒</span>
        <span>📐 ≤ {{ getMaxItems(cs) }}条</span>
      </div>
    </div>
    <div class="ch-actions">
      <button class="btn btn-sm" @click="emit('edit')">编辑</button>
      <button
        class="btn btn-sm"
        :class="cs.channel_source.enabled ? 'danger' : 'success'"
        @click="emit('toggle')"
      >{{ cs.channel_source.enabled ? '暂停' : '启用' }}</button>
    </div>
  </div>
</template>

<style scoped>
.ch-card {
  border: 1px solid var(--border); border-radius: var(--radius);
  padding: 16px; margin-bottom: 10px; display: flex;
  align-items: flex-start; justify-content: space-between; gap: 12px;
}
.ch-body { flex: 1; }
.ch-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.ch-name { font-weight: 900; font-size: 14px; }
.ch-meta { display: flex; gap: 12px; font-size: 11px; color: var(--muted); }
.ch-actions { display: flex; gap: 6px; flex-shrink: 0; }
.btn.danger { border-color: #fca5a5; background: #fef2f2; color: var(--danger); }
.btn.success { border-color: #86efac; background: #f0fdf4; color: var(--success); }
</style>
