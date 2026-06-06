<script setup lang="ts">
import { ref } from "vue";
import type { Channel } from "@/lib/types";
import { createChannel, updateChannel, reorderChannels, deleteChannel, getChannelDeletePreview } from "@/lib/api";
import { useToast } from "@/composables/useToast";
import { useModal } from "@/composables/useModal";

// v0.5: 频道 Pill 行
// "全部" 始终首位，不可删除/重命名
const props = withDefaults(defineProps<{
  channels: Channel[];
  selectedId: string | null; // null = 全部
  mode?: "full" | "mini";
}>(), { mode: "full" });

const emit = defineEmits<{
  select: [id: string | null];
  changed: [];
}>();

const toast = useToast();
const modal = useModal();

const creating = ref(false);
const newName = ref("");
const editingId = ref<string | null>(null);
const editName = ref("");

async function doCreate() {
  const name = newName.value.trim();
  if (!name) return;
  try {
    // 从空间上下文获取 space_id — 从第一个频道推断
    const spaceId = props.channels[0]?.space_id;
    if (!spaceId) { toast.error("无可用空间"); return; }
    await createChannel(spaceId, { name, sort_order: props.channels.length });
    newName.value = "";
    creating.value = false;
    toast.success("频道已创建");
    emit("changed");
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e));
  }
}

function startEdit(ch: Channel) {
  editingId.value = ch.id;
  editName.value = ch.name;
}
function cancelEdit() { editingId.value = null; }
async function doRename() {
  if (!editingId.value) return;
  const name = editName.value.trim();
  if (!name) return;
  try {
    await updateChannel(editingId.value, { name });
    editingId.value = null;
    toast.success("已重命名");
    emit("changed");
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e));
  }
}

async function moveChannel(index: number, direction: -1 | 1) {
  const filtered = props.channels; // 不含"全部"
  if (index < 0 || index >= filtered.length) return;
  const target = index + direction;
  if (target < 0 || target >= filtered.length) return;

  const newList = [...filtered];
  [newList[index], newList[target]] = [newList[target], newList[index]];
  const reorderItems = newList.map((ch, i) => ({ id: ch.id, sort_order: i }));

  try {
    await reorderChannels(filtered[0].space_id, { items: reorderItems });
    emit("changed");
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e));
  }
}

async function doDeleteChannel(ch: Channel) {
  try {
    const preview = await getChannelDeletePreview(ch.id);
    const additionalInfo = preview.has_space_root_position
      ? "该 Source 已在空间根节点存在展示位置，将直接移除频道位置而不迁移。"
      : "";
    const ok = await modal.confirm(
      "删除频道",
      `确定删除频道 <strong>${ch.name}</strong> 吗？将移除 ${preview.position_count} 个展示位置。Source 和历史新闻将保留。${additionalInfo}`,
      { confirmText: "确认删除", danger: true },
    );
    if (!ok) return;
    await deleteChannel(ch.id);
    toast.success("频道已删除");
    emit("changed");
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e));
  }
}

// 不含"全部"的真实频道列表（箭头排序用）
const filteredIndex = (ch: Channel) => props.channels.findIndex(c => c.id === ch.id);
</script>

<template>
  <div class="channel-pills-row">
    <div class="channel-pills">
      <!-- "全部"始终第一位 -->
      <button
        class="channel-pill"
        :class="{ active: selectedId === null }"
        @click="emit('select', null)"
      >全部</button>

      <button
        v-for="ch in channels"
        :key="ch.id"
        class="channel-pill"
        :class="{ active: selectedId === ch.id }"
        @click="emit('select', ch.id)"
      >
        <template v-if="editingId === ch.id && mode === 'full'">
          <input
            class="inline-input"
            v-model="editName"
            @keydown.enter="doRename"
            @keydown.escape="cancelEdit"
            @click.stop
            @blur="cancelEdit"
          />
        </template>
        <template v-else>{{ ch.name }}</template>
      </button>

      <!-- 创建输入 -->
      <div v-if="creating && mode === 'full'" class="channel-pill channel-pill--input">
        <input
          class="inline-input"
          v-model="newName"
          placeholder="频道名称"
          @keydown.enter="doCreate"
          @keydown.escape="creating = false"
        />
      </div>
    </div>

    <!-- 操作按钮（仅 full 模式，且有选中频道） -->
    <div v-if="mode === 'full' && selectedId !== null" class="channel-actions">
      <button
        class="btn-sm btn-icon"
        title="左移"
        @click="moveChannel(filteredIndex(channels.find(c => c.id === selectedId)!), -1)"
      >◀</button>
      <button
        class="btn-sm btn-icon"
        title="右移"
        @click="moveChannel(filteredIndex(channels.find(c => c.id === selectedId)!), 1)"
      >▶</button>
      <button class="btn-sm" @click="startEdit(channels.find(c => c.id === selectedId)!)">重命名</button>
      <button class="btn-sm btn-danger" @click="doDeleteChannel(channels.find(c => c.id === selectedId)!)">删除</button>
      <button v-if="!creating" class="btn-sm" @click="creating = true">+ 新建频道</button>
    </div>
    <div v-else-if="mode === 'full' && !creating" class="channel-actions">
      <button class="btn-sm" @click="creating = true">+ 新建频道</button>
    </div>
  </div>
</template>

<style scoped>
.channel-pills-row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.channel-pills {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}
.channel-pill {
  padding: 5px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.channel-pill:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.channel-pill.active {
  background: var(--accent);
  color: #FFF;
  border-color: var(--accent);
}
.channel-pill--input {
  padding: 0;
  border-style: dashed;
  border-color: var(--accent);
}
.inline-input {
  border: none;
  background: transparent;
  padding: 5px 14px;
  font-size: 12px;
  font-weight: 600;
  outline: none;
  color: var(--text);
  min-width: 80px;
  border-radius: 20px;
}
.channel-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.btn-sm {
  padding: 5px 12px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
}
.btn-sm:hover { background: #F4F5F7; }
.btn-icon { padding: 5px 8px; font-size: 9px; font-family: monospace; }
.btn-danger { color: var(--danger); }
.btn-danger:hover { background: var(--danger-light); }
</style>
