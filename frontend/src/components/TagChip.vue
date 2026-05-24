<script setup lang="ts">
defineProps<{ tag: string }>();
const emit = defineEmits<{ click: [] }>();
</script>

<template>
  <span class="tag-chip" @click.stop="emit('click')">{{ tag }}</span>
</template>

<style scoped>
.tag-chip {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10px;
  background: #f1f5f9;
  color: #475569;
  cursor: pointer;
  transition: background 0.15s;
}
.tag-chip:hover {
  background: #e2e8f0;
}
</style>
