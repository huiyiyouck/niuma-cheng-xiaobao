<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { listSubChannels } from "@/lib/api";
import type { SubChannel, UUID } from "@/lib/types";
import { useToast } from "@/composables/useToast";

const props = defineProps<{ spaceId: UUID }>();
const emit = defineEmits<{ added: []; cancel: [] }>();

const toast = useToast();
const url = ref("");
const sourceType = ref("");
const displayName = ref("");
const subChannelId = ref<UUID | null>(null);
const fetchInterval = ref(600);
const maxItems = ref(20);
// X/Twitter 配置
const xtMode = ref<"search" | "user_timeline">("user_timeline");
const xtSearchQuery = ref("");
const xtUsernames = ref("");
const verifyLoading = ref(false);
const verifyResult = ref<{ status: string; error?: string; items: any[] } | null>(null);
const adding = ref(false);
const subChannels = ref<SubChannel[]>([]);

const isXTwitter = computed(() => sourceType.value === "x_twitter");

function buildConfig(): Record<string, unknown> {
  if (sourceType.value === "x_twitter") {
    if (xtMode.value === "search") return { mode: "search", search_query: xtSearchQuery.value };
    return { mode: "user_timeline", usernames: xtUsernames.value.split(",").map(s => s.trim()).filter(Boolean) };
  }
  return {};
}

async function loadSubs() {
  try {
    subChannels.value = await listSubChannels(props.spaceId);
  } catch { /* ignore */ }
}

async function detectType() {
  if (!url.value.trim()) return;
  try {
    const res = await fetch(`/v1/sources/detect-type?url=${encodeURIComponent(url.value.trim())}`);
    const data = await res.json();
    sourceType.value = data.type;
    if (!displayName.value) displayName.value = url.value.trim();
  } catch { /* ignore */ }
}

async function verify() {
  verifyLoading.value = true;
  verifyResult.value = null;
  try {
    // 先创建临时 Source 然后验证（简化：直接使用 verifyFetch 逻辑）
    const res = await fetch("/v1/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: displayName.value || url.value,
        source_url: url.value || null,
        type: sourceType.value || undefined,
      }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || "创建失败");
    const source = await res.json();

    const vRes = await fetch(`/v1/sources/${source.id}/verify`, { method: "POST" });
    verifyResult.value = await vRes.json();

    // 删除临时 Source（如果验证失败）
    if (verifyResult.value?.status === "error") {
      await fetch(`/v1/sources/${source.id}`, { method: "DELETE" });
    }
  } catch (e) {
    verifyResult.value = { status: "error", error: e instanceof Error ? e.message : String(e), items: [] };
  } finally {
    verifyLoading.value = false;
  }
}

