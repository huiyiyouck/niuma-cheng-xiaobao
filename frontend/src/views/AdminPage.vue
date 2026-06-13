<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { cn } from "@/lib/utils";
import SpacesManagement from "@/components/admin/SpacesManagement.vue";
import SourceLibrary from "@/components/admin/SourceLibrary.vue";

const route = useRoute();
const router = useRouter();

const activeTab = computed(() => (route.query.tab as string) || "spaces");

function setActiveTab(tab: string) {
  if (tab === "spaces") router.replace({ query: {} });
  else router.replace({ query: { tab } });
}
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="border-b border-border bg-card">
      <div class="px-6 py-4">
        <h1 class="mb-4">管理</h1>
        <div class="flex gap-1">
          <button
            @click="setActiveTab('spaces')"
            :class="cn(
              'px-4 py-2 rounded-md transition-colors',
              activeTab === 'spaces'
                ? 'bg-secondary text-secondary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )"
          >
            空间管理
          </button>
          <button
            @click="setActiveTab('source-library')"
            :class="cn(
              'px-4 py-2 rounded-md transition-colors',
              activeTab === 'source-library'
                ? 'bg-secondary text-secondary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )"
          >
            信息源库
          </button>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-auto">
      <SpacesManagement v-if="activeTab === 'spaces'" />
      <SourceLibrary v-else />
    </div>
  </div>
</template>
