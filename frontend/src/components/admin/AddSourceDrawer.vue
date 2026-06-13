<script setup lang="ts">
// 简化版：添加信息源抽屉，待对照原型 AddSourceDrawer.tsx 精修（搜索源库/新建源等完整流程）
import { ref } from "vue";
import { X, Search } from "lucide-vue-next";

defineProps<{ open: boolean; spaceName: string; channelName: string }>();
const emit = defineEmits<{ close: []; addSource: [sourceId: string] }>();

const query = ref("");
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-200"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="fixed inset-0 z-40 bg-black/40" @click="emit('close')" />
    </Transition>
    <Transition
      enter-active-class="transition-transform duration-[250ms] ease-out"
      enter-from-class="translate-x-full"
      leave-active-class="transition-transform duration-200 ease-in"
      leave-to-class="translate-x-full"
    >
      <div v-if="open" class="fixed right-0 top-0 z-50 h-full w-full sm:w-[480px] bg-card shadow-xl overflow-auto">
        <div class="p-5 border-b border-border flex items-start justify-between">
          <div>
            <h3 class="font-medium">添加信息源</h3>
            <p class="text-sm text-muted-foreground mt-1">添加到：{{ spaceName }} / {{ channelName }}</p>
          </div>
          <button @click="emit('close')" class="p-1.5 rounded-md hover:bg-accent text-muted-foreground"><X class="h-4 w-4" /></button>
        </div>
        <div class="p-5 space-y-4">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input v-model="query" placeholder="搜索信息源库..." class="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
          </div>
          <div class="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-md">
            从信息源库选择已有源，或新建源（完整流程待对照原型精修）
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
