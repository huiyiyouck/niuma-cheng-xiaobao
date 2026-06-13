<script setup lang="ts">
import { ExternalLink } from "lucide-vue-next";
import ScoreBadge from "@/components/ui/ScoreBadge.vue";
import type { NewsItem } from "@/lib/mock";

defineProps<{ news: NewsItem }>();
</script>

<template>
  <div class="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
    <div class="flex items-start gap-3">
      <div class="flex-1">
        <div class="flex items-start gap-3 mb-2">
          <h3 class="flex-1 font-medium leading-snug">{{ news.title }}</h3>
          <ScoreBadge :score="news.score" />
        </div>

        <div class="flex items-center gap-2 text-sm text-muted-foreground mb-2">
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

        <p class="text-sm text-muted-foreground mb-3 line-clamp-2">
          {{ news.summary }}
        </p>

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
    </div>
  </div>
</template>
