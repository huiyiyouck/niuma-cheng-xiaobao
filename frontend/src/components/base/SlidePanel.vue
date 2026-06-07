<script setup lang="ts">
import { watch, ref } from "vue";

const props = defineProps<{ show: boolean; title: string }>();
const emit = defineEmits<{ close: [] }>();

const visible = ref(false);
const animating = ref(false);

watch(() => props.show, (v) => {
  if (v) { visible.value = true; setTimeout(() => animating.value = true, 10); }
  else { animating.value = false; setTimeout(() => visible.value = false, 250); }
}, { immediate: true });

function onOverlayClick() { emit("close"); }
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="slide-overlay" :class="{ open: animating }" @click="onOverlayClick" />
    <div v-if="visible" class="slide-panel" :class="{ open: animating }">
      <div class="slide-head">
        <h3 class="slide-title">{{ title }}</h3>
        <button class="slide-close" @click="emit('close')">✕</button>
      </div>
      <div class="slide-body">
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.slide-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0); z-index: 100;
  transition: background 0.25s;
}
.slide-overlay.open { background: rgba(0,0,0,0.2); }

.slide-panel {
  position: fixed; top: 0; right: 0; width: 460px; max-width: 100vw; height: 100vh;
  background: var(--bg); box-shadow: -8px 0 32px rgba(0,0,0,0.12);
  z-index: 101; display: flex; flex-direction: column;
  transform: translateX(100%); transition: transform 0.25s ease-out;
}
.slide-panel.open { transform: translateX(0); }

.slide-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid var(--border-light); flex-shrink: 0;
}
.slide-title { font-size: 16px; font-weight: 800; margin: 0; }
.slide-close {
  width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--card); cursor: pointer; font-size: 14px; display: flex;
  align-items: center; justify-content: center; color: var(--text-muted);
}
.slide-close:hover { background: var(--hover-bg); color: var(--text); }

.slide-body { flex: 1; overflow-y: auto; padding: 16px 20px; }
</style>
