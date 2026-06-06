/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref } from "vue";
import { createSpace, updateSpace, reorderSpaces, getSpaceDeletePreview, deleteSpace } from "@/lib/api";
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
// 创建空间
async function doCreate() {
    const name = newName.value.trim();
    if (!name)
        return;
    try {
        await createSpace({ name });
        newName.value = "";
        creating.value = false;
        toast.success("空间已创建");
        emit("changed");
    }
    catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
    }
}
// 重命名空间
function startEdit(s) {
    editingId.value = s.id;
    editName.value = s.name;
}
function cancelEdit() {
    editingId.value = null;
}
async function doRename() {
    if (!editingId.value)
        return;
    const name = editName.value.trim();
    if (!name)
        return;
    try {
        await updateSpace(editingId.value, { name });
        editingId.value = null;
        toast.success("已重命名");
        emit("changed");
    }
    catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
    }
}
// 排序（箭头按钮）
async function moveSpace(index, direction) {
    const items = [...props.spaces];
    const target = index + direction;
    if (target < 0 || target >= items.length)
        return;
    // 交换 sort_order
    const a = items[index];
    const b = items[target];
    const newItems = items.map((s, i) => {
        if (i === index)
            return { ...s, sort_order: b.sort_order };
        if (i === target)
            return { ...s, sort_order: a.sort_order };
        return s;
    });
    // 重新编号
    const reorderItems = [...newItems].sort((x, y) => x.sort_order - y.sort_order).map((s, i) => ({ id: s.id, sort_order: i }));
    try {
        await reorderSpaces({ items: reorderItems });
        emit("changed");
    }
    catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
    }
}
// 删除空间
async function doDeleteSpace(s) {
    try {
        const preview = await getSpaceDeletePreview(s.id);
        const ok = await modal.confirm("删除空间", `确定删除 <strong>${s.name}</strong> 吗？将删除该空间下的 ${preview.channel_count} 个频道、${preview.position_count} 个展示位置，但保留 ${preview.news_count} 条历史新闻。`, { confirmText: "确认删除", danger: true });
        if (!ok)
            return;
        await deleteSpace(s.id);
        toast.success("空间已删除");
        emit("changed");
    }
    catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
    }
}
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
/** @type {__VLS_StyleScopedClasses['space-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['space-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-danger']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "space-pills-row" },
});
/** @type {__VLS_StyleScopedClasses['space-pills-row']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "space-pills" },
});
/** @type {__VLS_StyleScopedClasses['space-pills']} */ ;
for (const [s, i] of __VLS_vFor((__VLS_ctx.spaces))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.emit('select', s.id);
                // @ts-ignore
                [spaces, emit,];
            } },
        key: (s.id),
        ...{ class: "space-pill" },
        ...{ class: ({ active: __VLS_ctx.selectedId === s.id }) },
    });
    /** @type {__VLS_StyleScopedClasses['space-pill']} */ ;
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    if (__VLS_ctx.editingId === s.id && __VLS_ctx.mode === 'full') {
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
        (s.name);
    }
    // @ts-ignore
    [selectedId, editingId, mode, doRename, cancelEdit, cancelEdit, editName,];
}
if (__VLS_ctx.creating && __VLS_ctx.mode === 'full') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "space-pill space-pill--input" },
    });
    /** @type {__VLS_StyleScopedClasses['space-pill']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-pill--input']} */ ;
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
        placeholder: "空间名称",
    });
    (__VLS_ctx.newName);
    /** @type {__VLS_StyleScopedClasses['inline-input']} */ ;
}
if (__VLS_ctx.mode === 'full') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "space-actions" },
    });
    /** @type {__VLS_StyleScopedClasses['space-actions']} */ ;
    if (!__VLS_ctx.creating) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.mode === 'full'))
                        return;
                    if (!(!__VLS_ctx.creating))
                        return;
                    __VLS_ctx.creating = true;
                    // @ts-ignore
                    [mode, creating, creating, newName,];
                } },
            ...{ class: "btn-sm" },
        });
        /** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
    }
    if (__VLS_ctx.selectedId) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.mode === 'full'))
                        return;
                    if (!(__VLS_ctx.selectedId))
                        return;
                    __VLS_ctx.moveSpace(__VLS_ctx.spaces.findIndex(s => s.id === __VLS_ctx.selectedId), -1);
                    // @ts-ignore
                    [spaces, selectedId, selectedId, moveSpace,];
                } },
            ...{ class: "btn-sm btn-icon" },
            title: "左移",
        });
        /** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['btn-icon']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.mode === 'full'))
                        return;
                    if (!(__VLS_ctx.selectedId))
                        return;
                    __VLS_ctx.moveSpace(__VLS_ctx.spaces.findIndex(s => s.id === __VLS_ctx.selectedId), 1);
                    // @ts-ignore
                    [spaces, selectedId, moveSpace,];
                } },
            ...{ class: "btn-sm btn-icon" },
            title: "右移",
        });
        /** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['btn-icon']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.mode === 'full'))
                        return;
                    if (!(__VLS_ctx.selectedId))
                        return;
                    __VLS_ctx.startEdit(__VLS_ctx.spaces.find(s => s.id === __VLS_ctx.selectedId));
                    // @ts-ignore
                    [spaces, selectedId, startEdit,];
                } },
            ...{ class: "btn-sm" },
        });
        /** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.mode === 'full'))
                        return;
                    if (!(__VLS_ctx.selectedId))
                        return;
                    __VLS_ctx.doDeleteSpace(__VLS_ctx.spaces.find(s => s.id === __VLS_ctx.selectedId));
                    // @ts-ignore
                    [spaces, selectedId, doDeleteSpace,];
                } },
            ...{ class: "btn-sm btn-danger" },
        });
        /** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['btn-danger']} */ ;
    }
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __defaults: __VLS_defaults,
    __typeProps: {},
});
export default {};
