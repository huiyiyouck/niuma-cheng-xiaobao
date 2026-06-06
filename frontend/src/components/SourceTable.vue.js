/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import SourceTableRow from "@/components/SourceTableRow.vue";
import EmptyState from "@/components/EmptyState.vue";
const __VLS_props = defineProps();
const emit = defineEmits();
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
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "source-table-wrapper table-scroll" },
});
/** @type {__VLS_StyleScopedClasses['source-table-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['table-scroll']} */ ;
if (__VLS_ctx.sources.length > 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.table, __VLS_intrinsics.table)({
        ...{ class: "source-table" },
    });
    /** @type {__VLS_StyleScopedClasses['source-table']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
        ...{ class: "table-header" },
    });
    /** @type {__VLS_StyleScopedClasses['table-header']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
        ...{ class: "col-name" },
    });
    /** @type {__VLS_StyleScopedClasses['col-name']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
        ...{ class: "col-type" },
    });
    /** @type {__VLS_StyleScopedClasses['col-type']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
        ...{ class: "col-tags" },
    });
    /** @type {__VLS_StyleScopedClasses['col-tags']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
        ...{ class: "col-status" },
    });
    /** @type {__VLS_StyleScopedClasses['col-status']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
        ...{ class: "col-positions" },
    });
    /** @type {__VLS_StyleScopedClasses['col-positions']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
        ...{ class: "col-fetch" },
    });
    /** @type {__VLS_StyleScopedClasses['col-fetch']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
        ...{ class: "col-news" },
    });
    /** @type {__VLS_StyleScopedClasses['col-news']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
        ...{ class: "col-actions" },
    });
    /** @type {__VLS_StyleScopedClasses['col-actions']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
    for (const [s] of __VLS_vFor((__VLS_ctx.sources))) {
        const __VLS_0 = SourceTableRow;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
            ...{ 'onView': {} },
            ...{ 'onEdit': {} },
            ...{ 'onDelete': {} },
            key: (s.id),
            source: (s),
        }));
        const __VLS_2 = __VLS_1({
            ...{ 'onView': {} },
            ...{ 'onEdit': {} },
            ...{ 'onDelete': {} },
            key: (s.id),
            source: (s),
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        let __VLS_5;
        const __VLS_6 = ({ view: {} },
            { onView: (...[$event]) => {
                    if (!(__VLS_ctx.sources.length > 0))
                        return;
                    __VLS_ctx.emit('view', $event);
                    // @ts-ignore
                    [sources, sources, emit,];
                } });
        const __VLS_7 = ({ edit: {} },
            { onEdit: (...[$event]) => {
                    if (!(__VLS_ctx.sources.length > 0))
                        return;
                    __VLS_ctx.emit('edit', $event);
                    // @ts-ignore
                    [emit,];
                } });
        const __VLS_8 = ({ delete: {} },
            { onDelete: (...[$event]) => {
                    if (!(__VLS_ctx.sources.length > 0))
                        return;
                    __VLS_ctx.emit('delete', $event);
                    // @ts-ignore
                    [emit,];
                } });
        var __VLS_3;
        var __VLS_4;
        // @ts-ignore
        [];
    }
}
else {
    const __VLS_9 = EmptyState;
    // @ts-ignore
    const __VLS_10 = __VLS_asFunctionalComponent1(__VLS_9, new __VLS_9({
        icon: "📡",
        title: "暂无匹配的信息源",
        description: "试试调整筛选条件或创建新的信息源",
    }));
    const __VLS_11 = __VLS_10({
        icon: "📡",
        title: "暂无匹配的信息源",
        description: "试试调整筛选条件或创建新的信息源",
    }, ...__VLS_functionalComponentArgsRest(__VLS_10));
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
