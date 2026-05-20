<script setup lang="ts">
import type { ChannelSpace, UUID } from "@/lib/types";

defineProps<{ spaces: ChannelSpace[]; selectedId: UUID | null }>();
const emit = defineEmits<{ select: [id: UUID]; create: [] }>();
</script>

<template>
  <div class="space-section">
    <div class="space-top">
      <div class="section-title">📂 频道空间</div>
      <button class="btn btn-sm primary" @click="emit('create')">+ 新建</button>
    </div>
    <div class="space-pills">
      <button
        v-for="s in spaces" :key="s.id"
        class="spill"
        :class="{ active: s.id === selectedId }"
        @click="emit('select', s.id)"
      >{{ s.name }}</button>
    </div>
  </div>
</template>

<style scoped>
.space-section {
  background: var(--card); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 20px;
  margin-bottom: 16px; box-shadow: var(--shadow-soft);
}
.space-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.section-title { font-weight: 900; font-size: 15px; }
.space-pills { display: flex; gap: 8px; flex-wrap: wrap; }
.spill {
  padding: 6px 12px; border-radius: 999px; font-size: 11px;
  font-weight: 600; border: 1px solid var(--border);
  background: var(--card); color: var(--muted); cursor: pointer;
}
.spill.active { background: var(--primary); color: #fff; border-color: var(--primary); }
</style>
