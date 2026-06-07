<script setup lang="ts">
// 筛选下拉
defineProps<{
  modelValue: string;
  options: { value: string; label: string }[];
}>();

const emit = defineEmits<{ "update:modelValue": [v: string] }>();
</script>

<template>
  <select
    class="filter-select"
    :value="modelValue"
    @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
  >
    <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
  </select>
</template>
