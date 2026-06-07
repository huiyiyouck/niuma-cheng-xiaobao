<script setup lang="ts">
// 基础模态：遮罩 + 居中卡片 + 标题 + 关闭事件
// 用法： <BaseModal v-if="show" title="新建空间" @close="show=false">
//          <表单/>
//          <template #footer> <按钮组/> </template>
//        </BaseModal>
const props = withDefaults(defineProps<{
  title?: string;
  closable?: boolean;
}>(), {
  closable: true,
});

const emit = defineEmits<{ close: [] }>();

function onBackdrop() {
  if (props.closable) emit("close");
}
</script>

<template>
  <div class="modal-overlay" @click.self="onBackdrop">
    <div class="modal-dialog">
      <h3 v-if="title">{{ title }}</h3>
      <slot />
      <div v-if="$slots.footer" class="modal-actions">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>
