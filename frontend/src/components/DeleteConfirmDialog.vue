<script setup lang="ts">
import { ref } from "vue";

// v0.5: 删除确认弹窗
// impact 为结构化数据，组件内部渲染，不使用 v-html
const props = defineProps<{
  title: string;
  targetName: string;
  impact: {
    affectedPositions: number;
    preservedNews: number;
    additionalInfo?: string;
  };
  confirmName: string;
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const inputValue = ref("");
const submitting = ref(false);
const canConfirm = ref(false);

// 输入匹配检测
function checkMatch() {
  canConfirm.value = inputValue.value.trim() === props.confirmName.trim();
}

function onSubmit() {
  if (!canConfirm.value) return;
  submitting.value = true;
  emit("confirm");
}

// 暴露 reset 方法供父组件调用
defineExpose({ reset: () => { submitting.value = false; inputValue.value = ""; canConfirm.value = false; } });
</script>

<template>
  <Teleport to="body">
    <div class="delete-overlay" @click.self="emit('cancel')">
      <div class="delete-box">
        <h3 class="delete-title">{{ title }}</h3>

        <!-- 影响范围 -->
        <div class="delete-impact">
          <div class="impact-row">
            <span class="impact-icon">📌</span>
            <span>影响展示位置：<strong>{{ impact.affectedPositions }}</strong> 个</span>
          </div>
          <div class="impact-row">
            <span class="impact-icon">📰</span>
            <span>保留历史新闻：<strong>{{ impact.preservedNews }}</strong> 条</span>
          </div>
          <div v-if="impact.additionalInfo" class="impact-row impact-note">
            {{ impact.additionalInfo }}
          </div>
        </div>

        <!-- 确认输入 -->
        <p class="delete-prompt">请输入 <strong>{{ confirmName }}</strong> 以确认删除：</p>
        <input
          class="input delete-input"
          v-model="inputValue"
          :placeholder="`输入 ${confirmName}`"
          @input="checkMatch"
          @keydown.enter="onSubmit"
        />

        <!-- 按钮 -->
        <div class="delete-actions">
          <button class="btn" @click="emit('cancel')" :disabled="submitting">取消</button>
          <button
            class="btn danger"
            :disabled="!canConfirm || submitting"
            @click="onSubmit"
          >
            {{ submitting ? "删除中…" : "确认删除" }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.delete-overlay {
  position: fixed; inset: 0; z-index: 80;
  background: rgba(0,0,0,0.35);
  display: flex; align-items: center; justify-content: center;
}
.delete-box {
  background: var(--card);
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0,0,0,0.12);
  padding: 24px;
  min-width: 380px;
  max-width: 480px;
  animation: modalIn 0.2s cubic-bezier(0.4,0,0.2,1);
}
.delete-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--danger);
  margin: 0 0 16px;
}
.delete-impact {
  background: #F8FAFB;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.impact-row {
  font-size: 13px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
}
.impact-row strong {
  color: var(--text);
}
.impact-note {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px solid var(--border-light);
}
.delete-prompt {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 8px;
}
.delete-input {
  margin-bottom: 20px;
}
.delete-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.delete-actions .btn {
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--card);
  cursor: pointer;
}
.delete-actions .btn.danger {
  border-color: rgba(231,76,60,0.25);
  background: rgba(231,76,60,0.06);
  color: var(--danger);
}
.delete-actions .btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
@keyframes modalIn {
  from { opacity: 0; transform: scale(0.95) translateY(-8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
</style>
