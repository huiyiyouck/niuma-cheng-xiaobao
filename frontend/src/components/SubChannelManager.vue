<script setup lang="ts">
import { onMounted, ref } from "vue";
import { listSubChannels, createSubChannel, updateSubChannel, deleteSubChannel } from "@/lib/api";
import type { SubChannel, UUID } from "@/lib/types";

const props = defineProps<{ channelSpaceId: UUID }>();

const channels = ref<SubChannel[]>([]);
const errorText = ref<string | null>(null);
const newName = ref("");
const newSort = ref(0);
const adding = ref(false);
const editingId = ref<UUID | null>(null);
const editName = ref("");

async function refresh() {
  try {
    channels.value = await listSubChannels(props.channelSpaceId);
    newSort.value = channels.value.length;
  } catch (e) {
    errorText.value = e instanceof Error ? e.message : String(e);
  }
}

async function doAdd() {
  const name = newName.value.trim();
  if (!name) return;
  adding.value = true;
  try {
    await createSubChannel(props.channelSpaceId, { name, sort_order: newSort.value });
    newName.value = "";
    await refresh();
  } catch (e) {
    errorText.value = e instanceof Error ? e.message : String(e);
  } finally {
    adding.value = false;
  }
}

async function doUpdate(id: UUID) {
  const name = editName.value.trim();
  if (!name) return;
  try {
    await updateSubChannel(id, { name });
    editingId.value = null;
    await refresh();
  } catch (e) {
    errorText.value = e instanceof Error ? e.message : String(e);
  }
}

async function doDelete(id: UUID) {
  if (!confirm("确定删除此子频道？")) return;
  try {
    await deleteSubChannel(id);
    await refresh();
  } catch (e) {
    errorText.value = e instanceof Error ? e.message : String(e);
  }
}

function startEdit(ch: SubChannel) {
  editingId.value = ch.id;
  editName.value = ch.name;
}

onMounted(refresh);
</script>

<template>
  <div class="scm">
    <div v-if="errorText" class="error">{{ errorText }}</div>

    <div v-if="channels.length === 0" class="card empty muted">
      暂无子频道，点击下方输入框新建
    </div>

    <div v-for="(ch, i) in channels" :key="ch.id" class="scm-row">
      <template v-if="editingId === ch.id">
        <span class="scm-handle muted">::</span>
        <span class="scm-seq">{{ i + 1 }}</span>
        <input
          class="input"
          v-model="editName"
          @keydown.enter="doUpdate(ch.id)"
          style="flex:1"
        />
        <button class="btn btn-sm" style="color:#27ae60" @click="doUpdate(ch.id)">保存</button>
        <button class="btn btn-sm" @click="editingId = null">取消</button>
      </template>
      <template v-else>
        <span class="scm-handle muted">::</span>
        <span class="scm-seq">{{ i + 1 }}</span>
        <span class="scm-name">{{ ch.name }}</span>
        <div class="scm-actions">
          <button class="btn btn-sm" @click="startEdit(ch)">重命名</button>
          <button class="btn btn-sm danger" @click="doDelete(ch.id)">删除</button>
        </div>
      </template>
    </div>

    <!-- 新建行 — 蓝色虚线边框 -->
    <div class="scm-row scm-new-row">
      <span class="scm-handle muted">::</span>
      <span class="scm-seq muted">{{ channels.length + 1 }}</span>
      <input
        class="input"
        placeholder="新子频道名称"
        v-model="newName"
        @keydown.enter="doAdd"
        style="flex:1"
      />
      <button class="btn primary btn-sm" :disabled="adding" @click="doAdd">添加</button>
    </div>
  </div>
</template>

<style scoped>
.scm { display: flex; flex-direction: column; gap: 6px; }
.scm-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
}
.scm-new-row { border-style: dashed; border-color: #3498db; background: #f8fafc; }
.scm-handle { font-weight: 700; letter-spacing: 2px; font-size: 12px; cursor: grab; user-select: none; }
.scm-seq { font-size: 11px; color: var(--muted); min-width: 20px; text-align: center; }
.scm-name { font-weight: 700; font-size: 13px; flex: 1; }
.scm-actions { display: flex; gap: 4px; }
.btn-sm { padding: 6px 10px; font-size: 11px; border-radius: 8px; }
.empty { padding: 28px 16px; text-align: center; }
.error {
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(239,68,68,.25);
  background: rgba(239,68,68,.06);
  color: #991b1b;
  font-size: 13px;
}
</style>
