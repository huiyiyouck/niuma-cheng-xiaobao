<script setup lang="ts">
// 简化版：功能性删除确认弹窗，待对照原型 DeleteConfirmDialog.tsx 精修细节
import { AlertTriangle } from "lucide-vue-next";

defineProps<{ open: boolean; data: any }>();
const emit = defineEmits<{ close: []; confirm: [migrateToRoot?: boolean] }>();
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/40" @click="emit('close')" />
      <div class="relative bg-card border border-border rounded-lg shadow-xl w-[460px] max-w-full p-6">
        <div class="flex items-start gap-3 mb-5">
          <div class="p-2 rounded-full bg-destructive/10 text-destructive shrink-0">
            <AlertTriangle class="h-5 w-5" />
          </div>
          <div class="flex-1">
            <h3 class="font-medium mb-1">确认删除</h3>
            <p class="text-sm text-muted-foreground">
              确定要删除
              <span class="font-medium text-foreground">{{ data?.name || data?.sourceName || "该项" }}</span>
              吗？此操作不可撤销。
            </p>
            <p v-if="data?.location" class="text-sm text-muted-foreground mt-1">位置：{{ data.location }}</p>
            <p v-if="data?.newsCount" class="text-sm text-muted-foreground mt-1">
              关联 {{ data.placementCount }} 个位置 · {{ data.newsCount }} 条历史新闻
            </p>
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <button
            @click="emit('close')"
            class="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-accent text-sm"
          >
            取消
          </button>
          <button
            @click="emit('confirm')"
            class="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:opacity-90 text-sm"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
