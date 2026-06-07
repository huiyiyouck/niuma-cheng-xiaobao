<script setup lang="ts">
// 基础按钮：尺寸 + 风格组合，统一所有页面按钮样式
// 用法： <BaseButton variant="primary" size="md" @click="..."> 文字 </BaseButton>
withDefaults(defineProps<{
  variant?: "default" | "primary" | "danger" | "danger-fill" | "warn" | "success" | "muted" | "ghost";
  size?: "xs" | "sm" | "md";
  block?: boolean;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}>(), {
  variant: "default",
  size: "md",
  block: false,
  disabled: false,
  type: "button",
});
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="btn"
    :class="[
      size !== 'md' ? `btn--${size}` : '',
      variant !== 'default' ? `btn--${variant}` : '',
      block ? 'btn--block' : '',
    ]"
  >
    <slot />
  </button>
</template>
