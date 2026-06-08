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
          <div v-if="state.visible" class="modal-dialog">
            <h3 class="modal-title">{{ state.title }}</h3>
            <p class="modal-body" v-html="state.body"></p>
            <div class="modal-actions">
              <button class="btn" @click="close(false)">取消</button>
              <button
                class="btn"
                :class="state.danger ? 'btn--danger-fill' : 'btn--primary'"
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
/* 仅保留本组件特有内容：modal-body 文案样式 + 进出场动画 */
.modal-body { font-size: var(--text-base); color: var(--text-secondary); line-height: 1.6; margin-bottom: 20px; }

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
