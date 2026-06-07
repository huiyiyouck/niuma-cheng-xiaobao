<script setup lang="ts">
// 小圆角标签
// 用法：<MiniTag variant="role"> 官方 </MiniTag>
withDefaults(defineProps<{
  variant?: "default" | "role" | "level" | "domain";
}>(), { variant: "default" });
</script>

<template>
  <span class="mini-tag" :class="variant !== 'default' ? `mini-tag--${variant}` : ''">
    <slot />
  </span>
</template>
