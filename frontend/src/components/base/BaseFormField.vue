<script setup lang="ts">
// 基础表单字段：label + input/控件
// 用法：
//   <BaseFormField label="名称"> <input class="form-f" v-model="x" /> </BaseFormField>
defineProps<{
  label?: string;
}>();
</script>

<template>
  <div class="form-g">
    <label v-if="label" class="form-l">{{ label }}</label>
    <slot />
  </div>
</template>
