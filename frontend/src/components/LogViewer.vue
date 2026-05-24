<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { queryLogs, getLogsConfig } from "@/lib/api";
import type { LogEntry } from "@/lib/types";

const entries = ref<LogEntry[]>([]);
const total = ref(0);
const hasMore = ref(false);
const loading = ref(false);
const errorText = ref<string | null>(null);

const levels = ref<string[]>(["DEBUG", "INFO", "WARNING", "ERROR"]);
const sources = ref<string[]>(["api", "worker"]);

const level = ref("");
const source = ref("");
const keyword = ref("");
const timeRange = ref("24h");
const autoRefresh = ref(false);
const limit = 100;

let refreshTimer: ReturnType<typeof setInterval> | null = null;

function timeRangeToFrom(): string | undefined {
  if (!timeRange.value) return undefined;
  const now = Date.now();
  const map: Record<string, number> = { "1h": 3600000, "6h": 21600000, "24h": 86400000 };
  const ms = map[timeRange.value];
  if (!ms) return undefined;
  return new Date(now - ms).toISOString();
}

async function load(append = false) {
  loading.value = true;
  errorText.value = null;
  try {
    const offset = append ? entries.value.length : 0;
    const res = await queryLogs({
      level: level.value || undefined,
      source: source.value || undefined,
      keyword: keyword.value || undefined,
      from: timeRangeToFrom(),
      limit,
      offset,
    });
    if (append) {
      entries.value = entries.value.concat(res.entries);
    } else {
      entries.value = res.entries;
    }
    total.value = res.total;
    hasMore.value = res.has_more;
  } catch (e) {
    errorText.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

function loadMore() {
  load(true);
}

function levelBadge(l: string) {
  if (l === "ERROR") return "badge--danger";
  if (l === "WARNING") return "badge--warning";
  if (l === "INFO") return "badge--success";
  return "badge--muted";
}

function toggleAutoRefresh() {
  autoRefresh.value = !autoRefresh.value;
  if (autoRefresh.value) {
    refreshTimer = setInterval(() => load(), 10000);
  } else if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

watch([level, source, timeRange], () => load());

onMounted(async () => {
  try {
    const cfg = await getLogsConfig();
    if (cfg.levels) levels.value = cfg.levels;
    if (cfg.sources) sources.value = cfg.sources;
  } catch { /* 使用默认值 */ }
  await load();
});

onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer);
});
</script>

<template>
  <div class="lv">
    <div v-if="errorText" class="error">{{ errorText }}</div>

    <div class="lv-toolbar">
      <div class="row">
        <select class="select" v-model="level" style="width:auto">
          <option value="">全部级别</option>
          <option v-for="l in levels" :key="l" :value="l">{{ l }}</option>
        </select>
        <select class="select" v-model="source" style="width:auto">
          <option value="">全部来源</option>
          <option v-for="s in sources" :key="s" :value="s">{{ s }}</option>
        </select>
        <select class="select" v-model="timeRange" style="width:auto">
          <option value="">全部时间</option>
          <option value="1h">最近 1 小时</option>
          <option value="6h">最近 6 小时</option>
          <option value="24h">最近 24 小时</option>
        </select>
        <input class="input" v-model="keyword" placeholder="搜索关键字…" style="width:auto;flex:1;min-width:140px" @keydown.enter="load()" />
        <button class="btn btn-sm" @click="load()">搜索</button>
        <button
          class="btn btn-sm"
          :class="autoRefresh ? 'primary' : ''"
          @click="toggleAutoRefresh"
        >{{ autoRefresh ? '⏸ 停止刷新' : '▶ 自动刷新' }}</button>
      </div>
    </div>

    <div class="lv-summary muted" style="font-size:11px">
      共 {{ total }} 条日志<span v-if="autoRefresh"> · 每 10s 自动刷新</span>
    </div>

    <div v-if="loading && entries.length === 0" class="muted" style="padding:12px 0">加载中…</div>

    <div v-if="!loading && entries.length === 0" class="card empty muted">暂无日志</div>

    <div v-for="e in entries" :key="e.timestamp + e.message" class="lv-entry">
      <div class="lv-entry-top">
        <span class="badge" :class="levelBadge(e.level)">{{ e.level }}</span>
        <span class="badge badge--muted">{{ e.logger }}</span>
        <span class="muted" style="font-size:10px">{{ new Date(e.timestamp).toLocaleString() }}</span>
      </div>
      <div class="lv-msg">{{ e.message }}</div>
      <div class="lv-extra" v-if="e.extra && Object.keys(e.extra).length">
        <code>{{ JSON.stringify(e.extra) }}</code>
      </div>
    </div>

    <div class="more" v-if="hasMore">
      <button class="btn" :disabled="loading" @click="loadMore">
        {{ loading ? '加载中…' : '加载更多' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.lv { display: flex; flex-direction: column; gap: 8px; }
.lv-toolbar .select { width: auto; min-width: 100px; }
.lv-summary { padding: 4px 0; }
.lv-entry {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
}
.lv-entry-top { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.lv-msg { font-size: 12px; color: #334155; line-height: 1.5; word-break: break-all; }
.lv-extra { margin-top: 6px; }
.lv-extra code {
  font-size: 10px;
  color: var(--muted);
  background: #f8fafc;
  padding: 4px 8px;
  border-radius: 6px;
  display: block;
  word-break: break-all;
  white-space: pre-wrap;
}
.more { display: flex; justify-content: center; padding-top: 8px; }
.empty { padding: 28px 16px; text-align: center; }
.btn-sm { padding: 6px 10px; font-size: 11px; border-radius: 8px; }
.error {
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(239,68,68,.25);
  background: rgba(239,68,68,.06);
  color: #991b1b;
  font-size: 13px;
}
</style>
