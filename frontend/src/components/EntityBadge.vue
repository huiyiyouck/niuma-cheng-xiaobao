<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  entities: { name: string; type: string }[];
}>();

const typeStyle = (type: string) => {
  const t = type.toLowerCase();
  if (t === "person") return { bg: "#fde8e8", text: "#c0392b", label: "人物" };
  if (t === "org" || t === "organization") return { bg: "#e8f4fd", text: "#2980b9", label: "组织" };
  if (t === "company") return { bg: "#e8f4fd", text: "#2980b9", label: "公司" };
  if (t === "product") return { bg: "#e8f8e8", text: "#27ae60", label: "产品" };
  if (t === "technology" || t === "tech") return { bg: "#f3e8ff", text: "#8e44ad", label: "技术" };
  return { bg: "#f5f5f5", text: "#888", label: type };
};

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
      <span class="entity-type" :style="{ background: typeStyle(type).bg, color: typeStyle(type).text }">
        {{ typeStyle(type).label }}
      </span>
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
  padding: 2px 6px;
  border-radius: 4px;
}
.entity-name {
  font-size: 11px;
  color: var(--muted);
  background: #f8fafc;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--border);
}
</style>
