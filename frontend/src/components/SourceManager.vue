<script setup lang="ts">
import { onMounted, reactive, ref, watch } from "vue";
import {
  listSources, createSource, updateSource, deleteSource,
  detectSourceType,
} from "@/lib/api";
import type { SourceWithBindings, Source } from "@/lib/types";
import VerifyDialog from "@/components/VerifyDialog.vue";

const emit = defineEmits<{ bind: [s: SourceWithBindings] }>();

const sources = ref<SourceWithBindings[]>([]);
const errorText = ref<string | null>(null);
const loading = ref(false);
const statusFilter = ref("");
const typeFilter = ref("");

const showAdd = ref(false);
const addForm = reactive({ display_name: "", source_url: "", type: "" });
const addFormConfig = reactive({ mode: "search", search_query: "", usernames: "" });
const adding = ref(false);
const detectingType = ref(false);

const editing = ref<SourceWithBindings | null>(null);
const editForm = reactive({ display_name: "", source_url: "", type: "" });
const saving = ref(false);

const verifying = ref<Source | null>(null);

async function refresh() {
  loading.value = true;
  try {
    const opts: { status?: string; type?: string } = {};
    if (statusFilter.value) opts.status = statusFilter.value;
    if (typeFilter.value) opts.type = typeFilter.value;
    sources.value = await listSources(opts);
  } catch (e) {
    errorText.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

async function onUrlBlur() {
  const url = addForm.source_url.trim();
  if (!url || addForm.type) return;
  detectingType.value = true;
  try {
    const detected = await detectSourceType(url);
    if (detected.type && detected.type !== "unknown") {
      addForm.type = detected.type;
    }
  } catch { /* 识别失败不影响表单 */ }
  finally { detectingType.value = false; }
}

async function doAdd() {
  if (!addForm.display_name.trim()) return;
  adding.value = true;
  try {
    const payload: { display_name: string; source_url?: string; type?: string; config?: Record<string, unknown> } = {
      display_name: addForm.display_name.trim(),
      source_url: addForm.source_url.trim() || undefined,
      type: addForm.type.trim() || undefined,
    };
    if (addForm.type === "x_twitter") {
      const config: Record<string, unknown> = { mode: addFormConfig.mode };
      if (addFormConfig.mode === "search") {
        config.search_query = addFormConfig.search_query.trim();
      } else {
        config.usernames = addFormConfig.usernames.split(",").map(s => s.trim()).filter(Boolean);
      }
      payload.config = config;
    }
    await createSource(payload);
    addForm.display_name = "";
    addForm.source_url = "";
    addForm.type = "";
    addFormConfig.mode = "search";
    addFormConfig.search_query = "";
    addFormConfig.usernames = "";
    showAdd.value = false;
    await refresh();
  } catch (e) {
    errorText.value = e instanceof Error ? e.message : String(e);
  } finally {
    adding.value = false;
  }
}

function startEdit(s: SourceWithBindings) {
  editing.value = s;
  editForm.display_name = s.display_name;
  editForm.source_url = s.source_url ?? "";
  editForm.type = s.type;
}

async function doEdit() {
  if (!editing.value || !editForm.display_name.trim()) return;
  saving.value = true;
  try {
    await updateSource(editing.value.id, {
      display_name: editForm.display_name.trim(),
      source_url: editForm.source_url.trim() || undefined,
      type: editForm.type.trim() || undefined,
    });
    editing.value = null;
    await refresh();
  } catch (e) {
    errorText.value = e instanceof Error ? e.message : String(e);
  } finally {
    saving.value = false;
  }
}

async function doDelete(s: SourceWithBindings) {
  if (!confirm(`确定删除 Source「${s.display_name}」？关联的抓取数据也将被删除。`)) return;
  try {
    await deleteSource(s.id);
    await refresh();
  } catch (e) {
    errorText.value = e instanceof Error ? e.message : String(e);
  }
}

function typeBadgeStyle(t: string) {
  const map: Record<string, { bg: string; text: string }> = {
    x_twitter: { bg: "#e8f4fd", text: "#3498db" },
    rss: { bg: "#fef3e2", text: "#f39c12" },
    huggingface_papers: { bg: "#f3e8ff", text: "#8e44ad" },
    hf_daily_papers: { bg: "#f3e8ff", text: "#8e44ad" },
  };
  return map[t] ?? { bg: "#f1f5f9", text: "#64748b" };
}

function typeLabel(t: string) {
  const map: Record<string, string> = {
    x_twitter: "X/Twitter", rss: "RSS",
    github_trending: "GitHub", hf_daily_papers: "HF Papers",
    hacker_news: "HN", semantic_scholar: "Scholar", unknown: "未识别",
  };
  return map[t] ?? t;
}

function statusStyle(s: string) {
  if (s === "active" || s === "verified") return { bg: "#e8f8e8", text: "#27ae60" };
  if (s === "error") return { bg: "#fde8e8", text: "#e74c3c" };
  return { bg: "#f1f5f9", text: "#64748b" };
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    unverified: "未验证", verified: "已验证", active: "已启用", error: "错误",
  };
  return map[s] ?? s;
}

function bindingSummary(s: SourceWithBindings): string {
  if (!s.channel_spaces.length) return "—";
  return s.channel_spaces.map(b =>
    `${b.channel_space_name}${b.sub_channel_name ? " / " + b.sub_channel_name : ""}`
  ).join(", ");
}

watch([statusFilter, typeFilter], () => refresh());

onMounted(refresh);
</script>

<template>
  <div class="sm">
    <div v-if="errorText" class="error">{{ errorText }}</div>

    <div class="sm-toolbar">
      <select class="select" v-model="statusFilter" style="width:auto">
        <option value="">全部状态</option>
        <option value="unverified">未验证</option>
        <option value="verified">已验证</option>
        <option value="active">已启用</option>
        <option value="error">错误</option>
      </select>
      <select class="select" v-model="typeFilter" style="width:auto">
        <option value="">全部类型</option>
        <option value="x_twitter">X/Twitter</option>
        <option value="rss">RSS</option>
        <option value="github_trending">GitHub Trending</option>
        <option value="hf_daily_papers">HF Daily Papers</option>
        <option value="hacker_news">Hacker News</option>
        <option value="semantic_scholar">Semantic Scholar</option>
        <option value="unknown">未知</option>
      </select>
      <button class="btn primary btn-sm" @click="showAdd = !showAdd">{{ showAdd ? "取消" : "+ 添加 Source" }}</button>
    </div>

    <!-- 添加弹窗 -->
    <div v-if="showAdd" class="modal-overlay" @click.self="showAdd = false">
      <div class="modal-box">
        <div class="modal-title">添加 Source</div>
        <label class="sm-field">名称 *</label>
        <input class="input" placeholder="显示名称" v-model="addForm.display_name" />
        <label class="sm-field" style="margin-top:10px">URL *</label>
        <input class="input" placeholder="https://…" v-model="addForm.source_url" @blur="onUrlBlur" />
        <label class="sm-field" style="margin-top:10px">类型</label>
        <div class="sm-type-row">
          <select class="select" v-model="addForm.type" style="flex:1">
            <option value="">自动识别</option>
            <option value="x_twitter">X/Twitter</option>
            <option value="rss">RSS</option>
            <option value="github_trending">GitHub Trending</option>
            <option value="hf_daily_papers">HF Daily Papers</option>
            <option value="hacker_news">Hacker News</option>
            <option value="semantic_scholar">Semantic Scholar</option>
            <option value="unknown">未知</option>
          </select>
          <span v-if="detectingType" class="muted" style="font-size:11px">识别中…</span>
          <span v-else-if="addForm.type" class="muted" style="font-size:11px">已选</span>
        </div>
        <!-- X/Twitter 配置 -->
        <template v-if="addForm.type === 'x_twitter'">
          <label class="sm-field" style="margin-top:10px">抓取模式</label>
          <select class="select" v-model="addFormConfig.mode" style="width:100%">
            <option value="search">关键词搜索</option>
            <option value="user_timeline">账号追踪</option>
          </select>
          <template v-if="addFormConfig.mode === 'search'">
            <label class="sm-field" style="margin-top:10px">搜索关键词</label>
            <input class="input" placeholder="例：AI news OR LLM" v-model="addFormConfig.search_query" />
          </template>
          <template v-else>
            <label class="sm-field" style="margin-top:10px">追踪账号（逗号分隔）</label>
            <input class="input" placeholder="例：elonmusk,OpenAI" v-model="addFormConfig.usernames" />
          </template>
        </template>
        <div class="row" style="margin-top:16px;justify-content:flex-end">
          <button class="btn" @click="showAdd = false">取消</button>
          <button class="btn primary" :disabled="adding" @click="doAdd">{{ adding ? "创建中…" : "创建" }}</button>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="muted" style="padding:16px 0">加载中…</div>

    <!-- 空状态 -->
    <div v-if="!loading && sources.length === 0" class="card empty muted">
      暂无信息来源，点击「+ 添加 Source」开始
    </div>

    <!-- Source 表格 -->
    <table v-if="sources.length > 0" class="sm-table">
      <thead>
        <tr>
          <th>名称</th>
          <th>URL</th>
          <th>类型</th>
          <th>状态</th>
          <th>绑定空间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in sources" :key="s.id">
          <td class="sm-name-cell">{{ s.display_name }}</td>
          <td class="sm-url-cell">
            <span class="muted" style="font-size:10px;word-break:break-all">{{ s.source_url || "—" }}</span>
          </td>
          <td>
            <span class="sm-tag" :style="{ background: typeBadgeStyle(s.type).bg, color: typeBadgeStyle(s.type).text }">
              {{ typeLabel(s.type) }}
            </span>
          </td>
          <td>
            <span class="sm-status" :style="{ background: statusStyle(s.status).bg, color: statusStyle(s.status).text }">
              {{ statusLabel(s.status) }}
            </span>
          </td>
          <td class="sm-bind-cell">
            <span class="muted" style="font-size:11px">{{ bindingSummary(s) }}</span>
          </td>
          <td class="sm-actions-cell">
            <button
              v-if="s.status === 'unverified' || s.status === 'error'"
              class="btn btn-sm primary"
              @click="verifying = s"
            >{{ s.status === 'error' ? '重试' : '验证' }}</button>
            <button
              v-if="s.status === 'verified'"
              class="btn btn-sm primary"
              @click="emit('bind', s)"
            >绑定</button>
            <button class="btn btn-sm" @click="startEdit(s)">编辑</button>
            <button class="btn btn-sm danger" @click="doDelete(s)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- 编辑弹窗 -->
    <div v-if="editing" class="modal-overlay" @click.self="editing = null">
      <div class="modal-box">
        <div class="modal-title">编辑 Source</div>
        <input class="input" placeholder="显示名称" v-model="editForm.display_name" />
        <input class="input" style="margin-top:10px" placeholder="URL" v-model="editForm.source_url" />
        <input class="input" style="margin-top:10px" placeholder="类型" v-model="editForm.type" />
        <div class="row" style="margin-top:16px;justify-content:flex-end">
          <button class="btn" @click="editing = null">取消</button>
          <button class="btn primary" :disabled="saving" @click="doEdit">{{ saving ? "保存中…" : "保存" }}</button>
        </div>
      </div>
    </div>

    <!-- 验证弹窗 -->
    <VerifyDialog
      v-if="verifying"
      :source="verifying"
      @close="verifying = null"
      @verified="refresh"
    />
  </div>
</template>

<style scoped>
.sm { display: flex; flex-direction: column; gap: 10px; }
.sm-toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.sm-toolbar .select { width: auto; min-width: 120px; }
.sm-field { font-size: 11px; font-weight: 700; color: var(--muted); display: block; margin-bottom: 4px; }
.sm-type-row { display: flex; align-items: center; gap: 8px; }
/* 表格 */
.sm-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.sm-table th {
  text-align: left; padding: 10px 12px;
  font-size: 10px; font-weight: 700; color: var(--muted);
  text-transform: uppercase; border-bottom: 2px solid var(--border);
}
.sm-table td { padding: 10px 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.sm-table tbody tr:hover { background: #f8fafc; }
.sm-name-cell { font-weight: 700; min-width: 100px; }
.sm-url-cell { max-width: 180px; }
.sm-bind-cell { max-width: 150px; }
.sm-actions-cell { display: flex; gap: 4px; flex-wrap: wrap; white-space: nowrap; }
/* Badge */
.sm-tag {
  padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600;
  white-space: nowrap;
}
.sm-status {
  padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600;
  white-space: nowrap;
}
.btn-sm { padding: 6px 10px; font-size: 11px; border-radius: 8px; }
.empty { padding: 28px 16px; text-align: center; }
.error {
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(239,68,68,.25);
  background: rgba(239,68,68,.06);
  color: #991b1b;
  font-size: 13px;
}
</style>
