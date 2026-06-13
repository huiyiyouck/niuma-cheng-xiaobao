<script setup lang="ts">
// 简化版：空间新建/编辑弹窗，待对照原型 SpaceEditDialog.tsx 精修（图标上传 4 视觉态等）
import { ref, watch } from "vue";
import { X } from "lucide-vue-next";

const props = defineProps<{ open: boolean; space: { name: string; icon: string; description: string } | null }>();
const emit = defineEmits<{ close: []; save: [data: { name: string; icon: string; description: string }] }>();

const name = ref("");
const icon = ref("");
const description = ref("");

watch(
  () => props.open,
  (v) => {
    if (v) {
      name.value = props.space?.name ?? "";
      icon.value = props.space?.icon ?? "";
      description.value = props.space?.description ?? "";
    }
  },
);
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/40" @click="emit('close')" />
      <div class="relative bg-card border border-border rounded-lg shadow-xl w-[460px] max-w-full p-6">
        <div class="flex items-center justify-between mb-5">
          <h3 class="font-medium">{{ space ? "编辑空间" : "新建空间" }}</h3>
          <button @click="emit('close')" class="p-1 rounded-md hover:bg-accent text-muted-foreground"><X class="h-4 w-4" /></button>
        </div>
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-muted-foreground mb-1.5">图标（emoji）</label>
            <input v-model="icon" placeholder="🤖" class="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label class="block text-sm text-muted-foreground mb-1.5">名称</label>
            <input v-model="name" placeholder="空间名称" class="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label class="block text-sm text-muted-foreground mb-1.5">描述</label>
            <textarea v-model="description" rows="3" placeholder="空间描述" class="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-6">
          <button @click="emit('close')" class="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-accent text-sm">取消</button>
          <button @click="emit('save', { name, icon, description })" class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 text-sm">保存</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
