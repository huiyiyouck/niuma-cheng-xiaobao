<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { listNews, listSpaces, listChannels, getSpaceStats, getGlobalStats } from "@/lib/api";
import type { Space, Channel, ProcessedNews, UUID, NewsSort, SpaceStats } from "@/lib/types";
import StatsCards from "@/components/StatsCards.vue";
import SpacePills from "@/components/SpacePills.vue";
import ChannelPills from "@/components/ChannelPills.vue";
import NewsListItem from "@/components/NewsListItem.vue";
import NewsDetailPanel from "@/components/NewsDetailPanel.vue";

const loading = ref(false);
const errorText = ref<string | null>(null);
const spaces = ref<Space[]>([]);
const channels = ref<Channel[]>([]);
const filterSpaceId = ref<UUID | null>(null);
// v0.5: 频道使用两层 mini Pill，不再使用 sub_channel_ids
const filterChannelId = ref<UUID | null>(null); // null = 全部
const minScore = ref(0);
const sortBy = ref<NewsSort>("published_desc");
const searchQuery = ref("");

const items = ref<ProcessedNews[]>([]);
const limit = 30;
const offset = ref(0);
const canLoadMore = ref(true);

const stats = ref<SpaceStats>({ total_news: -1, today_new: -1, active_sources: -1, channel_count: -1 });

const detailItem = ref<ProcessedNews | null>(null);

const filteredItems = computed(() => {
  let result = items.value;
  if (minScore.value > 0) {
    result = result.filter(i => i.importance_score >= minScore.value);
  }
  return result;
});

async function refreshSpaces() {
  try {
    spaces.value = await listSpaces();
  } catch (e) {
    errorText.value = e instanceof Error ? e.message : String(e);
    return;
  }
  if (!filterSpaceId.value && spaces.value.length > 0) {
    filterSpaceId.value = spaces.value[0].id;
  }
}

async function refreshStats() {
  try {
    if (filterSpaceId.value) {
      stats.value = await getSpaceStats(filterSpaceId.value);
    } else {
      const g = await getGlobalStats();
      stats.value = { total_news: 0, today_new: g.today_new, active_sources: g.active_sources, channel_count: g.active_spaces };
    }
  } catch { /* 统计加载失败不影响新闻列表 */ }
}

async function refreshChannels() {
  if (!filterSpaceId.value) { channels.value = []; return; }
  try {
    channels.value = await listChannels(filterSpaceId.value);
  } catch { channels.value = []; }
}

function buildNewsParams(offsetVal: number) {
  return {
    limit,
    offset: offsetVal,
    sort: sortBy.value,
    channelId: filterChannelId.value || undefined,
    q: searchQuery.value || undefined,
  } as any;
}

async function refreshNews() {
  if (!filterSpaceId.value) return;
  loading.value = true; errorText.value = null; offset.value = 0;
  try {
    const page = await listNews(filterSpaceId.value, buildNewsParams(0));
    items.value = page;
    canLoadMore.value = page.length >= limit;
  } catch (e) {
    errorText.value = e instanceof Error ? e.message : String(e);
  } finally { loading.value = false; }
}

async function loadMore() {
  if (!filterSpaceId.value || !canLoadMore.value) return;
  loading.value = true;
  const nextOffset = offset.value + limit;
  try {
    const page = await listNews(filterSpaceId.value, buildNewsParams(nextOffset));
    items.value = items.value.concat(page);
    offset.value = nextOffset;
    canLoadMore.value = page.length >= limit;
  } catch (e) {
    errorText.value = e instanceof Error ? e.message : String(e);
  } finally { loading.value = false; }
}

function openDetail(item: ProcessedNews) {
  detailItem.value = item;
}

// 防抖处理频道切换和排序变更
const debouncedRefreshNews = useDebounceFn(refreshNews, 300);

watch(filterSpaceId, () => {
  filterChannelId.value = null;
  refreshNews();
  refreshStats();
  refreshChannels();
});
watch(sortBy, () => debouncedRefreshNews());
watch(filterChannelId, () => debouncedRefreshNews());
watch(searchQuery, () => refreshNews());

async function onSpaceSelect(id: string) {
  filterSpaceId.value = id;
}

async function onChannelSelect(id: string | null) {
  filterChannelId.value = id;
}

onMounted(async () => {
  await refreshSpaces();
  await refreshNews();
  await refreshStats();
  await refreshChannels();
});
</script>

