<script setup lang="ts">
import { ref } from "vue";
import type { Space } from "@/lib/types";
import { createSpace, updateSpace, deleteSpace, getSpaceDeletePreview } from "@/lib/api";
import { useToast } from "@/composables/useToast";
import { useModal } from "@/composables/useModal";

// v0.5: 空间卡片网格（对齐原型图 admin.html）
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

const iconOptions = ["🤖", "📈", "💻", "📰", "🎓", "🔬", "💡", "🌍"];

async function doCreate() {
  const name = newName.value.trim();
  if (!name) return;
  try {
    await createSpace({ name, icon: iconOptions[Math.floor(Math.random() * iconOptions.length)] });
    newName.value = "";
    creating.value = false;
    toast.success("空间已创建");
    emit("changed");
  } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
}

function startEdit(s: Space) { editingId.value = s.id; editName.value = s.name; }
function cancelEdit() { editingId.value = null; }
async function doRename() {
  if (!editingId.value) return;
  try {
    await updateSpace(editingId.value, { name: editName.value.trim() });
    editingId.value = null; toast.success("已重命名"); emit("changed");
  } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
}

async function doDelete(space: Space) {
  try {
    let preview = { channels_count: 0, positions_count: 0 };
    try { preview = await getSpaceDeletePreview(space.id); } catch {}
    const ok = await modal.confirm(
      "删除空间",
      `将删除 <b>${space.name}</b>、${preview.channels_count} 个频道、${preview.positions_count} 个展示位置。Source 和新闻保留。`,
      { confirmText: "确认删除", danger: true },
    );
    if (!ok) return;
    await deleteSpace(space.id);
    toast.success("已删除"); emit("changed");
  } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
}
</script>

<template>
  <div class="space-section">
    <div class="space-label">空间</div>
    <div class="space-cards">
      <div
        v-for="s in spaces" :key="s.id"
        class="space-card" :class="{ selected: selectedId === s.id }"
        @click="emit('select', s.id)"
      >
        <div class="space-icon">{{ s.icon || '📁' }}</div>
        <div class="space-body">
          <template v-if="editingId === s.id && mode === 'full'">
            <input class="space-name-input" v-model="editName"
              @keydown.enter="doRename" @keydown.escape="cancelEdit" @click.stop @blur="cancelEdit" />
          </template>
          <template v-else>
            <div class="space-name">{{ s.name }}</div>
            <div class="space-meta">{{ s.channel_count ?? 0 }} 个频道 · {{ s.source_count ?? 0 }} 个信息源</div>
          </template>
        </div>
        <div v-if="mode === 'full'" class="space-card-actions">
          <button class="act-icon" title="编辑" @click.stop="startEdit(s)">✎</button>
          <button class="act-icon danger" title="删除" @click.stop="doDelete(s)">✕</button>
        </div>
      </div>
      <div v-if="mode === 'full'" class="space-card add" @click="creating = true" v-show="!creating">
        <div class="space-icon">＋</div>
        <div class="space-body"><div class="space-name">新建空间</div></div>
      </div>
      <div v-if="creating && mode === 'full'" class="space-card creating">
        <div class="space-icon">📁</div>
        <div class="space-body">
          <input class="space-name-input" v-model="newName" placeholder="空间名称"
            @keydown.enter="doCreate" @keydown.escape="creating = false" />
        </div>
        <div class="space-card-actions">
          <button class="act-icon" @click.stop="doCreate" title="确认">✓</button>
          <button class="act-icon danger" @click.stop="creating = false" title="取消">✕</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.space-section { margin-bottom: 4px; }
.space-label { font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 8px; text-transform: uppercase; }

.space-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}
.space-card {
  background: var(--card);
  border: 2px solid var(--border-light);
  border-radius: 14px;
  padding: 18px 20px;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 14px;
  position: relative;
}
.space-card:hover { border-color: #CBD5E1; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.space-card.selected { border-color: var(--accent); background: var(--accent-light); }
.space-card.add { border-style: dashed; color: var(--accent); justify-content: center; }
.space-card.add:hover { border-color: var(--accent); background: var(--accent-light); }
.space-card.creating { border-color: var(--accent); border-style: solid; }

.space-icon {
  width: 44px; height: 44px;
  border-radius: 12px;
  background: #F4F5F7;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; flex-shrink: 0;
}
.space-card.selected .space-icon { background: var(--accent-light); }
.space-card.add .space-icon { background: var(--accent-light); color: var(--accent); font-size: 20px; }

.space-body { flex: 1; min-width: 0; }
.space-name { font-size: 15px; font-weight: 700; margin-bottom: 2px; }
.space-meta { font-size: 11px; color: var(--text-muted); }
.space-name-input {
  border: 2px solid var(--accent); border-radius: 8px; padding: 4px 8px;
  font-size: 14px; font-weight: 700; outline: none; width: 100%;
}

.space-card-actions { display: flex; gap: 4px; opacity: 0; transition: opacity 0.15s; }
.space-card:hover .space-card-actions { opacity: 1; }

.act-icon {
  width: 28px; height: 28px; border-radius: 8px; border: 1px solid transparent;
  background: transparent; cursor: pointer; font-size: 13px;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-muted); transition: all 0.15s;
}
.act-icon:hover { background: #F4F5F7; border-color: var(--border); color: var(--text); }
.act-icon.danger:hover { background: var(--danger-light); border-color: var(--danger); color: var(--danger); }
</style>
