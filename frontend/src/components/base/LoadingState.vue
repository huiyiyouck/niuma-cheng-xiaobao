<script setup lang="ts">
// 加载中提示
withDefaults(defineProps<{ text?: string }>(), { text: "加载中…" });
</script>

<template>
  <div class="loading-state">{{ text }}</div>
</template>
