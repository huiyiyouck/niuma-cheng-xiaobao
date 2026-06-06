<script setup lang="ts">
// v0.5: 统一空状态组件
defineProps<{
  icon: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionTo?: string;
}>();
</script>

<template>
  <div class="empty-state">
    <div class="empty-icon">{{ icon }}</div>
    <div class="empty-title">{{ title }}</div>
    <div v-if="description" class="empty-desc">{{ description }}</div>
    <RouterLink v-if="actionLabel && actionTo" :to="actionTo" class="empty-action btn primary">
      {{ actionLabel }}
    </RouterLink>
  </div>
</template>

<style scoped>
.empty-state {
  text-align: center;
  padding: 48px 24px;
}
.empty-icon {
  font-size: 40px;
  opacity: 0.4;
  margin-bottom: 12px;
}
.empty-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.empty-desc {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 16px;
}
.empty-action {
  display: inline-block;
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}
</style>
