<script setup lang="ts">
import { reactive, ref } from "vue";

const emit = defineEmits<{ close: []; submit: [name: string, desc: string] }>();
const form = reactive({ name: "", description: "" });
const loading = ref(false);

async function onSubmit() {
  if (!form.name.trim()) return;
  loading.value = true;
  try { emit("submit", form.name.trim(), form.description.trim()); }
  finally { loading.value = false; }
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-box">
      <div class="modal-title">新建频道空间</div>
      <input class="input" placeholder="名称" v-model="form.name" />
      <input class="input" style="margin-top:10px" placeholder="描述（可选）" v-model="form.description" />
      <div class="row" style="margin-top:16px;justify-content:flex-end">
        <button class="btn" @click="emit('close')">取消</button>
        <button class="btn primary" :disabled="loading" @click="onSubmit">创建</button>
      </div>
    </div>
  </div>
</template>
