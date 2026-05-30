<script setup lang="ts">
import { useModal } from "@/composables/useModal";
import { onMounted, onBeforeUnmount } from "vue";

const { state, close } = useModal();

function onKeydown(e: KeyboardEvent) {
  if (!state.visible) return;
  if (e.key === "Enter") { e.preventDefault(); close(true); }
  if (e.key === "Escape") { e.preventDefault(); close(false); }
}

onMounted(() => document.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => document.removeEventListener("keydown", onKeydown));
</script>

<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="state.visible" class="modal-overlay" @click.self="close(false)">
        <transition name="modal">
          <div v-if="state.visible" class="modal-box">
            <h3 class="modal-title">{{ state.title }}</h3>
            <p class="modal-body" v-html="state.body"></p>
            <div class="modal-actions">
              <button class="btn" @click="close(false)">取消</button>
              <button
                class="btn"
                :class="state.danger ? 'danger' : 'primary'"
                :disabled="state.loading"
                @click="close(true)"
              >
                {{ state.loading ? '处理中…' : state.confirmText }}
              </button>
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; z-index: 60;
  background: rgba(0,0,0,0.35);
  display: flex; align-items: center; justify-content: center;
}
.modal-box {
  background: var(--card); border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0,0,0,0.12);
  padding: 24px; min-width: 360px; max-width: 440px;
}
.modal-title { font-size: 15px; font-weight: 800; color: var(--text); margin-bottom: 8px; }
.modal-body { font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 20px; }
.modal-actions { display: flex; gap: 8px; justify-content: flex-end; }
.modal-actions .btn { padding: 8px 20px; font-size: 13px; }
.modal-actions .btn.danger { border-color: rgba(231, 76, 60, 0.25); background: rgba(231, 76, 60, 0.06); color: var(--danger); }
.modal-actions .btn:disabled { opacity: 0.4; cursor: not-allowed; }

.fade-enter-active { animation: fadeIn 0.15s ease-out; }
.fade-leave-active { transition: opacity 0.1s; }
.fade-leave-to { opacity: 0; }
.modal-enter-active { animation: modalIn 0.2s cubic-bezier(0.4,0,0.2,1); }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes modalIn {
  from { opacity: 0; transform: scale(0.95) translateY(-8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
</style>
