<script setup lang="ts">
import { computed } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<{
  score: number;
  class?: string;
}>();

// 与原型 NewsPage.tsx:213-216 / SourceDetailPage 阈值一致
const colorClass = computed(() =>
  props.score >= 8
    ? "bg-green-100 text-green-800"
    : props.score >= 6
      ? "bg-blue-100 text-blue-800"
      : "bg-gray-100 text-gray-800",
);
</script>

<template>
  <span :class="cn('px-2 py-0.5 rounded text-xs font-medium shrink-0', colorClass, props.class)">
    {{ score }}
  </span>
</template>
