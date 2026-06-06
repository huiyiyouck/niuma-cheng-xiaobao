/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref } from "vue";
import { createChannel, updateChannel, reorderChannels, deleteChannel, getChannelDeletePreview } from "@/lib/api";
import { useToast } from "@/composables/useToast";
import { useModal } from "@/composables/useModal";
const props = withDefaults(defineProps(), { mode: "full" });
const emit = defineEmits();
const toast = useToast();
const modal = useModal();
const creating = ref(false);
const newName = ref("");
const editingId = ref(null);
const editName = ref("");
async function doCreate() {
    const name = newName.value.trim();
    if (!name)
        return;
    try {
        // 从空间上下文获取 space_id — 从第一个频道推断
        const spaceId = props.channels[0]?.space_id;
        if (!spaceId) {
            toast.error("无可用空间");
            return;
        }
        await createChannel(spaceId, { name, sort_order: props.channels.length });
        newName.value = "";
        creating.value = false;
        toast.success("频道已创建");
        emit("changed");
    }
    catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
    }
}
function startEdit(ch) {
    editingId.value = ch.id;
    editName.value = ch.name;
}
function cancelEdit() { editingId.value = null; }
async function doRename() {
    if (!editingId.value)
        return;
    const name = editName.value.trim();
    if (!name)
        return;
    try {
        await updateChannel(editingId.value, { name });
        editingId.value = null;
        toast.success("已重命名");
        emit("changed");
    }
    catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
    }
}
async function moveChannel(index, direction) {
    const filtered = props.channels; // 不含"全部"
    if (index < 0 || index >= filtered.length)
        return;
    const target = index + direction;
    if (target < 0 || target >= filtered.length)
        return;
    const newList = [...filtered];
    [newList[index], newList[target]] = [newList[target], newList[index]];
    const reorderItems = newList.map((ch, i) => ({ id: ch.id, sort_order: i }));
    try {
        await reorderChannels(filtered[0].space_id, { items: reorderItems });
        emit("changed");
    }
    catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
    }
}
async function doDeleteChannel(ch) {
    try {
        const preview = await getChannelDeletePreview(ch.id);
        const additionalInfo = preview.has_space_root_position
            ? "该 Source 已在空间根节点存在展示位置，将直接移除频道位置而不迁移。"
            : "";
        const ok = await modal.confirm("删除频道", `确定删除频道 <strong>${ch.name}</strong> 吗？将移除 ${preview.position_count} 个展示位置。Source 和历史新闻将保留。${additionalInfo}`, { confirmText: "确认删除", danger: true });
        if (!ok)
            return;
        await deleteChannel(ch.id);
        toast.success("频道已删除");
        emit("changed");
    }
    catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
    }
}
// 不含"全部"的真实频道列表（箭头排序用）
const filteredIndex = (ch) => props.channels.findIndex(c => c.id === ch.id);
const __VLS_defaults = { mode: "full" };
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['channel-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['channel-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-danger']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "channel-pills-row" },
});
/** @type {__VLS_StyleScopedClasses['channel-pills-row']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "channel-pills" },
});
/** @type {__VLS_StyleScopedClasses['channel-pills']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.emit('select', null);
            // @ts-ignore
            [emit,];
        } },
    ...{ class: "channel-pill" },
    ...{ class: ({ active: __VLS_ctx.selectedId === null }) },
});
/** @type {__VLS_StyleScopedClasses['channel-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
for (const [ch] of __VLS_vFor((__VLS_ctx.channels))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.emit('select', ch.id);
                // @ts-ignore
                [emit, selectedId, channels,];
            } },
        key: (ch.id),
        ...{ class: "channel-pill" },
        ...{ class: ({ active: __VLS_ctx.selectedId === ch.id }) },
    });
    /** @type {__VLS_StyleScopedClasses['channel-pill']} */ ;
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    if (__VLS_ctx.editingId === ch.id && __VLS_ctx.mode === 'full') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            ...{ onKeydown: (__VLS_ctx.doRename) },
            ...{ onKeydown: (__VLS_ctx.cancelEdit) },
            ...{ onClick: () => { } },
            ...{ onBlur: (__VLS_ctx.cancelEdit) },
            ...{ class: "inline-input" },
        });
        (__VLS_ctx.editName);
        /** @type {__VLS_StyleScopedClasses['inline-input']} */ ;
    }
    else {
        (ch.name);
    }
    // @ts-ignore
    [selectedId, editingId, mode, doRename, cancelEdit, cancelEdit, editName,];
}
if (__VLS_ctx.creating && __VLS_ctx.mode === 'full') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "channel-pill channel-pill--input" },
    });
    /** @type {__VLS_StyleScopedClasses['channel-pill']} */ ;
    /** @type {__VLS_StyleScopedClasses['channel-pill--input']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onKeydown: (__VLS_ctx.doCreate) },
        ...{ onKeydown: (...[$event]) => {
                if (!(__VLS_ctx.creating && __VLS_ctx.mode === 'full'))
                    return;
                __VLS_ctx.creating = false;
                // @ts-ignore
                [mode, creating, creating, doCreate,];
            } },
        ...{ class: "inline-input" },
        placeholder: "频道名称",
    });
    (__VLS_ctx.newName);
    /** @type {__VLS_StyleScopedClasses['inline-input']} */ ;
}
if (__VLS_ctx.mode === 'full' && __VLS_ctx.selectedId !== null) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "channel-actions" },
    });
    /** @type {__VLS_StyleScopedClasses['channel-actions']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.mode === 'full' && __VLS_ctx.selectedId !== null))
                    return;
                __VLS_ctx.moveChannel(__VLS_ctx.filteredIndex(__VLS_ctx.channels.find(c => c.id === __VLS_ctx.selectedId)), -1);
                // @ts-ignore
                [selectedId, selectedId, channels, mode, newName, moveChannel, filteredIndex,];
            } },
        ...{ class: "btn-sm btn-icon" },
        title: "左移",
    });
    /** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['btn-icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.mode === 'full' && __VLS_ctx.selectedId !== null))
                    return;
                __VLS_ctx.moveChannel(__VLS_ctx.filteredIndex(__VLS_ctx.channels.find(c => c.id === __VLS_ctx.selectedId)), 1);
                // @ts-ignore
                [selectedId, channels, moveChannel, filteredIndex,];
            } },
        ...{ class: "btn-sm btn-icon" },
        title: "右移",
    });
    /** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['btn-icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.mode === 'full' && __VLS_ctx.selectedId !== null))
                    return;
                __VLS_ctx.startEdit(__VLS_ctx.channels.find(c => c.id === __VLS_ctx.selectedId));
                // @ts-ignore
                [selectedId, channels, startEdit,];
            } },
        ...{ class: "btn-sm" },
    });
    /** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.mode === 'full' && __VLS_ctx.selectedId !== null))
                    return;
                __VLS_ctx.doDeleteChannel(__VLS_ctx.channels.find(c => c.id === __VLS_ctx.selectedId));
                // @ts-ignore
                [selectedId, channels, doDeleteChannel,];
            } },
        ...{ class: "btn-sm btn-danger" },
    });
    /** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['btn-danger']} */ ;
    if (!__VLS_ctx.creating) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.mode === 'full' && __VLS_ctx.selectedId !== null))
                        return;
                    if (!(!__VLS_ctx.creating))
                        return;
                    __VLS_ctx.creating = true;
                    // @ts-ignore
                    [creating, creating,];
                } },
            ...{ class: "btn-sm" },
        });
        /** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
    }
}
else if (__VLS_ctx.mode === 'full' && !__VLS_ctx.creating) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "channel-actions" },
    });
    /** @type {__VLS_StyleScopedClasses['channel-actions']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.mode === 'full' && __VLS_ctx.selectedId !== null))
                    return;
                if (!(__VLS_ctx.mode === 'full' && !__VLS_ctx.creating))
                    return;
                __VLS_ctx.creating = true;
                // @ts-ignore
                [mode, creating, creating,];
            } },
        ...{ class: "btn-sm" },
    });
    /** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __defaults: __VLS_defaults,
    __typeProps: {},
});
export default {};
