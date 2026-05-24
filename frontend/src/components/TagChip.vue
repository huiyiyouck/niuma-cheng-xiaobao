<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ tag: string }>();
const emit = defineEmits<{ click: [] }>();

const PALETTE = [
  { bg: "#e8f4fd", text: "#3498db" },  // 蓝
  { bg: "#fef3e2", text: "#f39c12" },  // 橙
  { bg: "#e8f8e8", text: "#27ae60" },  // 绿
  { bg: "#f3e8ff", text: "#8e44ad" },  // 紫
];

const colors = computed(() => {
  const idx = (props.tag.charCodeAt(0) || 0) % PALETTE.length;
  return PALETTE[idx];
});
</script>

<template>
  <span
    class="tag-chip"
    :style="{ background: colors.bg, color: colors.text }"
    @click.stop="emit('click')"
  >{{ tag }}</span>
</template>

<style scoped>
.tag-chip {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}
.tag-chip:hover {
  opacity: 0.8;
}
</style>
