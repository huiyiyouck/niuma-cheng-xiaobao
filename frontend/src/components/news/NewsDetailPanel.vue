<script setup lang="ts">
import { X, Clock, BarChart2, Building2, Tag, ExternalLink } from "lucide-vue-next";
import { cn } from "@/lib/utils";
import type { NewsItem } from "@/lib/mock";

const props = defineProps<{ news: NewsItem | null }>();
const emit = defineEmits<{ close: [] }>();

function scoreClass(score: number) {
  return score >= 8
    ? "bg-green-100 text-green-800"
    : score >= 6
      ? "bg-blue-100 text-blue-800"
      : "bg-gray-100 text-gray-800";
}
</script>

<template>
  <!-- 挤压式滑入面板：width 0↔420 + 内层 translateX（1:1 原型 NewsPage 详情面板） -->
  <div
    :class="cn(
      'shrink-0 overflow-hidden border-l border-border bg-background flex flex-col shadow-xl',
      'transition-[width] duration-300 ease-in-out',
      news ? 'w-[420px]' : 'w-0',
    )"
  >
    <div
      :class="cn(
        'w-[420px] h-full flex flex-col transition-transform duration-300 ease-in-out',
        news ? 'translate-x-0' : 'translate-x-full',
      )"
    >
      <!-- Header -->
      <div class="flex items-start justify-between p-5 border-b border-border shrink-0">
        <div class="flex-1 pr-4">
          <div v-if="news" class="flex items-center gap-2 mb-2">
            <span :class="cn('px-2 py-0.5 rounded text-xs font-medium', scoreClass(news.score))">
              评分 {{ news.score }}
            </span>
            <span class="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{{ news.channel }}</span>
          </div>
          <h2 class="font-semibold leading-snug">{{ news?.title ?? "" }}</h2>
        </div>
        <button
          @click="emit('close')"
          class="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-auto p-5 space-y-5">
        <template v-if="news">
          <div class="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span class="flex items-center gap-1.5"><Clock class="h-3.5 w-3.5" />{{ news.time }}</span>
            <span class="flex items-center gap-1.5"><BarChart2 class="h-3.5 w-3.5" />评分 {{ news.score }}</span>
            <RouterLink
              v-if="!news.source.removed"
              :to="`/sources/${news.source.id}`"
              class="flex items-center gap-1.5 hover:text-foreground hover:underline"
            >
              <Building2 class="h-3.5 w-3.5" />{{ news.source.name }}
            </RouterLink>
            <span v-else class="flex items-center gap-1.5 opacity-50">
              <Building2 class="h-3.5 w-3.5" />来源已移除
            </span>
          </div>

          <div>
            <h3 class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">摘要</h3>
            <p class="text-sm leading-relaxed text-foreground/80">{{ news.summary }}</p>
          </div>

          <div v-if="news.fullContent">
            <h3 class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">正文</h3>
            <div class="text-sm leading-relaxed text-foreground/80 space-y-3">
              <p v-for="(para, i) in news.fullContent.split('\n\n')" :key="i">{{ para }}</p>
            </div>
          </div>

          <div>
            <h3 class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Tag class="h-3.5 w-3.5" />标签与实体
            </h3>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="tag in news.tags"
                :key="tag"
                class="px-2.5 py-1 bg-secondary text-secondary-foreground text-xs rounded-md"
              >
                {{ tag }}
              </span>
              <span
                v-for="entity in news.entities"
                :key="entity"
                class="px-2.5 py-1 bg-accent text-accent-foreground text-xs rounded-md font-medium"
              >
                {{ entity }}
              </span>
            </div>
          </div>
        </template>
      </div>

      <!-- Footer -->
      <div v-if="news?.originalUrl" class="p-5 border-t border-border shrink-0">
        <a
          :href="news.originalUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center justify-center gap-2 w-full py-2.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <ExternalLink class="h-4 w-4" />查看原文
        </a>
      </div>
    </div>
  </div>
</template>
