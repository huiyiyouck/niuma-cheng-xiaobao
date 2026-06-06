<script setup lang="ts">
import { ref } from "vue";
import AdminTabs from "@/components/AdminTabs.vue";
import SpaceManagementTab from "@/components/SpaceManagementTab.vue";
import SourceLibraryTab from "@/components/SourceLibraryTab.vue";

// v0.5: 管理页完全重写
// 双 Tab 容器：空间管理 | 信息源库
const activeTab = ref<"space_management" | "source_library">("space_management");
</script>

<template>
  <div class="admin-page">
    <!-- 双 Tab 切换 -->
    <AdminTabs v-model:activeTab="activeTab" />

    <!-- 条件渲染 Tab 内容 -->
    <SpaceManagementTab v-if="activeTab === 'space_management'" />
    <SourceLibraryTab v-else />
  </div>
</template>

<style scoped>
.admin-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
</style>
