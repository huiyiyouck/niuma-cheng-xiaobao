<script setup lang="ts">
import { computed } from "vue";
import { cn } from "@/lib/utils";

const props = withDefaults(
  defineProps<{
    variant?: "default" | "success" | "warning" | "error" | "info";
    class?: string;
  }>(),
  { variant: "default" },
);

const variantStyles = {
  default: "bg-secondary text-secondary-foreground",
  success: "bg-green-100 text-green-800",
  warning: "bg-orange-100 text-orange-800",
  error: "bg-red-100 text-red-800",
  info: "bg-blue-100 text-blue-800",
} as const;

const colorClass = computed(() => variantStyles[props.variant]);
</script>

<template>
  <span :class="cn('px-2 py-0.5 text-xs rounded', colorClass, props.class)">
    <slot />
  </span>
</template>
