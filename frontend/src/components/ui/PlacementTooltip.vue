<script setup lang="ts">
import { ref } from "vue";

defineProps<{ placements: Array<{ space: string; channel: string }> }>();
const show = ref(false);
</script>

<template>
  <span class="relative inline-flex" @mouseenter="show = true" @mouseleave="show = false">
    <slot />
    <div
      v-if="show && placements.length"
      class="absolute left-0 top-full mt-1 z-50 min-w-[180px] bg-popover border border-border rounded-md shadow-lg p-2 space-y-1"
    >
      <div
        v-for="(p, i) in placements"
        :key="i"
        class="text-xs text-foreground whitespace-nowrap flex items-center gap-1.5"
      >
        <span class="font-medium">{{ p.space }}</span>
        <span class="text-muted-foreground">/</span>
        <span class="text-muted-foreground">{{ p.channel }}</span>
      </div>
    </div>
  </span>
</template>
