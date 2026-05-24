<script setup lang="ts">
import { ref } from "vue";
import { verifySource, markVerified } from "@/lib/api";
import type { Source, SourceVerifyResponse, VerifyItem } from "@/lib/types";

const props = defineProps<{ source: Source }>();
const emit = defineEmits<{ close: []; verified: [] }>();

const loading = ref(false);
const marking = ref(false);
const errorText = ref<string | null>(null);
const result = ref<SourceVerifyResponse | null>(null);

async function doVerify() {
  loading.value = true;
  errorText.value = null;
  result.value = null;
  try {
    result.value = await verifySource(props.source.id);
  } catch (e) {
    errorText.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

async function doMarkVerified() {
  marking.value = true;
  try {
    await markVerified(props.source.id);
    emit("verified");
    emit("close");
  } catch (e) {
    errorText.value = e instanceof Error ? e.message : String(e);
  } finally {
    marking.value = false;
  }
}

function previewText(item: VerifyItem): string {
  return item.content_preview || item.title || "(无内容)";
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-box" style="max-width:560px">
      <div class="modal-title">验证 Source：{{ source.display_name }}</div>

      <div class="vd-info">
        <div><span class="muted">类型</span> {{ source.type }}</div>
        <div v-if="source.source_url"><span class="muted">URL</span> {{ source.source_url }}</div>
        <div><span class="muted">状态</span> <span class="badge" :class="source.status === 'active' || source.status === 'verified' ? 'badge--success' : source.status === 'error' ? 'badge--danger' : 'badge--warning'">{{ source.status }}</span></div>
      </div>

      <div v-if="errorText" class="error">{{ errorText }}</div>

      <!-- 验证结果 -->
      <div v-if="result" class="vd-result">
        <div v-if="result.status === 'ok'" class="vd-ok">
          验证成功 — 获取到 {{ result.total_fetched }} 条数据，预览前 {{ result.items.length }} 条：
        </div>
        <div v-else class="vd-err">
          验证失败：{{ result.error }}
        </div>

        <div v-for="it in result.items" :key="it.source_item_id" class="vd-item">
          <div class="vd-item-title">{{ it.title || "(无标题)" }}</div>
          <div class="vd-item-preview">{{ previewText(it) }}</div>
          <div class="vd-item-meta" v-if="it.published_at">{{ it.published_at }}</div>
        </div>
      </div>

      <div class="row" style="margin-top:16px;justify-content:flex-end">
        <button class="btn" @click="emit('close')">关闭</button>
        <button
          v-if="!result"
          class="btn primary"
          :disabled="loading"
          @click="doVerify"
        >{{ loading ? "验证中…" : "开始验证" }}</button>
        <button
          v-if="result && result.status === 'ok' && source.status === 'unverified'"
          class="btn primary"
          :disabled="marking"
          @click="doMarkVerified"
        >{{ marking ? "标记中…" : "标记已验证" }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vd-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  padding: 10px 12px;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid var(--border);
}
.vd-result { margin-top: 12px; }
.vd-ok { font-size: 13px; color: var(--success); font-weight: 700; margin-bottom: 8px; }
.vd-err { font-size: 13px; color: var(--danger); font-weight: 700; margin-bottom: 8px; }
.vd-item {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 6px;
}
.vd-item-title { font-size: 12px; font-weight: 700; margin-bottom: 4px; }
.vd-item-preview { font-size: 11px; color: #475569; line-height: 1.5; word-break: break-all; }
.vd-item-meta { font-size: 10px; color: var(--muted); margin-top: 4px; }
.error {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(239,68,68,.25);
  background: rgba(239,68,68,.06);
  color: #991b1b;
  font-size: 13px;
}
</style>
