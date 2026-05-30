<script setup lang="ts">
import { useToast } from "@/composables/useToast";

const { toasts, remove } = useToast();
</script>

<template>
  <div class="toast-container" v-if="toasts.length > 0">
    <transition-group name="toast">
      <div
        v-for="t in toasts" :key="t.id"
        class="toast-item"
        :class="`toast--${t.type}`"
        @click="remove(t.id)"
      >
        <span class="toast-icon">{{ t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️' }}</span>
        <span class="toast-msg">{{ t.message }}</span>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed; top: 16px; right: 16px; z-index: 100;
  display: flex; flex-direction: column; gap: 8px;
  pointer-events: none;
}
.toast-item {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px; border-radius: 8px;
  font-size: 12px; font-weight: 600;
  max-width: 360px; cursor: pointer;
  pointer-events: auto;
}
.toast--success { background: var(--success); color: #FFF; }
.toast--error   { background: var(--danger); color: #FFF; }
.toast--info    { background: var(--text); color: #FFF; }
.toast-msg { flex: 1; }
.toast-enter-active { animation: toastIn 0.3s ease-out; }
.toast-leave-active { transition: opacity 0.3s; }
.toast-leave-to { opacity: 0; }

@keyframes toastIn {
  from { opacity: 0; transform: translateX(20px); }
  to   { opacity: 1; transform: translateX(0); }
}
</style>