<template>
  <div class="page">
    <!-- v0.4 StatsCards 保留，适配新类型 -->
    <StatsCards :stats="stats" />

    <!-- 空间/频道两层 mini Pill -->
    <SpacePills
      :spaces="spaces"
      :selectedId="filterSpaceId"
      mode="mini"
      @select="onSpaceSelect"
      @changed="refreshSpaces()"
    />

    <ChannelPills
      v-if="channels.length > 0"
      :channels="channels"
      :selectedId="filterChannelId"
      mode="mini"
      @select="onChannelSelect"
      @changed="refreshChannels()"
    />

    <!-- 评分 + 排序 -->
    <div class="filter-right">
      <label class="score-filter">
        评分 &ge; <strong>{{ minScore.toFixed(1) }}</strong>
        <input type="range" min="0" max="10" step="0.5" :value="minScore"
          @input="minScore = parseFloat(($event.target as HTMLInputElement).value)" />
      </label>
      <select
        class="sort-select"
        :value="sortBy"
        @change="sortBy = ($event.target as HTMLSelectElement).value as NewsSort"
      >
        <option value="published_desc">最新优先</option>
        <option value="score_desc">最高评分</option>
        <option value="score_asc">最低评分</option>
      </select>
      <input
        class="search-input"
        v-model="searchQuery"
        placeholder="搜索新闻…"
        @keydown.enter="refreshNews()"
      />
    </div>

    <div v-if="errorText" class="error-bar"><span>&#9888;</span><span>{{ errorText }}</span></div>

    <!-- 骨架屏 -->
    <div v-if="loading && items.length === 0" class="skeleton-list">
      <div v-for="i in 3" :key="i" class="skeleton-card">
        <div class="sk-line sk-title"></div>
        <div class="sk-line sk-body"></div>
        <div class="sk-line sk-body sk-short"></div>
        <div class="sk-tags"><span class="sk-tag"></span><span class="sk-tag"></span></div>
      </div>
    </div>

    <div v-if="items.length === 0 && !loading" class="empty-state">暂无新闻<br><small>请先在管理页添加信息来源</small></div>
    <div class="list" v-if="filteredItems.length > 0">
      <NewsListItem v-for="item in filteredItems" :key="item.id" :item="item" @click="openDetail(item)" />
    </div>
    <div v-if="items.length > 0 && filteredItems.length === 0" class="empty-state">筛选条件下无匹配新闻<br><small>试试调整最低评分或切换频道</small></div>
    <div class="more" v-if="items.length > 0">
      <button class="btn load-more" :disabled="loading || !canLoadMore" @click="loadMore">
        {{ canLoadMore ? '加载更多' : '没有更多了' }}
      </button>
    </div>
    <NewsDetailPanel :item="detailItem" @close="detailItem = null" />
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 12px; }
.list { display: flex; flex-direction: column; gap: 8px; }
.more { display: flex; justify-content: center; padding-top: 12px; }
.load-more { padding: 10px 28px; font-size: 13px; font-weight: 700; }

.filter-right {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
}
.score-filter { font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; }
.score-filter input { width: 80px; accent-color: var(--accent); }
.sort-select {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  font-size: 11px;
  min-width: 110px;
  background: var(--card);
}
.search-input {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  font-size: 11px;
  min-width: 150px;
  outline: none;
  margin-left: auto;
}
.search-input:focus { border-color: var(--accent); }

/* Skeleton */
.skeleton-list { display: flex; flex-direction: column; gap: 8px; }
.skeleton-card {
  background: var(--card); border: 1px solid var(--border-light);
  border-radius: 12px; padding: 18px 20px;
}
.sk-line { height: 14px; border-radius: 6px; margin-bottom: 10px;
  background: linear-gradient(90deg, #f0f1f3 25%, #e6e7eb 50%, #f0f1f3 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite;
}
.sk-title { width: 65%; height: 16px; }
.sk-body { width: 90%; }
.sk-short { width: 75%; }
.sk-tags { display: flex; gap: 8px; }
.sk-tag { width: 48px; height: 22px; border-radius: 20px;
  background: linear-gradient(90deg, #f0f1f3 25%, #e6e7eb 50%, #f0f1f3 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.empty-state { text-align: center; padding: 48px 24px; color: var(--text-muted); font-size: 14px; font-weight: 600; }
.empty-state small { font-size: 12px; font-weight: 400; display: block; margin-top: 4px; }

.error-bar {
  display: flex; align-items: center; gap: 8px; padding: 10px 14px;
  border-radius: 8px; background: var(--danger-light);
  border: 1px solid rgba(231,76,60,0.2); color: #991b1b; font-size: 12px;
}
</style>
