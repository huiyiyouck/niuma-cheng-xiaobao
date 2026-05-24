<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import {
  listSources, createSource, updateSource, deleteSource,
} from "@/lib/api";
import type { SourceWithBindings, Source } from "@/lib/types";
import VerifyDialog from "@/components/VerifyDialog.vue";

const sources = ref<SourceWithBindings[]>([]);
const errorText = ref<string | null>(null);
const loading = ref(false);
const statusFilter = ref("");
const typeFilter = ref("");

const showAdd = ref(false);
const addForm = reactive({ display_name: "", source_url: "", type: "" });
const adding = ref(false);

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

async function doAdd() {
  if (!addForm.display_name.trim()) return;
  adding.value = true;
  try {
    await createSource({
      display_name: addForm.display_name.trim(),
      source_url: addForm.source_url.trim() || undefined,
      type: addForm.type.trim() || undefined,
    });
    addForm.display_name = "";
    addForm.source_url = "";
    addForm.type = "";
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

function statusBadge(s: string) {
  if (s === "active") return "badge--success";
  if (s === "verified") return "badge--success";
  if (s === "error") return "badge--danger";
  return "badge--warning";
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    unverified: "未验证",
    verified: "已验证",
    active: "运行中",
    error: "错误",
  };
  return map[s] ?? s;
}

onMounted(refresh);
</script>

<template>
  <div class="sm">
    <div v-if="errorText" class="error">{{ errorText }}</div>

    <div class="sm-toolbar">
      <div class="row">
        <select class="select" v-model="statusFilter" @change="refresh" style="width:auto">
          <option value="">全部状态</option>
          <option value="unverified">未验证</option>
          <option value="verified">已验证</option>
          <option value="active">运行中</option>
          <option value="error">错误</option>
        </select>
        <select class="select" v-model="typeFilter" @change="refresh" style="width:auto">
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
    </div>

    <!-- 添加表单 -->
    <div v-if="showAdd" class="sm-form card">
      <input class="input" placeholder="显示名称" v-model="addForm.display_name" @keydown.enter="doAdd" />
      <input class="input" style="margin-top:8px" placeholder="URL（可选，留空自动识别类型）" v-model="addForm.source_url" />
      <input class="input" style="margin-top:8px" placeholder="类型（可选，留空自动识别）" v-model="addForm.type" />
      <div class="row" style="margin-top:10px;justify-content:flex-end">
        <button class="btn primary btn-sm" :disabled="adding" @click="doAdd">{{ adding ? "创建中…" : "创建" }}</button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="muted" style="padding:16px 0">加载中…</div>

    <!-- 空状态 -->
    <div v-if="!loading && sources.length === 0" class="card empty muted">
      暂无 Source，点击「+ 添加 Source」创建第一个
    </div>

    <!-- Source 列表 -->
    <div v-for="s in sources" :key="s.id" class="sm-card card">
      <div class="sm-card-top">
        <div class="sm-card-info">
          <span class="sm-name">{{ s.display_name }}</span>
          <span class="badge" :class="statusBadge(s.status)">{{ statusLabel(s.status) }}</span>
          <span class="badge badge--muted">{{ s.type }}</span>
          <span class="muted" style="font-size:10px" v-if="s.source_url">{{ s.source_url }}</span>
        </div>
        <div class="sm-card-actions">
          <button class="btn btn-sm" @click="startEdit(s)">编辑</button>
          <button
            v-if="s.status === 'unverified'"
            class="btn btn-sm primary"
            @click="verifying = s"
          >验证</button>
          <button
            v-if="s.status === 'verified'"
            class="btn btn-sm primary"
            @click="verifying = s"
          >验证</button>
          <button class="btn btn-sm danger" @click="doDelete(s)">删除</button>
        </div>
      </div>
      <!-- 绑定信息 -->
      <div class="sm-bindings" v-if="s.channel_spaces.length">
        <div class="muted" style="font-size:10px;margin-bottom:4px">已绑定频道空间：</div>
        <span
          v-for="b in s.channel_spaces"
          :key="b.channel_space_id"
          class="badge badge--muted"
          style="margin-right:4px;margin-bottom:4px"
        >
          {{ b.channel_space_name }}
          <template v-if="b.sub_channel_name"> / {{ b.sub_channel_name }}</template>
          ({{ b.enabled ? '启用' : '暂停' }})
        </span>
      </div>
      <div class="sm-error" v-if="s.verify_error">
        <span class="muted" style="font-size:10px">验证错误：</span>{{ s.verify_error }}
      </div>
    </div>

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
.sm-toolbar { margin-bottom: 4px; }
.sm-toolbar .select { width: auto; min-width: 120px; }
.sm-form { padding: 16px; }
.sm-card { padding: 16px; }
.sm-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.sm-card-info { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; flex: 1; }
.sm-name { font-weight: 900; font-size: 14px; }
.sm-card-actions { display: flex; gap: 4px; flex-shrink: 0; }
.sm-bindings { margin-top: 10px; padding-top: 8px; border-top: 1px solid #f1f5f9; }
.sm-error { margin-top: 8px; font-size: 11px; color: var(--danger); padding: 6px 10px; background: #fef2f2; border-radius: 6px; }
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
