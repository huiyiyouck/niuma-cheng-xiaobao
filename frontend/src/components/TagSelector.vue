<script setup lang="ts">
import { computed, ref } from "vue";

// v0.5: 标签选择器，支持单选/多选/自由输入
const props = withDefaults(defineProps<{
  mode: "multi" | "single";
  options: { value: string; label: string }[];
  modelValue: string | string[];
  allowFreeInput?: boolean;
  placeholder?: string;
}>(), {
  allowFreeInput: false,
  placeholder: "输入标签…",
});

const emit = defineEmits<{
  "update:modelValue": [val: string | string[]];
}>();

const freeInput = ref("");

const selectedSet = computed<Set<string>>(() => {
  if (props.mode === "single") return new Set(props.modelValue ? [props.modelValue as string] : []);
  return new Set(props.modelValue as string[] || []);
});

function toggleOption(val: string) {
  if (props.mode === "single") {
    emit("update:modelValue", selectedSet.value.has(val) ? "" : val);
  } else {
    const next = new Set(selectedSet.value);
    if (next.has(val)) next.delete(val); else next.add(val);
    emit("update:modelValue", [...next]);
  }
}

function addFreeInput() {
  const v = freeInput.value.trim();
  if (!v) return;
  if (selectedSet.value.has(v)) { freeInput.value = ""; return; }
  if (props.mode === "single") {
    emit("update:modelValue", v);
  } else {
    emit("update:modelValue", [...selectedSet.value, v]);
  }
  freeInput.value = "";
}

function removeFreeTag(tag: string) {
  if (props.mode === "single") {
    emit("update:modelValue", "");
    return;
  }
  const next = [...selectedSet.value].filter(t => t !== tag);
  emit("update:modelValue", next);
}

const freeTags = computed(() => {
  const optionValues = new Set(props.options.map(o => o.value));
  return [...selectedSet.value].filter(v => !optionValues.has(v));
});
</script>

<template>
  <div class="tag-selector">
    <!-- 预设选项 Pill -->
    <div class="tag-options">
      <button
        v-for="opt in options" :key="opt.value"
        class="tag-pill"
        :class="{ active: selectedSet.has(opt.value) }"
        @click="toggleOption(opt.value)"
        type="button"
      >
        {{ opt.label }}
      </button>
    </div>
    <!-- 自由标签 -->
    <div v-if="freeTags.length > 0" class="free-tags">
      <span v-for="t in freeTags" :key="t" class="free-tag">
        {{ t }}
        <button class="free-tag-remove" @click="removeFreeTag(t)" type="button">×</button>
      </span>
    </div>
    <!-- 自由输入 -->
    <div v-if="allowFreeInput" class="free-input-row">
      <input
        class="free-input"
        v-model="freeInput"
        :placeholder="placeholder"
        @keydown.enter="addFreeInput"
      />
      <button class="btn-sm" @click="addFreeInput" type="button">添加</button>
    </div>
  </div>
</template>

<style scoped>
.tag-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tag-options {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.tag-pill {
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}
.tag-pill:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.tag-pill.active {
  background: var(--accent);
  color: #FFF;
  border-color: var(--accent);
}
.free-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.free-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  background: var(--accent-light);
  color: var(--accent);
  border: 1px solid rgba(52,152,219,0.2);
}
.free-tag-remove {
  border: none;
  background: none;
  color: var(--accent);
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  line-height: 1;
}
.free-input-row {
  display: flex;
  gap: 6px;
  align-items: center;
}
.free-input {
  flex: 1;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  font-size: 12px;
  outline: none;
}
.free-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(52,152,219,0.08);
}
.btn-sm {
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--card);
  cursor: pointer;
}
</style>
