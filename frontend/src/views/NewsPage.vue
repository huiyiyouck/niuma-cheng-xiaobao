<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useWS } from "@/lib/ws";
import { listNews, listSpaces } from "@/lib/api";
import type { ChannelSpace, ProcessedNews, StatsOverview, UUID } from "@/lib/types";
import StatsCards from "@/components/StatsCards.vue";
import ChannelFilter from "@/components/ChannelFilter.vue";
import NewsListItem from "@/components/NewsListItem.vue";

const loading = ref(false);
const errorText = ref<string | null>(null);
const spaces = ref<ChannelSpace[]>([]);
const filterSpaceId = ref<UUID | null>(null);
const minScore = ref(0);
const sortBy = ref<"latest" | "score">("latest");

const items = ref<ProcessedNews[]>([]);
const limit = 30;
const offset = ref(0);
const canLoadMore = ref(true);

const { status: wsStatus, connect: wsConnect, disconnect: wsDisconnect } = useWS();

const stats = computed<StatsOverview>(() => ({
  today_new: -1,
  today_new_change: 0,
  avg_score: null,
  avg_score_change: null,
  active_channels: -1,
  total_channels: -1,
  pending_tasks: -1,
}));

const filteredItems = computed(() => {
  let result = items.value;
  if (minScore.value > 0) {
    result = result.filter(i => i.importance_score >= minScore.value);
  }
  if (sortBy.value === "score") {
    result = [...result].sort((a, b) => b.importance_score - a.importance_score);
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

async function refreshNews() {
  if (!filterSpaceId.value) return;
  loading.value = true; errorText.value = null; offset.value = 0;
  try {
    const page = await listNews(filterSpaceId.value, { limit, offset: 0 });
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
    const page = await listNews(filterSpaceId.value, { limit, offset: nextOffset });
    items.value = items.value.concat(page);
    offset.value = nextOffset;
    canLoadMore.value = page.length >= limit;
  } catch (e) {
    errorText.value = e instanceof Error ? e.message : String(e);
  } finally { loading.value = false; }
}

watch(filterSpaceId, () => refreshNews());

onMounted(async () => {
  await refreshSpaces();
  if (filterSpaceId.value) {
    wsConnect(filterSpaceId.value, () => refreshNews());
  }
  await refreshNews();
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
    <div class="ws-bar">
      <span class="status-dot" :class="wsStatus === 'connected' ? 'status-dot--ok' : wsStatus === 'connecting' ? 'status-dot--warn' : 'status-dot--err'"></span>
      <span class="muted" style="font-size:11px">WS: {{ wsStatus }}</span>
    </div>
    <div v-if="errorText" class="error">{{ errorText }}</div>
    <div v-if="loading" class="muted loading">加载中…</div>
    <div v-if="items.length === 0 && !loading" class="card empty muted">暂无新闻，等 Worker 处理一会儿再刷新</div>
    <div class="list" v-if="filteredItems.length > 0">
      <NewsListItem v-for="item in filteredItems" :key="item.id" :item="item" />
    </div>
    <div v-if="items.length > 0 && filteredItems.length === 0" class="card empty muted">筛选条件下无匹配新闻</div>
    <div class="more" v-if="items.length > 0">
      <button class="btn" :disabled="loading || !canLoadMore" @click="loadMore">
        {{ canLoadMore ? '加载更多' : '没有更多了' }}
      </button>
    </div>
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
</style>
