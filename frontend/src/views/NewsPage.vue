<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
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

async function refreshNews() {
  if (!filterSpaceId.value) return;
  loading.value = true; errorText.value = null; offset.value = 0;
  try {
    const page = await listNews(filterSpaceId.value, {
      limit, offset: 0,
      sort: sortBy.value,
      subChannelId: filterSubChannelIds.value.size > 0 ? [...filterSubChannelIds.value].join(",") as any : undefined,
    });
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
    const page = await listNews(filterSpaceId.value, {
      limit, offset: nextOffset,
      sort: sortBy.value,
      subChannelId: filterSubChannelIds.value.size > 0 ? [...filterSubChannelIds.value].join(",") as any : undefined,
    });
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

watch(filterSpaceId, () => {
  refreshNews();
  refreshStats();
  refreshSubChannels();
});
watch(sortBy, () => refreshNews());
watch(filterSubChannelIds, () => refreshNews(), { deep: true });

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
      :spaces="spaces" :selectedId="filterSpaceId" :minScore="minScore"
      @select="(id) => filterSpaceId = id"
      @changeScore="(v) => minScore = v"
      @changeSort="(v) => sortBy = v"
    />
    <!-- 子频道筛选（多选） -->
    <div class="sub-filter" v-if="subChannels.length > 0">
      <button
        class="sub-pill"
        :class="{ active: filterSubChannelIds.size === 0 }"
        @click="filterSubChannelIds = new Set()"
      >全部</button>
      <button
        v-for="sc in subChannels" :key="sc.id"
        class="sub-pill"
        :class="{ active: filterSubChannelIds.has(sc.id) }"
        @click="toggleSubChannel(sc.id)"
      >{{ sc.name }}</button>
    </div>
    <div class="ws-bar">
      <span class="status-dot" :class="wsStatus === 'connected' ? 'status-dot--ok' : wsStatus === 'connecting' ? 'status-dot--warn' : 'status-dot--err'"></span>
      <span class="muted" style="font-size:11px">WS: {{ wsStatus }}</span>
    </div>
    <div v-if="errorText" class="error">{{ errorText }}</div>
    <div v-if="loading" class="muted loading">加载中…</div>
    <div v-if="items.length === 0 && !loading" class="card empty muted">暂无新闻，请先在管理页添加信息来源</div>
    <div class="list" v-if="filteredItems.length > 0">
      <NewsListItem
        v-for="item in filteredItems" :key="item.id" :item="item"
        @click="openDetail(item)"
      />
    </div>
    <div v-if="items.length > 0 && filteredItems.length === 0" class="card empty muted">筛选条件下无匹配新闻</div>
    <div class="more" v-if="items.length > 0">
      <button class="btn" :disabled="loading || !canLoadMore" @click="loadMore">
        {{ canLoadMore ? '加载更多' : '没有更多了' }}
      </button>
    </div>
    <NewsDetailPanel :item="detailItem" @close="detailItem = null" />
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; }
.ws-bar { display: flex; align-items: center; gap: 6px; padding: 4px 0 10px; }
.list { display: flex; flex-direction: column; gap: 6px; }
.loading { padding: 12px 0; }
.empty { padding: 28px 16px; text-align: center; }
.more { display: flex; justify-content: center; padding-top: 12px; }
.error { margin-top: 10px; padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(239,68,68,.25); background: rgba(239,68,68,.06); color: #991b1b; font-size: 13px; }
.sub-filter { display: flex; gap: 6px; flex-wrap: wrap; padding: 0 0 8px; }
.sub-pill {
  padding: 4px 12px; border-radius: 20px; font-size: 11px;
  font-weight: 600; border: 1px solid var(--border);
  background: var(--card); color: var(--muted); cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.sub-pill.active { background: #e8f4fd; color: #3498db; border-color: #3498db; }
</style>
