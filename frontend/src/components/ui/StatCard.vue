<script setup lang="ts">
import type { FunctionalComponent } from "vue";

defineProps<{
  label: string;
  value: string | number;
  icon: FunctionalComponent;
}>();
</script>

<template>
  <div class="bg-card border border-border rounded-lg p-4">
    <div class="flex items-center justify-between">
      <div>
        <div class="text-sm text-muted-foreground">{{ label }}</div>
        <div class="text-2xl font-semibold mt-1">{{ value }}</div>
      </div>
      <component :is="icon" class="h-8 w-8 text-muted-foreground opacity-50" />
    </div>
  </div>
</template>
