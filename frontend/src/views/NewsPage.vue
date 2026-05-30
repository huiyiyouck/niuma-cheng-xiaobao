<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { useWS } from "@/lib/ws";
import { listNews, listSpaces, listSubChannels, getChannelStats, getGlobalStats } from "@/lib/api";
import type { ChannelSpace, ProcessedNews, SubChannel, ChannelStats, UUID, NewsSort } from "@/lib/types";
import StatsCards from "@/components/StatsCards.vue";
import ChannelFilter from "@/components/ChannelFilter.vue";
import NewsListItem from "@/components/NewsListItem.vue";
import NewsDetailPanel from "@/components/NewsDetailPanel.vue";

const loading = ref(false);
const errorText = ref<string | null>(null);
const spaces = ref<ChannelSpace[]>([]);
const filterSpaceId = ref<UUID | null>(null);
const minScore = ref(0);
const sortBy = ref<NewsSort>("published_desc");
const searchQuery = ref("");
const subChannels = ref<SubChannel[]>([]);
const filterSubChannelIds = ref<Set<UUID>>(new Set());

function toggleSubChannel(id: UUID) {
  const next = new Set(filterSubChannelIds.value);
  if (next.has(id)) next.delete(id); else next.add(id);
  filterSubChannelIds.value = next;
}

const items = ref<ProcessedNews[]>([]);
const limit = 30;
const offset = ref(0);
const canLoadMore = ref(true);

const stats = ref<ChannelStats>({ total_news: -1, today_new: -1, active_sources: -1, sub_channel_count: -1 });

const detailItem = ref<ProcessedNews | null>(null);

const { status: wsStatus, connect: wsConnect, disconnect: wsDisconnect } = useWS();

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
      stats.value = await getChannelStats(filterSpaceId.value);
    } else {
      stats.value = await getGlobalStats();
    }
  } catch { /* 统计加载失败不影响新闻列表 */ }
}

async function refreshSubChannels() {
  if (!filterSpaceId.value) { subChannels.value = []; return; }
  try {
    subChannels.value = await listSubChannels(filterSpaceId.value);
  } catch { subChannels.value = []; }
}

function buildNewsParams(offsetVal: number) {
  return {
    limit,
    offset: offsetVal,
    sort: sortBy.value,
    sub_channel_id: filterSubChannelIds.value.size > 0
      ? [...filterSubChannelIds.value].join(",") as any
      : undefined,
    q: searchQuery.value || undefined as any,
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

// v0.4: 防抖处理子频道切换和排序变更
const debouncedRefreshNews = useDebounceFn(refreshNews, 300);

watch(filterSpaceId, () => {
  refreshNews();
  refreshStats();
  refreshSubChannels();
});
watch(sortBy, () => debouncedRefreshNews());
watch(filterSubChannelIds, () => debouncedRefreshNews(), { deep: true });
watch(searchQuery, () => refreshNews());

onMounted(async () => {
  await refreshSpaces();
  if (filterSpaceId.value) {
    wsConnect(filterSpaceId.value, () => refreshNews());
  }
  await refreshNews();
  await refreshStats();
  await refreshSubChannels();
});
onBeforeUnmount(() => wsDisconnect());
</script>

<template>
  <div class="page">
    <StatsCards :stats="stats" />
    <ChannelFilter
      :spaces="spaces" :selectedId="filterSpaceId" :minScore="minScore" :sortBy="sortBy"
      @select="(id) => filterSpaceId = id"
      @changeScore="(v) => minScore = v"
      @changeSort="(v) => sortBy = v"
      @search="(q) => searchQuery = q"
    />
    <!-- 子频道筛选（多选） -->
    <div class="sub-filter" v-if="subChannels.length > 0">
      <button class="sub-pill" :class="{ active: filterSubChannelIds.size === 0 }" @click="filterSubChannelIds = new Set()">全部</button>
      <button
        v-for="sc in subChannels" :key="sc.id" class="sub-pill"
        :class="{ active: filterSubChannelIds.has(sc.id) }"
        @click="toggleSubChannel(sc.id)"
      >{{ sc.name }}</button>
    </div>
    <div class="ws-bar">
      <span class="status-dot" :class="wsStatus === 'connected' ? 'status-dot--ok' : wsStatus === 'connecting' ? 'status-dot--warn' : 'status-dot--err'"></span>
      <span class="ws-text">WS: {{ wsStatus }}</span>
    </div>
    <div v-if="errorText" class="error-bar"><span>⚠️</span><span>{{ errorText }}</span></div>

    <!-- 骨架屏 -->
    <div v-if="loading && items.length === 0" class="skeleton-list">
      <div v-for="i in 3" :key="i" class="skeleton-card">
        <div class="sk-line sk-title"></div>
        <div class="sk-line sk-body"></div>
        <div class="sk-line sk-body sk-short"></div>
        <div class="sk-tags"><span class="sk-tag"></span><span class="sk-tag"></span></div>
      </div>
    </div>

    <div v-if="items.length === 0 && !loading" class="empty-state">📭 暂无新闻<br><small>请先在管理页添加信息来源</small></div>
    <div class="list" v-if="filteredItems.length > 0">
      <NewsListItem v-for="item in filteredItems" :key="item.id" :item="item" @click="openDetail(item)" />
    </div>
    <div v-if="items.length > 0 && filteredItems.length === 0" class="empty-state">🔍 筛选条件下无匹配新闻<br><small>试试调整最低评分或切换子频道</small></div>
    <div class="more" v-if="items.length > 0">
      <button class="btn load-more" :disabled="loading || !canLoadMore" @click="loadMore">
        {{ canLoadMore ? '加载更多' : '没有更多了' }}
      </button>
    </div>
    <NewsDetailPanel :item="detailItem" @close="detailItem = null" />
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; }
.ws-bar { display: flex; align-items: center; gap: 6px; padding: 4px 0 10px; }
.ws-text { font-size: 11px; color: var(--text-muted); }
.list { display: flex; flex-direction: column; gap: 8px; }
.more { display: flex; justify-content: center; padding-top: 12px; }
.load-more { padding: 10px 28px; font-size: 13px; font-weight: 700; }

.sub-filter { display: flex; gap: 6px; flex-wrap: wrap; padding: 0 0 8px; }
.sub-pill {
  padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 600;
  border: 1px solid var(--border); background: var(--card); color: var(--text-secondary);
  cursor: pointer; transition: all 0.15s;
}
.sub-pill:hover { border-color: var(--accent); color: var(--accent); }
.sub-pill.active { background: var(--accent); color: #FFF; border-color: var(--accent); }

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
