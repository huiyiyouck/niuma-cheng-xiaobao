<script setup lang="ts">
// 错误条：⚠️ + 文字 + 红底
defineProps<{ message: string | null | undefined }>();
</script>

<template>
  <div v-if="message" class="error-bar">
    <span>⚠️</span><span>{{ message }}</span>
  </div>
</template>
