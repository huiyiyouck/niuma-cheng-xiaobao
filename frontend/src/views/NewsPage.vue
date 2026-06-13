<script setup lang="ts">
import { ref, computed } from "vue";
import { Search, ChevronDown } from "lucide-vue-next";
import { cn } from "@/lib/utils";
import StatCard from "@/components/ui/StatCard.vue";
import NewsCard from "@/components/news/NewsCard.vue";
import { newsStats, spaces, channelsMap, mockNews } from "@/lib/mock";

const selectedSpace = ref("ai");
const selectedChannel = ref("all");
const searchQuery = ref("");
const minScore = ref(0);
const sortBy = ref("time");
const detailPanelOpen = ref(true);

const channels = computed(() => channelsMap[selectedSpace.value] || []);

function selectSpace(id: string) {
  selectedSpace.value = id;
  selectedChannel.value = "all";
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Stats Cards -->
    <div class="p-6 border-b border-border">
      <div class="grid grid-cols-4 gap-4">
        <StatCard
          v-for="stat in newsStats"
          :key="stat.label"
          :label="stat.label"
          :value="stat.value"
          :icon="stat.icon"
        />
      </div>
    </div>

    <!-- Space Pills -->
    <div class="px-6 pt-4 pb-2 border-b border-border">
      <div class="flex gap-2 flex-wrap">
        <button
          v-for="space in spaces"
          :key="space.id"
          @click="selectSpace(space.id)"
          :class="cn(
            'px-4 py-1.5 rounded-full transition-colors',
            selectedSpace === space.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-accent',
          )"
        >
          {{ space.name }}
        </button>
      </div>
    </div>

    <!-- Channel Pills -->
    <div class="px-6 py-2 border-b border-border">
      <div class="flex gap-2 flex-wrap">
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
    </div>

    <!-- Filters -->
    <div class="px-6 py-4 border-b border-border bg-muted/30">
      <div class="flex items-center gap-4">
        <div class="flex-1 relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索新闻..."
            class="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div class="flex items-center gap-2 min-w-[200px]">
          <span class="text-sm text-muted-foreground whitespace-nowrap">最低评分:</span>
          <input
            v-model.number="minScore"
            type="range"
            min="0"
            max="10"
            step="0.5"
            class="w-full h-1 accent-primary cursor-pointer"
          />
          <span class="text-sm font-medium min-w-[2rem] text-right">{{ minScore }}</span>
        </div>

        <div class="relative min-w-[140px]">
          <select
            v-model="sortBy"
            class="w-full appearance-none inline-flex items-center justify-between gap-2 pl-4 pr-9 py-2 bg-background border border-border rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="time">按时间</option>
            <option value="score">按评分</option>
            <option value="source">按来源</option>
          </select>
          <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" />
        </div>
      </div>
    </div>

    <!-- News List with Detail Panel -->
    <div class="flex-1 flex overflow-hidden">
      <!-- News List -->
      <div :class="cn('flex-1 overflow-auto p-6', detailPanelOpen && 'border-r border-border')">
        <div class="space-y-4 max-w-4xl">
          <NewsCard v-for="news in mockNews" :key="news.id" :news="news" />
        </div>
      </div>

      <!-- Detail Panel -->
      <div v-if="detailPanelOpen" class="w-96 overflow-auto p-6 bg-muted/20">
        <div class="space-y-4">
          <div>
            <h2 class="font-medium mb-2">详情</h2>
            <p class="text-sm text-muted-foreground">选择一条新闻查看详细信息</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
