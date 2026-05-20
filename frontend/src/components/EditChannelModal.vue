<script setup lang="ts">
import { reactive, ref } from "vue";
import type { ChannelSourceWithSource } from "@/lib/types";

const props = defineProps<{ cs: ChannelSourceWithSource }>();
const emit = defineEmits<{
  close: [];
  submit: [enabled: boolean, everySeconds: number, maxItems: number];
}>();

const form = reactive({
  enabled: props.cs.channel_source.enabled,
  everySeconds: props.cs.channel_source.fetch_policy?.schedule?.every_seconds ?? 600,
  maxItems: props.cs.channel_source.fetch_policy?.budget?.max_items_per_run ?? 20,
});
const loading = ref(false);

function onSubmit() {
  emit("submit", form.enabled, Number(form.everySeconds), Number(form.maxItems));
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-box">
      <div class="modal-title">编辑渠道：{{ cs.source.name }}</div>
      <label class="pill"><input type="checkbox" v-model="form.enabled" /> 启用</label>
      <div class="row" style="margin-top:12px">
        <div class="grow"><div class="muted" style="font-size:11px">抓取间隔（秒）</div><input class="input" type="number" v-model.number="form.everySeconds" /></div>
        <div class="grow"><div class="muted" style="font-size:11px">每次最大条数</div><input class="input" type="number" v-model.number="form.maxItems" /></div>
      </div>
      <div class="row" style="margin-top:16px;justify-content:flex-end">
        <button class="btn" @click="emit('close')">取消</button>
        <button class="btn primary" :disabled="loading" @click="onSubmit">保存</button>
      </div>
    </div>
  </div>
</template>
