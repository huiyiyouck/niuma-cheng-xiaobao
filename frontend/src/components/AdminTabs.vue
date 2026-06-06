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
  display: inline-flex;
  background: #F1F5F9;
  border-radius: 8px;
  padding: 3px;
  margin-bottom: 20px;
}
.admin-tab {
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  border: none;
  background: transparent;
}
.admin-tab:hover { color: var(--accent); }
.admin-tab.active {
  background: var(--card);
  color: var(--accent);
  box-shadow: 0 1px 2px rgba(0,0,0,0.08);
}
</style>
