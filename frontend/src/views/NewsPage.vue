<script setup lang="ts">
import { ref, computed } from "vue";
import { Search, ChevronDown, ChevronRight, ExternalLink } from "lucide-vue-next";
import { cn } from "@/lib/utils";
import StatCard from "@/components/ui/StatCard.vue";
import NewsDetailPanel from "@/components/news/NewsDetailPanel.vue";
import { newsStats, spaces, channelsMap, mockNews, type NewsItem } from "@/lib/mock";

const selectedSpace = ref("ai");
const selectedChannel = ref("all");
const searchQuery = ref("");
const minScore = ref(0);
const sortBy = ref("time");
const selectedNews = ref<NewsItem | null>(null);

const channels = computed(() => channelsMap[selectedSpace.value] || []);

function selectSpace(id: string) {
  selectedSpace.value = id;
  selectedChannel.value = "all";
}
function toggleNews(news: NewsItem) {
  selectedNews.value = selectedNews.value?.id === news.id ? null : news;
}
function scoreClass(score: number) {
  return score >= 8
    ? "bg-green-100 text-green-800"
    : score >= 6
      ? "bg-blue-100 text-blue-800"
      : "bg-gray-100 text-gray-800";
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- ── 冻结顶部区 ───────────────────────────── -->
    <div class="shrink-0 border-b border-border px-6 pt-5 pb-0">
      <!-- Stats -->
      <div class="pb-4">
        <div class="grid grid-cols-4 gap-3">
          <StatCard
            v-for="stat in newsStats"
            :key="stat.label"
            :label="stat.label"
            :value="stat.value"
            :icon="stat.icon"
          />
        </div>
      </div>

      <!-- Space tabs -->
      <div class="border-t border-border pt-3 pb-2 flex gap-2">
        <button
          v-for="space in spaces"
          :key="space.id"
          @click="selectSpace(space.id)"
          :class="cn(
            'px-4 py-1.5 rounded-full text-sm transition-colors',
            selectedSpace === space.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-accent',
          )"
        >
          {{ space.name }}
        </button>
      </div>

      <!-- Channel tabs -->
      <div class="pb-3 flex gap-1.5 flex-wrap">
        <button
          v-for="channel in channels"
          :key="channel.id"
          @click="selectedChannel = channel.id"
          :class="cn(
            'px-3 py-1 rounded-full text-sm transition-colors',
            selectedChannel === channel.id
              ? 'bg-accent text-accent-foreground font-medium'
              : 'text-muted-foreground hover:bg-accent/50',
          )"
        >
          {{ channel.name }}
        </button>
      </div>

      <!-- Filters -->
      <div class="border-t border-border py-3 bg-muted/20">
        <div class="flex items-center gap-3">
          <div class="flex-1 relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索新闻..."
              class="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm text-muted-foreground whitespace-nowrap">评分 ≥</span>
            <input
              v-model.number="minScore"
              type="range"
              min="0"
              max="10"
              step="0.5"
              class="w-24 h-1 accent-primary cursor-pointer"
            />
            <span class="text-sm font-medium w-6 text-right tabular-nums">{{ minScore }}</span>
          </div>
          <div class="relative">
            <select
              v-model="sortBy"
              class="appearance-none inline-flex items-center gap-2 pl-3 pr-8 py-2 bg-background border border-border rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            >
              <option value="time">按时间</option>
              <option value="score">按评分</option>
              <option value="source">按来源</option>
            </select>
            <ChevronDown class="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>

    <!-- ── 可滚动列表 + 详情面板 ───────────────── -->
    <div class="flex-1 flex overflow-hidden">
      <!-- 新闻列表（居中聚焦） -->
      <div class="flex-1 overflow-auto py-5 px-6">
        <div class="max-w-[800px] mx-auto space-y-3">
          <div
            v-for="news in mockNews"
            :key="news.id"
            @click="toggleNews(news)"
            :class="cn(
              'bg-card border rounded-lg p-4 cursor-pointer transition-all',
              selectedNews?.id === news.id
                ? 'border-primary/50 shadow-md ring-1 ring-primary/20'
                : 'border-border hover:shadow-sm',
            )"
          >
            <div class="flex items-start gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-start gap-3 mb-2">
                  <h3 class="flex-1 font-medium leading-snug">{{ news.title }}</h3>
                  <div class="flex items-center gap-1.5 shrink-0">
                    <span :class="cn('px-2 py-0.5 rounded text-xs font-medium', scoreClass(news.score))">
                      {{ news.score }}
                    </span>
                    <ChevronRight
                      :class="cn(
                        'h-4 w-4 text-muted-foreground transition-transform',
                        selectedNews?.id === news.id && 'rotate-90 text-primary',
                      )"
                    />
                  </div>
                </div>
                <div class="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <span v-if="news.source.removed" class="opacity-50">来源已移除</span>
                  <RouterLink
                    v-else
                    :to="`/sources/${news.source.id}`"
                    @click.stop
                    class="hover:text-foreground hover:underline inline-flex items-center gap-1"
                  >
                    {{ news.source.name }}<ExternalLink class="h-3 w-3" />
                  </RouterLink>
                  <span>·</span><span>{{ news.channel }}</span>
                  <span>·</span><span>{{ news.time }}</span>
                </div>
                <p class="text-sm text-muted-foreground mb-3 line-clamp-2">{{ news.summary }}</p>
                <div class="flex flex-wrap gap-1.5">
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
        </div>
      </div>

      <!-- 详情面板 -->
      <NewsDetailPanel :news="selectedNews" @close="selectedNews = null" />
    </div>
  </div>
</template>
