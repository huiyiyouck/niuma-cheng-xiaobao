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
  position: fixed; inset: 0; background: rgba(15, 23, 42, 0); z-index: 100;
  transition: background 0.25s, backdrop-filter 0.25s;
}
.slide-overlay.open {
  background: rgba(15, 23, 42, 0.3);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.slide-panel {
  position: fixed; top: 0; right: 0; width: 460px; max-width: 100vw; height: 100vh;
  background: var(--card); box-shadow: -8px 0 30px rgba(2, 6, 23, 0.1);
  border-left: 1px solid var(--border);
  z-index: 101; display: flex; flex-direction: column;
  transform: translateX(100%); transition: transform 0.25s ease-out;
}
.slide-panel.open { transform: translateX(0); }

.slide-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid var(--border); flex-shrink: 0;
  background: var(--card);
}
.slide-title { font-size: var(--text-h4); font-weight: var(--weight-xbold); margin: 0; color: var(--text); }
.slide-close {
  width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--border);
  background: var(--card); cursor: pointer; font-size: var(--text-h4); display: flex;
  align-items: center; justify-content: center; color: var(--text-muted);
  transition: 0.15s;
}
.slide-close:hover { background: #F4F5F7; color: var(--text); }

.slide-body { flex: 1; overflow-y: auto; padding: 24px 20px; }
</style>
