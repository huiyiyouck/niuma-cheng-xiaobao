<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { queryLogs } from "@/lib/api";
import type { LogEntry } from "@/lib/types";
import { useToast } from "@/composables/useToast";

// v0.5: 系统日志页（原型对齐：真表格 + 等宽字体 + 浅底深字 badge）
const toast = useToast();
const entries = ref<LogEntry[]>([]);
const total = ref(0);
const loading = ref(false);
const errorText = ref<string | null>(null);

const LEVEL_OPTIONS = ["ERROR", "WARNING", "INFO", "DEBUG"] as const;
const SOURCE_OPTIONS = ["api", "worker", "scheduler"] as const;

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

function badgeClass(lv: string): string {
  const map: Record<string, string> = {
    ERROR: "badge-error",
    WARNING: "badge-warn",
    INFO: "badge-info",
    DEBUG: "badge-debug",
  };
  return `badge ${map[lv] || "badge-info"}`;
}

function rowClass(lv: string): string {
  if (lv === "ERROR") return "row-error";
  if (lv === "WARNING") return "row-warn";
  return "";
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("zh-CN", { hour12: false });
}

watch([selectedLevel, selectedSource, keyword], () => load());
onMounted(() => load());
</script>

<template>
  <div class="logs-page">
    <div class="page-head">
      <div>
        <div class="page-title">📋 系统日志</div>
        <div class="page-sub">全局 · 不限频道空间</div>
      </div>
      <span class="muted total-info">共 {{ total }} 条</span>
    </div>

    <div v-if="errorText" class="error-bar">
      <span>⚠️</span><span>{{ errorText }}</span>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <select v-model="selectedLevel" class="filter-select">
        <option value="">全部级别</option>
        <option v-for="lv in LEVEL_OPTIONS" :key="lv" :value="lv">{{ lv }}</option>
      </select>
      <select v-model="selectedSource" class="filter-select">
        <option value="">全部来源</option>
        <option v-for="s in SOURCE_OPTIONS" :key="s" :value="s">{{ s }}</option>
      </select>
      <input class="filter-input" v-model="keyword" placeholder="搜索关键字…" @keydown.enter="load()" />
    </div>

    <!-- 真表格 -->
    <div v-if="loading && entries.length === 0" class="loading-state">加载中…</div>
    <div v-else-if="entries.length === 0" class="empty-state">
      📋 无匹配日志<br><small>试试调整筛选条件</small>
    </div>
    <div v-else class="table-wrap">
      <table class="log-table">
        <thead>
          <tr>
            <th class="th-time">时间</th>
            <th class="th-level">级别</th>
            <th class="th-source">来源</th>
            <th class="th-msg">消息</th>
            <th class="th-act">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(e, idx) in entries"
            :key="(e.timestamp || '') + idx"
            :class="rowClass(e.level)"
          >
            <td class="cell-time">{{ fmtTime(e.timestamp) }}</td>
            <td><span :class="badgeClass(e.level)">{{ e.level === 'WARNING' ? 'WARN' : e.level }}</span></td>
            <td class="cell-source">{{ e.logger }}</td>
            <td class="cell-msg" :title="e.message">{{ e.message }}</td>
            <td><button class="btn btn--xs" @click="copyDetail(e)">📋 复制</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.logs-page { display: flex; flex-direction: column; gap: 14px; }
.total-info { font-size: 11px; }

.filter-bar { display: flex; gap: 8px; align-items: center; margin-bottom: 4px; }
.filter-input {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 7px 12px;
  font-size: 13px;
  outline: none;
  width: 180px;
  font-family: inherit;
}
.filter-input:focus { border-color: var(--accent); }

.table-wrap {
  background: var(--card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  overflow: hidden;
}
.log-table {
  width: 100%;
  border-collapse: collapse;
}
.log-table th {
  background: #F8FAFB;
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding: 10px 14px;
  text-align: left;
  border-bottom: 2px solid var(--border);
  white-space: nowrap;
}
.th-time   { width: 110px; }
.th-level  { width: 80px; }
.th-source { width: 90px; }
.th-act    { width: 80px; }

.log-table td {
  padding: 8px 14px;
  font-size: 12px;
  border-bottom: 1px solid var(--border-light);
  font-family: var(--font-mono);
  vertical-align: middle;
}
.log-table tbody tr:last-child td { border-bottom: none; }
.log-table tbody tr:hover td { background: var(--hover-bg); }

.row-error td { background: var(--danger-light); }
.row-warn  td { background: var(--warning-light); }
.row-error:hover td { background: var(--danger-light); }
.row-warn:hover  td { background: var(--warning-light); }

.cell-time {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
}
.cell-source {
  font-size: 11px;
  color: var(--text-secondary);
}
.cell-msg {
  max-width: 500px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
