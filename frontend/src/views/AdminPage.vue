<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import AdminTabs from "@/components/AdminTabs.vue";
import SpaceManagementTab from "@/components/SpaceManagementTab.vue";
import SourceLibraryTab from "@/components/SourceLibraryTab.vue";

type Tab = "space_management" | "source_library";

const route = useRoute();
const router = useRouter();

function tabFromHash(h: string): Tab {
  const v = (h || "").replace(/^#/, "");
  if (v === "library" || v === "source_library") return "source_library";
  return "space_management";
}
function hashFromTab(t: Tab): string {
  return t === "source_library" ? "library" : "space";
}

const activeTab = ref<Tab>(tabFromHash(route.hash));

onMounted(() => {
  if (!route.hash) router.replace({ hash: `#${hashFromTab(activeTab.value)}` });
});

watch(activeTab, (t) => {
  router.replace({ hash: `#${hashFromTab(t)}` });
});

watch(() => route.hash, (h) => {
  const t = tabFromHash(h);
  if (t !== activeTab.value) activeTab.value = t;
});
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
