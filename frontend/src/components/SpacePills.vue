<script setup lang="ts">
import { ref } from "vue";
import type { Space } from "@/lib/types";
import { createSpace, updateSpace, reorderSpaces, getSpaceDeletePreview, deleteSpace } from "@/lib/api";
import { useToast } from "@/composables/useToast";
import { useModal } from "@/composables/useModal";

// v0.5: 空间 Pill 行，含创建/重命名/排序/删除
// mode: full -> 显示所有操作 / mini -> 只显示 Pill（浏览页使用）
const props = withDefaults(defineProps<{
  spaces: Space[];
  selectedId: string | null;
  mode?: "full" | "mini";
}>(), { mode: "full" });

const emit = defineEmits<{
  select: [id: string];
  changed: [];
}>();

const toast = useToast();
const modal = useModal();

const creating = ref(false);
const newName = ref("");
const editingId = ref<string | null>(null);
const editName = ref("");

// 创建空间
async function doCreate() {
  const name = newName.value.trim();
  if (!name) return;
  try {
    await createSpace({ name });
    newName.value = "";
    creating.value = false;
    toast.success("空间已创建");
    emit("changed");
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e));
  }
}

// 重命名空间
function startEdit(s: Space) {
  editingId.value = s.id;
  editName.value = s.name;
}
function cancelEdit() {
  editingId.value = null;
}
async function doRename() {
  if (!editingId.value) return;
  const name = editName.value.trim();
  if (!name) return;
  try {
    await updateSpace(editingId.value, { name });
    editingId.value = null;
    toast.success("已重命名");
    emit("changed");
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e));
  }
}

// 排序（箭头按钮）
async function moveSpace(index: number, direction: -1 | 1) {
  const items = [...props.spaces];
  const target = index + direction;
  if (target < 0 || target >= items.length) return;

  // 交换 sort_order
  const a = items[index];
  const b = items[target];
  const newItems = items.map((s, i) => {
    if (i === index) return { ...s, sort_order: b.sort_order };
    if (i === target) return { ...s, sort_order: a.sort_order };
    return s;
  });
  // 重新编号
  const reorderItems = [...newItems].sort((x, y) => x.sort_order - y.sort_order).map((s, i) => ({ id: s.id, sort_order: i }));

  try {
    await reorderSpaces({ items: reorderItems });
    emit("changed");
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e));
  }
}

// 删除空间
async function doDeleteSpace(s: Space) {
  try {
    const preview = await getSpaceDeletePreview(s.id);
    const ok = await modal.confirm(
      "删除空间",
      `确定删除 <strong>${s.name}</strong> 吗？将删除该空间下的 ${preview.channel_count} 个频道、${preview.position_count} 个展示位置，但保留 ${preview.news_count} 条历史新闻。`,
      { confirmText: "确认删除", danger: true },
    );
    if (!ok) return;
    await deleteSpace(s.id);
    toast.success("空间已删除");
    emit("changed");
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e));
  }
}
</script>

<template>
  <div class="space-pills-row">
    <div class="space-pills">
      <button
        v-for="(s, i) in spaces"
        :key="s.id"
        class="space-pill"
        :class="{ active: selectedId === s.id }"
        @click="emit('select', s.id)"
      >
        <!-- 重命名中 -->
        <template v-if="editingId === s.id && mode === 'full'">
          <input
            class="inline-input"
            v-model="editName"
            @keydown.enter="doRename"
            @keydown.escape="cancelEdit"
            @click.stop
            @blur="cancelEdit"
          />
        </template>
        <template v-else>{{ s.name }}</template>
      </button>

      <!-- 创建输入 -->
      <div v-if="creating && mode === 'full'" class="space-pill space-pill--input">
        <input
          class="inline-input"
          v-model="newName"
          placeholder="空间名称"
          @keydown.enter="doCreate"
          @keydown.escape="creating = false"
        />
      </div>
    </div>

    <!-- 操作按钮（仅 full 模式） -->
    <div v-if="mode === 'full'" class="space-actions">
      <button v-if="!creating" class="btn-sm" @click="creating = true">+ 新建空间</button>
      <template v-if="selectedId">
        <!-- 排序箭头 -->
        <button
          class="btn-sm btn-icon"
          title="左移"
          @click="moveSpace(spaces.findIndex(s => s.id === selectedId), -1)"
        >◀</button>
        <button
          class="btn-sm btn-icon"
          title="右移"
          @click="moveSpace(spaces.findIndex(s => s.id === selectedId), 1)"
        >▶</button>
        <!-- 重命名 -->
        <button class="btn-sm" @click="startEdit(spaces.find(s => s.id === selectedId)!)">重命名</button>
        <!-- 删除 -->
        <button class="btn-sm btn-danger" @click="doDeleteSpace(spaces.find(s => s.id === selectedId)!)">删除</button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.space-pills-row {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 10px 16px;
  background: var(--card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  box-shadow: var(--shadow-soft);
}
.space-pills {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}
.space-pill {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.space-pill:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.space-pill.active {
  background: var(--accent);
  color: #FFF;
  border-color: var(--accent);
}
.space-pill--input {
  padding: 0;
  border-style: dashed;
  border-color: var(--accent);
}
.inline-input {
  border: none;
  background: transparent;
  padding: 6px 16px;
  font-size: 12px;
  font-weight: 700;
  outline: none;
  color: var(--text);
  min-width: 80px;
  width: 100%;
  border-radius: 20px;
}
.space-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.btn-sm {
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
}
.btn-sm:hover { background: #F4F5F7; }
.btn-icon {
  padding: 6px 10px;
  font-size: 10px;
  font-family: monospace;
}
.btn-danger { color: var(--danger); }
.btn-danger:hover { background: var(--danger-light); }
</style>
