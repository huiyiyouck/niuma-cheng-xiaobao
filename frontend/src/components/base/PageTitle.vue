<script setup lang="ts">
// 页面标题：H1（20px / 800） + 可选副标题
defineProps<{
  title: string;
  sub?: string;
}>();
</script>

<template>
  <div class="page-head">
    <div>
      <h1 class="page-title">{{ title }}</h1>
      <div v-if="sub" class="page-sub">{{ sub }}</div>
    </div>
    <slot name="actions" />
  </div>
</template>
