<script setup lang="ts">
// 类型徽章：X/Twitter（蓝）/ RSS（橙）
defineProps<{ type: "x_twitter" | "rss" }>();
</script>

<template>
  <span class="type-badge" :class="type === 'x_twitter' ? 'type-badge--twitter' : 'type-badge--rss'">
    {{ type === "x_twitter" ? "X/Twitter" : "RSS" }}
  </span>
</template>