async function addSource() {
  adding.value = true;
  try {
    // 1. 创建 Source
    const sRes = await fetch("/v1/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: displayName.value || url.value,
        source_url: url.value || null,
        type: sourceType.value || undefined,
        config: buildConfig(),
      }),
    });
    if (!sRes.ok) throw new Error((await sRes.json()).detail || "创建 Source 失败");
    const source = await sRes.json();

    // 2. 绑定到频道空间
    const bRes = await fetch(`/v1/channel-spaces/${props.spaceId}/sources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_id: source.id,
        enabled: true,
        fetch_policy: { interval_seconds: fetchInterval.value, max_items: maxItems.value },
        sub_channel_id: subChannelId.value || null,
      }),
    });
    if (!bRes.ok) throw new Error((await bRes.json()).detail || "绑定失败");
    toast.success("信息源已添加");
    emit("added");
  } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); } finally { adding.value = false; }
}

onMounted(loadSubs);
</script>

<template>
  <div class="inline-add">
    <div class="add-row">
      <input class="input" v-model="url" placeholder="输入 Source URL…" style="flex:1" @blur="detectType" />
      <select v-model="sourceType" class="select" style="min-width:110px">
        <option value="">自动识别</option>
        <option value="rss">RSS</option>
        <option value="x_twitter">X/Twitter</option>
      </select>
      <select v-model="subChannelId" class="select" style="min-width:130px">
        <option :value="null">无（直属频道）</option>
        <option v-for="sc in subChannels" :key="sc.id" :value="sc.id">{{ sc.name }}</option>
      </select>
    </div>
    <!-- X/Twitter 配置 -->
    <div v-if="isXTwitter" class="add-row">
      <label>模式
        <select v-model="xtMode" class="select" style="width:auto">
          <option value="user_timeline">账号追踪</option>
          <option value="search">关键词搜索</option>
        </select>
      </label>
      <label v-if="xtMode === 'user_timeline'" style="flex:1">
        账号（逗号分隔）
        <input class="input" v-model="xtUsernames" placeholder="alpha123cc, elonmusk" style="width:100%" />
      </label>
      <label v-else style="flex:1">
        搜索关键词
        <input class="input" v-model="xtSearchQuery" placeholder="airdrop OR crypto" style="width:100%" />
      </label>
    </div>

    <div class="add-row">
      <label>抓取间隔(秒) <input class="input" type="number" v-model.number="fetchInterval" min="60" style="width:100px" /></label>
      <label>最大条数 <input class="input" type="number" v-model.number="maxItems" min="1" max="100" style="width:80px" /></label>
    </div>
    <button class="btn verify-btn" :disabled="verifyLoading" @click="verify">
      {{ verifyLoading ? '验证中…' : '🔍 验证预览' }}
    </button>
    <div v-if="verifyResult" class="verify-result" :class="verifyResult?.status === 'ok' ? 'verify-ok' : 'verify-err'">
      <div v-if="verifyResult?.status === 'ok'" class="ok-msg">✅ 验证通过，共 {{ verifyResult?.items?.length || 0 }} 条</div>
      <div v-else class="err-msg">❌ {{ verifyResult?.error }}</div>
      <div v-if="verifyResult?.items?.length" class="preview-list">
        <div v-for="it in verifyResult.items" :key="it.source_item_id" class="preview-item">
          <span class="preview-title">{{ it.title || it.source_item_id }}</span>
          <span class="preview-time">{{ it.published_at ? new Date(it.published_at).toLocaleString() : '' }}</span>
        </div>
      </div>
    </div>
    <div class="add-actions">
      <button class="btn" @click="$emit('cancel')">取消</button>
      <button class="btn primary" :disabled="adding" @click="addSource">{{ adding ? '添加中…' : '确认添加' }}</button>
    </div>
  </div>
</template>

<style scoped>
.inline-add {
  background: var(--card); border: 2px dashed var(--accent); border-radius: 12px;
  padding: 20px; display: flex; flex-direction: column; gap: 10px;
  animation: slideDown 0.25s ease-out;
}
.add-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.add-row label { font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; }
.input, .select { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border); font-size: 13px; }
.verify-btn { width: 100%; padding: 8px; font-size: 12px; font-weight: 600; }
.verify-result { padding: 10px; border-radius: 8px; font-size: 12px; }
.verify-ok { background: var(--success-light); color: var(--success); }
.verify-err { background: var(--danger-light); color: #991b1b; }
.preview-list { margin-top: 8px; display: flex; flex-direction: column; gap: 4px; }
.preview-item { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid var(--border-light); }
.preview-title { font-size: 12px; font-weight: 600; }
.preview-time { font-size: 10px; color: var(--text-muted); }
.add-actions { display: flex; gap: 8px; justify-content: flex-end; }
.btn {
  padding: 8px 20px; border-radius: 8px; font-size: 13px; font-weight: 600;
  border: 1px solid var(--border); background: var(--card); cursor: pointer;
}
.btn.primary { background: var(--accent); color: #FFF; border-color: var(--accent); }
.btn.primary:disabled { opacity: 0.4; cursor: not-allowed; }
@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
</style>
