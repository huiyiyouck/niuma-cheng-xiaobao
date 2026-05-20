<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ score: number | null }>();

const tier = computed(() => {
  if (props.score == null) return "none";
  if (props.score >= 9) return "top";
  if (props.score >= 7) return "high";
  if (props.score >= 5) return "mid";
  return "low";
});
</script>

<template>
  <span class="score-badge" :class="`score-badge--${tier}`">
    {{ score != null ? score.toFixed(1) : '--' }}
  </span>
</template>

<style scoped>
.score-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px; height: 36px;
  border-radius: 8px;
  font-weight: 900; font-size: 14px;
  color: #fff;
  flex-shrink: 0;
}
.score-badge--top  { background: linear-gradient(135deg, #4f46e5, #7c3aed); }
.score-badge--high { background: linear-gradient(135deg, #f59e0b, #d97706); }
.score-badge--mid  { background: linear-gradient(135deg, #0891b2, #06b6d4); }
.score-badge--low  { background: linear-gradient(135deg, #64748b, #94a3b8); }
.score-badge--none { background: linear-gradient(135deg, #94a3b8, #cbd5e1); }
</style>
