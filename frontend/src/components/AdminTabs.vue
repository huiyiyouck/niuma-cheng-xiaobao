<script setup lang="ts">
// v0.5: 管理页双 Tab 切换器
// 空间管理 | 信息源库
defineProps<{
  activeTab: "space_management" | "source_library";
}>();

const emit = defineEmits<{
  "update:activeTab": [tab: "space_management" | "source_library"];
}>();
</script>

<template>
  <div class="admin-tabs">
    <button
      class="admin-tab"
      :class="{ active: activeTab === 'space_management' }"
      @click="emit('update:activeTab', 'space_management')"
    >
      空间管理
    </button>
    <button
      class="admin-tab"
      :class="{ active: activeTab === 'source_library' }"
      @click="emit('update:activeTab', 'source_library')"
    >
      信息源库
    </button>
  </div>
</template>

<style scoped>
.admin-tabs {
  display: flex;
  gap: 0;
  background: var(--card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 4px;
  box-shadow: var(--shadow-soft);
}
.admin-tab {
  flex: 1;
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 700;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 10px;
  transition: all 0.15s;
}
.admin-tab:hover {
  color: var(--accent);
}
.admin-tab.active {
  background: var(--accent);
  color: #FFF;
}
</style>
