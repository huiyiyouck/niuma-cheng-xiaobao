<script setup lang="ts">
import { watch, onUnmounted } from "vue";
import { X, ExternalLink } from "lucide-vue-next";
import ScoreBadge from "@/components/ui/ScoreBadge.vue";
import type { NewsItem } from "@/lib/mock";

const props = defineProps<{ news: NewsItem | null; open: boolean }>();
const emit = defineEmits<{ close: [] }>();

// UI spec D14：ESC 键关闭
function onKey(e: KeyboardEvent) {
  if (e.key === "Escape") emit("close");
}
watch(
  () => props.open,
  (v) => {
    if (v) document.addEventListener("keydown", onKey);
    else document.removeEventListener("keydown", onKey);
  },
);
onUnmounted(() => document.removeEventListener("keydown", onKey));
</script>

<template>
  <Teleport to="body">
    <!-- 遮罩淡入 -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-200"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="fixed inset-0 z-40 bg-black/40" @click="emit('close')" />
    </Transition>

    <!-- 抽屉右滑（UI spec D12：桌面 480px / 移动全宽；D14：右滑 250ms） -->
    <Transition
      enter-active-class="transition-transform duration-[250ms] ease-out"
      enter-from-class="translate-x-full"
      leave-active-class="transition-transform duration-200 ease-in"
      leave-to-class="translate-x-full"
    >
      <div
        v-if="open"
        class="fixed right-0 top-0 z-50 h-full w-full sm:w-[480px] bg-card shadow-xl overflow-auto"
      >
        <div v-if="news" class="p-6">
          <!-- 头部 -->
          <div class="flex items-start justify-between gap-4 mb-4">
            <h2 class="text-lg font-medium leading-snug">{{ news.title }}</h2>
            <button
              @click="emit('close')"
              class="shrink-0 p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <!-- 来源·频道·时间 -->
          <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <span v-if="news.source.removed" class="text-muted-foreground/50">来源已移除</span>
            <RouterLink
              v-else
              :to="`/sources/${news.source.id}`"
              class="hover:text-foreground hover:underline inline-flex items-center gap-1"
            >
              {{ news.source.name }}
              <ExternalLink class="h-3 w-3" />
            </RouterLink>
            <span>·</span>
            <span>{{ news.channel }}</span>
            <span>·</span>
            <span>{{ news.time }}</span>
          </div>

          <!-- 综合评分 -->
          <div class="flex items-center gap-2 mb-4 pb-4 border-b border-border">
            <span class="text-sm text-muted-foreground">综合价值分</span>
            <ScoreBadge :score="news.score" />
          </div>

          <!-- 摘要 -->
          <div class="mb-5">
            <h3 class="text-sm font-medium mb-2">摘要</h3>
            <p class="text-sm text-foreground leading-relaxed">{{ news.summary }}</p>
          </div>

          <!-- 标签 -->
          <div>
            <h3 class="text-sm font-medium mb-2">标签</h3>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="tag in news.tags"
                :key="tag"
                class="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded"
              >
                {{ tag }}
              </span>
              <span
                v-for="entity in news.entities"
                :key="entity"
                class="px-2 py-0.5 bg-accent text-accent-foreground text-xs rounded"
              >
                {{ entity }}
              </span>
            </div>
          </div>

          <!-- TODO(下周期): UI spec 六段式详情——翻译/背景补全段落(可信度+来源标签)/4 维评分/五类标签，
               需后端 GET /v1/news/:id 契约 + 详情 mock -->
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
