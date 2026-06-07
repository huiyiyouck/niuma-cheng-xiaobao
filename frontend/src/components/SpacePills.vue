<script setup lang="ts">
import { ref } from "vue";
import type { Space } from "@/lib/types";
import { createSpace, updateSpace, deleteSpace, getSpaceDeletePreview } from "@/lib/api";
import BaseModal from "@/components/base/BaseModal.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseFormField from "@/components/base/BaseFormField.vue";
import { useToast } from "@/composables/useToast";
import { useModal } from "@/composables/useModal";

const props = withDefaults(defineProps<{
  spaces: Space[];
  selectedId: string | null;
  mode?: "full" | "mini";
}>(), { mode: "full" });

const emit = defineEmits<{ select: [id: string]; changed: [] }>();
const toast = useToast();
const modal = useModal();

const showCreate = ref(false);
const createForm = ref({ name: "", icon: "📁" });

const showEdit = ref(false);
const editTarget = ref<Space | null>(null);
const editForm = ref({ name: "", icon: "📁" });

function openCreate() { createForm.value = { name: "", icon: "📁" }; showCreate.value = true; }
async function doCreate() {
  const name = createForm.value.name.trim();
  if (!name) return;
  try { await createSpace({ name, icon: createForm.value.icon }); showCreate.value = false; toast.success("空间已创建"); emit("changed"); }
  catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
}

function openEdit(s: Space) { editTarget.value = s; editForm.value = { name: s.name, icon: s.icon || "📁" }; showEdit.value = true; }
async function doEdit() {
  if (!editTarget.value) return;
  try { await updateSpace(editTarget.value.id, { name: editForm.value.name.trim(), icon: editForm.value.icon }); showEdit.value = false; toast.success("已更新"); emit("changed"); }
  catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
}

async function doDelete(space: Space) {
  try {
    let preview = { channels_count: 0, positions_count: 0 };
    try { preview = await getSpaceDeletePreview(space.id); } catch {}
    const ok = await modal.confirm("删除空间", `将删除 <b>${space.name}</b>、${preview.channels_count} 个频道、${preview.positions_count} 个展示位置。Source 和新闻保留。`, { confirmText: "确认删除", danger: true });
    if (!ok) return;
    await deleteSpace(space.id); toast.success("已删除"); emit("changed");
  } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
}
</script>

<template>
  <div class="space-section">
    <div class="space-label">空间</div>
    <div class="space-cards">
      <div v-for="s in spaces" :key="s.id" class="space-card" :class="{ selected: selectedId === s.id }" @click="emit('select', s.id)">
        <div class="space-icon">{{ s.icon || '📁' }}</div>
        <div class="space-body">
          <div class="space-name">{{ s.name }}</div>
          <div class="space-meta">{{ s.channel_count ?? 0 }} 个频道 · {{ s.source_count ?? 0 }} 个信息源</div>
        </div>
        <div v-if="mode === 'full'" class="space-card-actions">
          <button class="act-icon" title="编辑" @click.stop="openEdit(s)">✎</button>
          <button class="act-icon danger" title="删除" @click.stop="doDelete(s)">✕</button>
        </div>
      </div>
      <div v-if="mode === 'full'" class="space-card add" @click="openCreate">
        <div class="space-icon">＋</div>
        <div class="space-body"><div class="space-name">新建空间</div></div>
      </div>
    </div>
  </div>

  <!-- 新建空间弹窗 -->
  <BaseModal v-if="showCreate" title="新建空间" @close="showCreate = false">
    <BaseFormField label="空间名称">
      <input class="form-f" v-model="createForm.name" placeholder="如：AI、财经" @keydown.enter="doCreate" />
    </BaseFormField>
    <BaseFormField label="图标">
      <input class="form-f" v-model="createForm.icon" placeholder="📁" />
    </BaseFormField>
    <template #footer>
      <BaseButton @click="showCreate = false">取消</BaseButton>
      <BaseButton variant="primary" @click="doCreate">确认创建</BaseButton>
    </template>
  </BaseModal>

  <!-- 编辑空间弹窗 -->
  <BaseModal v-if="showEdit" title="编辑空间" @close="showEdit = false">
    <BaseFormField label="空间名称">
      <input class="form-f" v-model="editForm.name" @keydown.enter="doEdit" />
    </BaseFormField>
    <BaseFormField label="图标">
      <input class="form-f" v-model="editForm.icon" />
    </BaseFormField>
    <template #footer>
      <BaseButton @click="showEdit = false">取消</BaseButton>
      <BaseButton variant="primary" @click="doEdit">保存</BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.space-section { margin-bottom: 4px; }
.space-label { font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.3px; }
.space-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
.space-card { background: var(--card); border: 1px solid var(--border-light); border-radius: 14px; padding: 18px 20px; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 14px; position: relative; }
.space-card:hover { border-color: #CBD5E1; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); }
.space-card.selected { border-color: var(--accent); background: var(--accent-light); }
.space-card.add { border-style: dashed; color: var(--accent); justify-content: center; }
.space-card.add:hover { border-color: var(--accent); background: var(--accent-light); }
.space-icon { width: 44px; height: 44px; border-radius: 12px; background: #F4F5F7; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
.space-card.selected .space-icon { background: var(--accent-light); }
.space-card.add .space-icon { background: var(--accent-light); color: var(--accent); font-size: 20px; }
.space-body { flex: 1; min-width: 0; }
.space-name { font-size: 15px; font-weight: 700; margin-bottom: 2px; }
.space-meta { font-size: 11px; color: var(--text-muted); }
.space-card-actions { display: flex; gap: 4px; opacity: 0; transition: opacity 0.15s; }
.space-card:hover .space-card-actions { opacity: 1; }
.act-icon { width: 28px; height: 28px; border-radius: 8px; border: 1px solid transparent; background: transparent; cursor: pointer; font-size: 13px; display: flex; align-items: center; justify-content: center; color: var(--text-muted); transition: all 0.15s; }
.act-icon:hover { background: #F4F5F7; border-color: var(--border); color: var(--text); }
.act-icon.danger:hover { background: var(--danger-light); border-color: var(--danger); color: var(--danger); }
</style>