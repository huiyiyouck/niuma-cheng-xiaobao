<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  entities: { name: string; type: string }[];
}>();

const typeColors: Record<string, string> = {
  person: "#4f46e5",
  org: "#0891b2",
  company: "#0891b2",
  product: "#d97706",
  location: "#16a34a",
  event: "#dc2626",
  topic: "#7c3aed",
  technology: "#2563eb",
};

function colorFor(type: string): string {
  return typeColors[type.toLowerCase()] ?? "#64748b";
}

const grouped = computed(() => {
  const map: Record<string, string[]> = {};
  for (const e of props.entities) {
    (map[e.type] ??= []).push(e.name);
  }
  return map;
});
</script>

<template>
  <div class="entity-list" v-if="entities.length">
    <div class="entity-group" v-for="(names, type) in grouped" :key="type">
      <span class="entity-type" :style="{ background: colorFor(type) }">{{ type }}</span>
      <span class="entity-name" v-for="n in names" :key="n">{{ n }}</span>
    </div>
  </div>
</template>

<style scoped>
.entity-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.entity-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.entity-type {
  font-size: 9px;
  font-weight: 700;
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
}
.entity-name {
  font-size: 11px;
  color: var(--muted);
  background: #f8fafc;
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid var(--border);
}
</style>
