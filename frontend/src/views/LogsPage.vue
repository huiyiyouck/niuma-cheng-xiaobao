<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { queryLogs } from "@/lib/api";
import type { LogEntry } from "@/lib/types";
import { useToast } from "@/composables/useToast";

const toast = useToast();
const entries = ref<LogEntry[]>([]);
const total = ref(0);
const loading = ref(false);
const errorText = ref<string | null>(null);

const LEVEL_OPTIONS = ["ERROR", "WARNING", "INFO", "DEBUG"] as const;
const SOURCE_OPTIONS = ["api", "worker"] as const;

const selectedLevel = ref("");
const selectedSource = ref("");
const keyword = ref("");
const limit = 100;

async function load() {
  loading.value = true;
  errorText.value = null;
  try {
    const res = await queryLogs({
      level: selectedLevel.value || undefined,
      source: selectedSource.value || undefined,
      keyword: keyword.value || undefined,
      limit,
      offset: 0,
    });
    entries.value = res.entries;
    total.value = res.total;
  } catch (e) {
    errorText.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

async function copyDetail(entry: LogEntry) {
  try {
    await navigator.clipboard.writeText(JSON.stringify(entry, null, 2));
    toast.success("已复制到剪贴板");
  } catch {
    toast.error("复制失败");
  }
}

function levelBadgeClass(lv: string) {
  return `lv-badge lv-badge--${lv.toLowerCase()}`;
}
function levelLabel(lv: string) {
  const map: Record<string, string> = { ERROR: "🔴", WARNING: "🟡", INFO: "🔵", DEBUG: "" };
  return map[lv] || lv;
}

watch([selectedLevel, selectedSource, keyword], () => load());

onMounted(() => load());
</script>

<template>
  <div class="logs-page">
    <div class="page-header">
      <span class="page-title">📋 系统日志</span>
      <span class="page-sub">全局 · 不限频道空间</span>
    </div>

    <div v-if="errorText" class="error-bar">
      <span>⚠️</span><span>{{ errorText }}</span>
    </div>

    <div class="toolbar">
      <select v-model="selectedLevel" class="select" style="width:auto;min-width:100px;">
        <option value="">全部级别</option>
        <option v-for="lv in LEVEL_OPTIONS" :key="lv" :value="lv">{{ levelLabel(lv) }} {{ lv }}</option>
      </select>
      <select v-model="selectedSource" class="select" style="width:auto;min-width:100px;">
        <option value="">全部来源</option>
        <option v-for="s in SOURCE_OPTIONS" :key="s" :value="s">{{ s }}</option>
      </select>
      <input class="input" v-model="keyword" placeholder="搜索关键字…" style="width:180px" @keydown.enter="load()" />
      <span class="summary muted">共 {{ total }} 条</span>
    </div>

    <div v-if="loading && entries.length === 0" class="muted" style="padding:12px 0">加载中…</div>
    <div v-else-if="entries.length === 0" class="empty-state">📋 无匹配日志<br><small>试试调整筛选条件</small></div>
    <div v-else class="log-table">
      <div class="log-header">
        <span class="col-time">时间</span>
        <span class="col-level">级别</span>
        <span class="col-source">来源</span>
        <span class="col-msg">消息</span>
        <span class="col-action">操作</span>
      </div>
      <div
        v-for="e in entries" :key="(e.timestamp || '') + (e.message || '')"
        class="log-row"
        :class="{ 'row--error': e.level === 'ERROR', 'row--warn': e.level === 'WARNING' }"
      >
        <span class="col-time">{{ new Date(e.timestamp).toLocaleString() }}</span>
        <span class="col-level"><span :class="levelBadgeClass(e.level)">{{ e.level }}</span></span>
        <span class="col-source">{{ e.logger }}</span>
        <span class="col-msg" :title="e.message">{{ e.message }}</span>
        <span class="col-action">
          <button class="btn-sm" @click="copyDetail(e)">📋 复制</button>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.logs-page { display: flex; flex-direction: column; gap: 14px; }
.page-header { display: flex; align-items: baseline; gap: 10px; margin-bottom: 2px; }
.page-title { font-size: 14px; font-weight: 700; color: var(--text); }
.page-sub { font-size: 11px; color: var(--text-muted); }
.toolbar { display: flex; gap: 8px; align-items: center; padding: 4px 0 10px; }
.select, .input { font-size: 12px; padding: 6px 10px; border-radius: 8px; border: 1px solid var(--border); }
.summary { font-size: 11px; margin-left: auto; }

.log-table {
  border: 1px solid var(--border-light); border-radius: 12px; background: var(--card);
  overflow: hidden;
}
.log-header {
  display: grid; grid-template-columns: 150px 70px 70px 1fr 60px;
  gap: 8px; padding: 8px 14px;
  background: #F8FAFB; border-bottom: 2px solid var(--border);
  font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;
}
.log-row {
  display: grid; grid-template-columns: 150px 70px 70px 1fr 60px;
  gap: 8px; padding: 8px 14px; font-size: 12px;
  border-bottom: 1px solid var(--border-light);
}
.log-row:hover { background: #F8FAFB; }
.log-row:last-child { border-bottom: none; }
.row--error { background: var(--danger-light); }
.row--warn  { background: var(--warning-light); }
.col-time { font-size: 10px; color: var(--text-muted); font-family: monospace; }
.col-msg { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 360px; }
.col-source { color: var(--text-secondary); }

.lv-badge {
  display: inline-block; padding: 2px 8px; border-radius: 20px;
  font-size: 10px; font-weight: 700;
}
.lv-badge--error  { background: var(--danger); color: #FFF; }
.lv-badge--warning { background: var(--warning); color: #FFF; }
.lv-badge--info   { background: #E2E8F0; color: var(--text-secondary); }
.lv-badge--debug  { background: #F1F5F9; color: var(--text-muted); }

.btn-sm { padding: 3px 8px; font-size: 10px; border-radius: 6px; border: 1px solid var(--border); background: var(--card); cursor: pointer; color: var(--text-muted); }
.btn-sm:hover { color: var(--text); border-color: var(--text-muted); }

.empty-state { text-align: center; padding: 48px 24px; color: var(--text-muted); font-size: 14px; font-weight: 600; }
.empty-state small { font-size: 12px; font-weight: 400; display: block; margin-top: 4px; }
.error-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; border-radius: 8px;
  background: var(--danger-light); border: 1px solid rgba(231,76,60,0.2);
  color: #991b1b; font-size: 12px; font-weight: 500;
}
</style>
