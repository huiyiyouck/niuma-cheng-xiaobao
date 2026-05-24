<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { queryLogs, getLogsConfig } from "@/lib/api";
import type { LogEntry } from "@/lib/types";

const entries = ref<LogEntry[]>([]);
const total = ref(0);
const hasMore = ref(false);
const loading = ref(false);
const errorText = ref<string | null>(null);

const LEVEL_OPTIONS = ["DEBUG", "INFO", "WARNING", "ERROR"] as const;
const SOURCE_OPTIONS = ["api", "worker"] as const;

const selectedLevels = ref<Set<string>>(new Set());
const selectedSources = ref<Set<string>>(new Set());
const keyword = ref("");
const timeFrom = ref("");
const timeTo = ref("");
const autoRefresh = ref(false);
const expandedLog = ref<string | null>(null);
const limit = 100;

let refreshTimer: ReturnType<typeof setInterval> | null = null;

function toggleLevel(lv: string) {
  const next = new Set(selectedLevels.value);
  if (next.has(lv)) next.delete(lv); else next.add(lv);
  selectedLevels.value = next;
}
function toggleSource(s: string) {
  const next = new Set(selectedSources.value);
  if (next.has(s)) next.delete(s); else next.add(s);
  selectedSources.value = next;
}
function levelChipClass(lv: string) {
  const active = selectedLevels.value.has(lv);
  const color: Record<string, string> = { DEBUG: "chip--gray", INFO: "chip--blue", WARNING: "chip--orange", ERROR: "chip--red" };
  return { "lv-chip": true, active, [color[lv] ?? "chip--gray"]: true };
}
function sourceChipClass(s: string) {
  return { "lv-chip": true, active: selectedSources.value.has(s) };
}

async function load(append = false) {
  loading.value = true;
  errorText.value = null;
  try {
    const offset = append ? entries.value.length : 0;
    const levelParam = selectedLevels.value.size > 0 ? [...selectedLevels.value].join(",") : undefined;
    const sourceParam = selectedSources.value.size > 0 ? [...selectedSources.value].join(",") : undefined;
    const res = await queryLogs({
      level: levelParam,
      source: sourceParam,
      keyword: keyword.value || undefined,
      from: timeFrom.value || undefined,
      to: timeTo.value || undefined,
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

function loadMore() { load(true); }

function toggleAutoRefresh() {
  autoRefresh.value = !autoRefresh.value;
  if (autoRefresh.value) {
    refreshTimer = setInterval(() => load(), 10000);
  } else if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

function toggleExpand(key: string) {
  expandedLog.value = expandedLog.value === key ? null : key;
}

watch([selectedLevels, selectedSources, timeFrom, timeTo], () => load());

onMounted(async () => {
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
      <!-- 级别 Chip 多选 -->
      <div class="lv-chip-row">
        <span class="lv-label">级别：</span>
        <button
          v-for="lv in LEVEL_OPTIONS" :key="lv"
          class="lv-chip"
          :class="levelChipClass(lv)"
          @click="toggleLevel(lv)"
        >{{ lv }}</button>
      </div>
      <!-- 来源 Chip 多选 -->
      <div class="lv-chip-row">
        <span class="lv-label">来源：</span>
        <button
          v-for="s in SOURCE_OPTIONS" :key="s"
          class="lv-chip"
          :class="sourceChipClass(s)"
          @click="toggleSource(s)"
        >{{ s }}</button>
      </div>
      <!-- 时间范围 + 搜索 -->
      <div class="lv-filter-row">
        <input class="input lv-time-input" type="datetime-local" v-model="timeFrom" title="开始时间" />
        <span class="muted" style="font-size:11px">—</span>
        <input class="input lv-time-input" type="datetime-local" v-model="timeTo" title="结束时间" />
        <input class="input" v-model="keyword" placeholder="搜索关键字…" style="flex:1;min-width:120px" @keydown.enter="load()" />
        <button
          class="btn btn-sm"
          :class="autoRefresh ? 'primary' : ''"
          @click="toggleAutoRefresh"
        >{{ autoRefresh ? '⏸ 停止刷新' : '▶ 自动刷新' }}</button>
      </div>
    </div>

    <div class="lv-summary muted">
      共 {{ total }} 条日志<span v-if="autoRefresh"> · 每 10s 自动刷新</span>
    </div>

    <div v-if="loading && entries.length === 0" class="muted" style="padding:12px 0">加载中…</div>

    <div v-if="!loading && entries.length === 0" class="card empty muted">暂无日志记录</div>

    <div v-for="e in entries" :key="e.timestamp + e.message" class="lv-entry" @click="toggleExpand(e.timestamp + e.message)">
      <div class="lv-entry-top">
        <span class="lv-level-badge" :class="`lv-${e.level.toLowerCase()}`">{{ e.level }}</span>
        <span class="badge badge--muted">{{ e.logger }}</span>
        <span class="muted" style="font-size:10px;font-family:monospace">{{ new Date(e.timestamp).toLocaleString() }}</span>
      </div>
      <div class="lv-msg">{{ e.message }}</div>
      <div class="lv-extra" v-if="expandedLog === e.timestamp + e.message && e.extra && Object.keys(e.extra).length">
        <code>{{ JSON.stringify(e.extra, null, 2) }}</code>
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
.lv { display: flex; flex-direction: column; gap: 10px; }
.lv-toolbar { display: flex; flex-direction: column; gap: 8px; }
.lv-chip-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.lv-label { font-size: 11px; font-weight: 700; color: var(--muted); min-width: 40px; }
.lv-chip {
  padding: 4px 12px; border-radius: 999px; font-size: 11px;
  font-weight: 600; border: 1px solid var(--border);
  background: var(--card); color: var(--muted); cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.lv-chip.active { border-color: currentColor; }
/* 级别 Chip 颜色 */
.lv-chip.chip--gray.active { background: #e5e7eb; color: #6b7280; border-color: #9ca3af; }
.lv-chip.chip--blue.active { background: #e8f4fd; color: #3498db; border-color: #3498db; }
.lv-chip.chip--orange.active { background: #fef3e2; color: #f39c12; border-color: #f39c12; }
.lv-chip.chip--red.active { background: #fde8e8; color: #e74c3c; border-color: #e74c3c; }
.lv-filter-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.lv-time-input { width: auto; min-width: 140px; font-size: 11px; }
.lv-summary { font-size: 11px; padding: 2px 0; }
.lv-entry {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  cursor: pointer;
}
.lv-entry-top { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.lv-msg { font-size: 12px; color: #334155; line-height: 1.5; word-break: break-all; font-family: monospace; }
.lv-extra { margin-top: 6px; }
.lv-extra code {
  font-size: 10px;
  color: var(--muted);
  background: #f8fafc;
  padding: 6px 10px;
  border-radius: 6px;
  display: block;
  word-break: break-all;
  white-space: pre-wrap;
  font-family: monospace;
  max-height: 240px;
  overflow-y: auto;
}
/* 级别 Badge — 方块样式 */
.lv-level-badge {
  padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 700; color: #fff;
}
.lv-info { background: #3498db; }
.lv-warning { background: #f39c12; }
.lv-error { background: #e74c3c; }
.lv-debug { background: #aaa; }
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
