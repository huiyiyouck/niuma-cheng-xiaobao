/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { onMounted, ref, watch } from "vue";
import { listSpaces, listChannels, listSpaceSources, removeDisplayPosition, addDisplayPosition } from "@/lib/api";
import SpacePills from "@/components/SpacePills.vue";
import ChannelPills from "@/components/ChannelPills.vue";
import SourceCard from "@/components/SourceCard.vue";
import SourceCreateForm from "@/components/SourceCreateForm.vue";
import EmptyState from "@/components/EmptyState.vue";
import { useToast } from "@/composables/useToast";
// v0.5: 空间管理 Tab
// 三层结构：SpacePills + ChannelPills + SourceCard 列表
const toast = useToast();
const spaces = ref([]);
const channels = ref([]);
const sources = ref([]);
const loading = ref(false);
const errorText = ref(null);
const selectedSpaceId = ref(null);
const selectedChannelId = ref(null); // null = 全部
const showAddSource = ref(false);
// 初始加载
onMounted(async () => {
    await refreshSpaces();
});
async function refreshSpaces() {
    try {
        spaces.value = await listSpaces();
        if (!selectedSpaceId.value && spaces.value.length > 0) {
            selectedSpaceId.value = spaces.value[0].id;
        }
    }
    catch (e) {
        errorText.value = e instanceof Error ? e.message : String(e);
    }
}
async function refreshChannels() {
    if (!selectedSpaceId.value) {
        channels.value = [];
        return;
    }
    try {
        channels.value = await listChannels(selectedSpaceId.value);
    }
    catch {
        channels.value = [];
    }
}
async function refreshSources() {
    if (!selectedSpaceId.value) {
        sources.value = [];
        return;
    }
    loading.value = true;
    errorText.value = null;
    try {
        sources.value = await listSpaceSources(selectedSpaceId.value, selectedChannelId.value);
    }
    catch (e) {
        errorText.value = e instanceof Error ? e.message : String(e);
    }
    finally {
        loading.value = false;
    }
}
async function onSpaceSelect(id) {
    selectedSpaceId.value = id;
    selectedChannelId.value = null;
    showAddSource.value = false;
}
async function onChannelSelect(id) {
    selectedChannelId.value = id;
    showAddSource.value = false;
}
async function onRemovePosition(positionId) {
    try {
        await removeDisplayPosition(positionId);
        toast.success("展示位置已移除");
        await refreshSources();
    }
    catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
    }
}
async function onSourceCreated(sourceId) {
    showAddSource.value = false;
    // 创建成功后自动添加展示位置
    try {
        await addDisplayPosition(sourceId, {
            space_id: selectedSpaceId.value,
            channel_id: selectedChannelId.value,
        });
        toast.success("已添加到当前位置");
    }
    catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
    }
    await refreshSources();
}
watch(selectedSpaceId, () => {
    refreshChannels();
    refreshSources();
});
watch(selectedChannelId, () => refreshSources());
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['add-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "space-mgmt" },
});
/** @type {__VLS_StyleScopedClasses['space-mgmt']} */ ;
if (__VLS_ctx.errorText) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "error-bar" },
    });
    /** @type {__VLS_StyleScopedClasses['error-bar']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.errorText);
}
const __VLS_0 = SpacePills;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    ...{ 'onSelect': {} },
    ...{ 'onChanged': {} },
    spaces: (__VLS_ctx.spaces),
    selectedId: (__VLS_ctx.selectedSpaceId),
    mode: "full",
}));
const __VLS_2 = __VLS_1({
    ...{ 'onSelect': {} },
    ...{ 'onChanged': {} },
    spaces: (__VLS_ctx.spaces),
    selectedId: (__VLS_ctx.selectedSpaceId),
    mode: "full",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_5;
const __VLS_6 = ({ select: {} },
    { onSelect: (__VLS_ctx.onSpaceSelect) });
const __VLS_7 = ({ changed: {} },
    { onChanged: (...[$event]) => {
            __VLS_ctx.refreshSpaces();
            // @ts-ignore
            [errorText, errorText, spaces, selectedSpaceId, onSpaceSelect, refreshSpaces,];
        } });
var __VLS_3;
var __VLS_4;
if (__VLS_ctx.selectedSpaceId) {
    const __VLS_8 = ChannelPills;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent1(__VLS_8, new __VLS_8({
        ...{ 'onSelect': {} },
        ...{ 'onChanged': {} },
        channels: (__VLS_ctx.channels),
        selectedId: (__VLS_ctx.selectedChannelId),
        mode: "full",
    }));
    const __VLS_10 = __VLS_9({
        ...{ 'onSelect': {} },
        ...{ 'onChanged': {} },
        channels: (__VLS_ctx.channels),
        selectedId: (__VLS_ctx.selectedChannelId),
        mode: "full",
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    let __VLS_13;
    const __VLS_14 = ({ select: {} },
        { onSelect: (__VLS_ctx.onChannelSelect) });
    const __VLS_15 = ({ changed: {} },
        { onChanged: (...[$event]) => {
                if (!(__VLS_ctx.selectedSpaceId))
                    return;
                __VLS_ctx.refreshChannels();
                // @ts-ignore
                [selectedSpaceId, channels, selectedChannelId, onChannelSelect, refreshChannels,];
            } });
    var __VLS_11;
    var __VLS_12;
}
if (!__VLS_ctx.selectedSpaceId) {
    const __VLS_16 = EmptyState;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent1(__VLS_16, new __VLS_16({
        icon: "&#128194;",
        title: "暂无空间",
        description: "点击「+ 新建空间」创建第一个空间",
    }));
    const __VLS_18 = __VLS_17({
        icon: "&#128194;",
        title: "暂无空间",
        description: "点击「+ 新建空间」创建第一个空间",
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
}
else {
    if (__VLS_ctx.loading) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "loading-state" },
        });
        /** @type {__VLS_StyleScopedClasses['loading-state']} */ ;
    }
    else if (__VLS_ctx.sources.length === 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "empty-section" },
        });
        /** @type {__VLS_StyleScopedClasses['empty-section']} */ ;
        const __VLS_21 = EmptyState;
        // @ts-ignore
        const __VLS_22 = __VLS_asFunctionalComponent1(__VLS_21, new __VLS_21({
            icon: "&#128225;",
            title: "当前位置暂无信息源",
            description: (__VLS_ctx.selectedChannelId ? '在该频道下添加信息源' : '在空间根节点添加信息源'),
        }));
        const __VLS_23 = __VLS_22({
            icon: "&#128225;",
            title: "当前位置暂无信息源",
            description: (__VLS_ctx.selectedChannelId ? '在该频道下添加信息源' : '在空间根节点添加信息源'),
        }, ...__VLS_functionalComponentArgsRest(__VLS_22));
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "source-list" },
        });
        /** @type {__VLS_StyleScopedClasses['source-list']} */ ;
        for (const [s] of __VLS_vFor((__VLS_ctx.sources))) {
            const __VLS_26 = SourceCard;
            // @ts-ignore
            const __VLS_27 = __VLS_asFunctionalComponent1(__VLS_26, new __VLS_26({
                ...{ 'onRefresh': {} },
                ...{ 'onRemove': {} },
                key: (s.id),
                source: (s),
                currentSpaceId: (__VLS_ctx.selectedSpaceId),
                currentChannelId: (__VLS_ctx.selectedChannelId),
            }));
            const __VLS_28 = __VLS_27({
                ...{ 'onRefresh': {} },
                ...{ 'onRemove': {} },
                key: (s.id),
                source: (s),
                currentSpaceId: (__VLS_ctx.selectedSpaceId),
                currentChannelId: (__VLS_ctx.selectedChannelId),
            }, ...__VLS_functionalComponentArgsRest(__VLS_27));
            let __VLS_31;
            const __VLS_32 = ({ refresh: {} },
                { onRefresh: (...[$event]) => {
                        if (!!(!__VLS_ctx.selectedSpaceId))
                            return;
                        if (!!(__VLS_ctx.loading))
                            return;
                        if (!!(__VLS_ctx.sources.length === 0))
                            return;
                        __VLS_ctx.refreshSources();
                        // @ts-ignore
                        [selectedSpaceId, selectedSpaceId, selectedChannelId, selectedChannelId, loading, sources, sources, refreshSources,];
                    } });
            const __VLS_33 = ({ remove: {} },
                { onRemove: (__VLS_ctx.onRemovePosition) });
            var __VLS_29;
            var __VLS_30;
            // @ts-ignore
            [onRemovePosition,];
        }
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "add-section" },
    });
    /** @type {__VLS_StyleScopedClasses['add-section']} */ ;
    if (!__VLS_ctx.showAddSource) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.selectedSpaceId))
                        return;
                    if (!(!__VLS_ctx.showAddSource))
                        return;
                    __VLS_ctx.showAddSource = true;
                    // @ts-ignore
                    [showAddSource, showAddSource,];
                } },
            ...{ class: "btn add-btn" },
        });
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['add-btn']} */ ;
    }
    else {
        const __VLS_34 = SourceCreateForm;
        // @ts-ignore
        const __VLS_35 = __VLS_asFunctionalComponent1(__VLS_34, new __VLS_34({
            ...{ 'onCreated': {} },
            ...{ 'onCancel': {} },
            entryPoint: "space_management",
            targetSpaceId: (__VLS_ctx.selectedSpaceId),
            targetChannelId: (__VLS_ctx.selectedChannelId),
        }));
        const __VLS_36 = __VLS_35({
            ...{ 'onCreated': {} },
            ...{ 'onCancel': {} },
            entryPoint: "space_management",
            targetSpaceId: (__VLS_ctx.selectedSpaceId),
            targetChannelId: (__VLS_ctx.selectedChannelId),
        }, ...__VLS_functionalComponentArgsRest(__VLS_35));
        let __VLS_39;
        const __VLS_40 = ({ created: {} },
            { onCreated: (__VLS_ctx.onSourceCreated) });
        const __VLS_41 = ({ cancel: {} },
            { onCancel: (...[$event]) => {
                    if (!!(!__VLS_ctx.selectedSpaceId))
                        return;
                    if (!!(!__VLS_ctx.showAddSource))
                        return;
                    __VLS_ctx.showAddSource = false;
                    // @ts-ignore
                    [selectedSpaceId, selectedChannelId, showAddSource, onSourceCreated,];
                } });
        var __VLS_37;
        var __VLS_38;
    }
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
