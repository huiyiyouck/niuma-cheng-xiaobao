/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed } from "vue";
const props = withDefaults(defineProps(), {
    pageSizeOptions: () => [10, 20, 50],
});
const emit = defineEmits();
const totalPages = computed(() => Math.max(1, Math.ceil(props.totalItems / props.pageSize)));
const visiblePages = computed(() => {
    const pages = [];
    const tp = totalPages.value;
    const cp = props.currentPage;
    if (tp <= 7) {
        for (let i = 1; i <= tp; i++)
            pages.push(i);
        return pages;
    }
    pages.push(1);
    if (cp > 3)
        pages.push("...");
    const start = Math.max(2, cp - 1);
    const end = Math.min(tp - 1, cp + 1);
    for (let i = start; i <= end; i++)
        pages.push(i);
    if (cp < tp - 2)
        pages.push("...");
    pages.push(tp);
    return pages;
});
function goTo(page) {
    if (page >= 1 && page <= totalPages.value) {
        emit("update:currentPage", page);
    }
}
function changePageSize(e) {
    const val = parseInt(e.target.value);
    emit("update:pageSize", val);
}
const __VLS_defaults = {
    pageSizeOptions: () => [10, 20, 50],
};
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
/** @type {__VLS_StyleScopedClasses['pg-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['pg-btn']} */ ;
if (__VLS_ctx.totalItems > 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pagination" },
    });
    /** @type {__VLS_StyleScopedClasses['pagination']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pg-info" },
    });
    /** @type {__VLS_StyleScopedClasses['pg-info']} */ ;
    (__VLS_ctx.totalItems);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pg-controls" },
    });
    /** @type {__VLS_StyleScopedClasses['pg-controls']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.totalItems > 0))
                    return;
                __VLS_ctx.goTo(__VLS_ctx.currentPage - 1);
                // @ts-ignore
                [totalItems, totalItems, goTo, currentPage,];
            } },
        ...{ class: "pg-btn" },
        disabled: (__VLS_ctx.currentPage <= 1),
    });
    /** @type {__VLS_StyleScopedClasses['pg-btn']} */ ;
    for (const [p] of __VLS_vFor((__VLS_ctx.visiblePages))) {
        __VLS_asFunctionalElement(__VLS_intrinsics.template)({
            key: (p),
        });
        if (p === '...') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "pg-ellipsis" },
            });
            /** @type {__VLS_StyleScopedClasses['pg-ellipsis']} */ ;
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.totalItems > 0))
                            return;
                        if (!!(p === '...'))
                            return;
                        __VLS_ctx.goTo(p);
                        // @ts-ignore
                        [goTo, currentPage, visiblePages,];
                    } },
                ...{ class: "pg-btn pg-num" },
                ...{ class: ({ active: p === __VLS_ctx.currentPage }) },
            });
            /** @type {__VLS_StyleScopedClasses['pg-btn']} */ ;
            /** @type {__VLS_StyleScopedClasses['pg-num']} */ ;
            /** @type {__VLS_StyleScopedClasses['active']} */ ;
            (p);
        }
        // @ts-ignore
        [currentPage,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.totalItems > 0))
                    return;
                __VLS_ctx.goTo(__VLS_ctx.currentPage + 1);
                // @ts-ignore
                [goTo, currentPage,];
            } },
        ...{ class: "pg-btn" },
        disabled: (__VLS_ctx.currentPage >= __VLS_ctx.totalPages),
    });
    /** @type {__VLS_StyleScopedClasses['pg-btn']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pg-size" },
    });
    /** @type {__VLS_StyleScopedClasses['pg-size']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
        ...{ onChange: (__VLS_ctx.changePageSize) },
        ...{ class: "pg-select" },
        value: (__VLS_ctx.pageSize),
    });
    /** @type {__VLS_StyleScopedClasses['pg-select']} */ ;
    for (const [s] of __VLS_vFor((__VLS_ctx.pageSizeOptions))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            key: (s),
            value: (s),
        });
        (s);
        // @ts-ignore
        [currentPage, totalPages, changePageSize, pageSize, pageSizeOptions,];
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
