<script setup lang="ts">
import { reactive, ref } from "vue";
import type { Source, UUID } from "@/lib/types";

defineProps<{ sources: Source[] }>();
const emit = defineEmits<{
  close: [];
  submit: [sourceId: UUID, enabled: boolean, everySeconds: number, maxItems: number];
}>();

const form = reactive({ sourceId: "" as UUID | "", enabled: true, everySeconds: 600, maxItems: 20 });
const loading = ref(false);

function onSubmit() {
  if (!form.sourceId) return;
  emit("submit", form.sourceId as UUID, form.enabled, Number(form.everySeconds), Number(form.maxItems));
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-box">
      <div class="modal-title">绑定新渠道</div>
      <select class="select" v-model="form.sourceId">
        <option value="">选择 Source</option>
        <option v-for="s in sources" :key="s.id" :value="s.id">{{ s.name }} ({{ s.type }})</option>
      </select>
      <div class="row" style="margin-top:12px">
        <label class="pill"><input type="checkbox" v-model="form.enabled" /> 启用</label>
        <div class="grow"><div class="muted" style="font-size:11px">抓取间隔（秒）</div><input class="input" type="number" v-model.number="form.everySeconds" /></div>
        <div class="grow"><div class="muted" style="font-size:11px">每次最大条数</div><input class="input" type="number" v-model.number="form.maxItems" /></div>
      </div>
      <div class="row" style="margin-top:16px;justify-content:flex-end">
        <button class="btn" @click="emit('close')">取消</button>
        <button class="btn primary" :disabled="loading" @click="onSubmit">绑定</button>
      </div>
    </div>
  </div>
</template>
