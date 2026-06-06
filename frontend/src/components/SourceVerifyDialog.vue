<script setup lang="ts">
import { ref } from "vue";
import type { SourceVerifyResponse, SourceType } from "@/lib/types";
import { preVerifySource } from "@/lib/api";

// v0.5: 统一的 Source 验证弹窗
// 展示 X 账号信息或 RSS 站点预览
const props = defineProps<{
  sourceType: SourceType;
  sourceIdentity: string;
}>();

const emit = defineEmits<{
  close: [];
  verified: [result: SourceVerifyResponse];
}>();

const loading = ref(false);
const errorText = ref<string | null>(null);
const result = ref<SourceVerifyResponse | null>(null);

async function doVerify() {
  loading.value = true;
  errorText.value = null;
  result.value = null;
  try {
    result.value = await preVerifySource({
      type: props.sourceType,
      source_identity: props.sourceIdentity,
    });
  } catch (e) {
    errorText.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

function confirmVerified() {
  if (result.value) {
    emit("verified", result.value);
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="verify-overlay" @click.self="emit('close')">
      <div class="verify-box">
        <h3 class="verify-title">验证信息源</h3>

        <!-- 基本信息 -->
        <div class="verify-info">
          <div><span class="muted">类型</span> {{ sourceType === 'x_twitter' ? 'X/Twitter' : 'RSS' }}</div>
          <div><span class="muted">身份</span> {{ sourceIdentity }}</div>
        </div>

        <!-- 错误 -->
        <div v-if="errorText" class="verify-error">{{ errorText }}</div>

        <!-- 验证结果 -->
        <div v-if="result" class="verify-result" :class="result.status === 'ok' ? 'result-ok' : 'result-err'">
          <!-- X 账号信息 -->
          <div v-if="sourceType === 'x_twitter' && result.account_name" class="result-account">
            <div class="account-header">
              <span class="account-name">{{ result.account_name }}</span>
              <span class="account-username">@{{ result.account_username }}</span>
            </div>
            <p v-if="result.account_bio" class="account-bio">{{ result.account_bio }}</p>
          </div>

          <!-- RSS 站点信息 -->
          <div v-if="sourceType === 'rss' && result.site_title" class="result-site">
            <div class="site-title">{{ result.site_title }}</div>
            <p v-if="result.site_description" class="site-desc">{{ result.site_description }}</p>
          </div>

          <!-- 获取到的条目 -->
          <div class="result-stats">
            <span v-if="result.status === 'ok'" class="stat-ok">验证通过，共获取 {{ result.total_fetched }} 条</span>
            <span v-else class="stat-err">验证失败：{{ result.error }}</span>
          </div>

          <!-- 条目预览 -->
          <div v-if="result.items.length > 0" class="result-preview">
            <div v-for="it in result.items.slice(0, 5)" :key="it.source_item_id" class="preview-item">
              <span class="preview-title">{{ it.title || "(无标题)" }}</span>
              <span v-if="it.published_at" class="preview-time">{{ new Date(it.published_at).toLocaleString() }}</span>
            </div>
          </div>
        </div>

        <!-- 按钮 -->
        <div class="verify-actions">
          <button class="btn" @click="emit('close')">关闭</button>
          <button
            v-if="!result"
            class="btn primary"
            :disabled="loading"
            @click="doVerify"
          >{{ loading ? "验证中…" : "开始验证" }}</button>
          <button
            v-if="result && result.status === 'ok'"
            class="btn primary"
            @click="confirmVerified"
          >确认使用</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.verify-overlay {
  position: fixed; inset: 0; z-index: 80;
  background: rgba(0,0,0,0.35);
  display: flex; align-items: center; justify-content: center;
}
.verify-box {
  background: var(--card);
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0,0,0,0.12);
  padding: 24px;
  min-width: 420px;
  max-width: 560px;
  max-height: 80vh;
  overflow-y: auto;
  animation: modalIn 0.2s cubic-bezier(0.4,0,0.2,1);
}
.verify-title {
  font-size: 15px;
  font-weight: 800;
  margin: 0 0 16px;
}
.verify-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  padding: 10px 12px;
  background: #F8FAFB;
  border-radius: 10px;
  border: 1px solid var(--border-light);
  margin-bottom: 12px;
}
.verify-info .muted { color: var(--text-muted); margin-right: 8px; }
.verify-error {
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--danger-light);
  border: 1px solid rgba(231,76,60,0.2);
  color: #991b1b;
  font-size: 12px;
  margin-bottom: 12px;
}
.verify-result { margin-bottom: 12px; }
.result-ok .stat-ok { color: var(--success); font-weight: 700; font-size: 13px; }
.result-err .stat-err { color: var(--danger); font-weight: 700; font-size: 13px; }
.result-account {
  background: #F8FAFB;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
}
.account-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px; }
.account-name { font-size: 14px; font-weight: 700; }
.account-username { font-size: 12px; color: var(--text-muted); }
.account-bio { font-size: 12px; color: var(--text-secondary); margin: 0; line-height: 1.5; }
.result-site {
  background: #F8FAFB;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
}
.site-title { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
.site-desc { font-size: 12px; color: var(--text-secondary); margin: 0; line-height: 1.5; }
.result-stats { margin-bottom: 8px; }
.result-preview { display: flex; flex-direction: column; gap: 4px; }
.preview-item {
  display: flex; justify-content: space-between; gap: 8px;
  padding: 6px 8px; border-radius: 6px;
  background: #F8FAFB; font-size: 11px;
}
.preview-title { font-weight: 600; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.preview-time { color: var(--text-muted); flex-shrink: 0; font-size: 10px; }
.verify-actions {
  display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px;
}
.verify-actions .btn {
  padding: 8px 20px; font-size: 13px; font-weight: 600;
  border-radius: 8px; border: 1px solid var(--border);
  background: var(--card); cursor: pointer;
}
.verify-actions .btn.primary {
  border-color: rgba(52,152,219,0.25);
  background: rgba(52,152,219,0.06);
  color: var(--accent);
}
.verify-actions .btn:disabled { opacity: 0.4; cursor: not-allowed; }
@keyframes modalIn {
  from { opacity: 0; transform: scale(0.95) translateY(-8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
</style>
