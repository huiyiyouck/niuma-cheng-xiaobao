/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { onMounted, ref, watch } from "vue";
import { queryLogs } from "@/lib/api";
import { useToast } from "@/composables/useToast";
const toast = useToast();
const entries = ref([]);
const total = ref(0);
const loading = ref(false);
const errorText = ref(null);
const LEVEL_OPTIONS = ["ERROR", "WARNING", "INFO", "DEBUG"];
const SOURCE_OPTIONS = ["api", "worker"];
const selectedLevel = ref("");
const selectedSource = ref("");
const keyword = ref("");
const limit = 100;
async function load() {
    loading.value = true;
    errorText.value = null;
    try {
        const res = await queryLogs({
            level: selectedLevel.value || undefined,
            source: selectedSource.value || undefined,
            keyword: keyword.value || undefined,
            limit,
            offset: 0,
        });
        entries.value = res.entries;
        total.value = res.total;
    }
    catch (e) {
        errorText.value = e instanceof Error ? e.message : String(e);
    }
    finally {
        loading.value = false;
    }
}
async function copyDetail(entry) {
    try {
        await navigator.clipboard.writeText(JSON.stringify(entry, null, 2));
        toast.success("已复制到剪贴板");
    }
    catch {
        toast.error("复制失败");
    }
}
function levelBadgeClass(lv) {
    return `lv-badge lv-badge--${lv.toLowerCase()}`;
}
function levelLabel(lv) {
    const map = { ERROR: "🔴", WARNING: "🟡", INFO: "🔵", DEBUG: "" };
    return map[lv] || lv;
}
watch([selectedLevel, selectedSource, keyword], () => load());
onMounted(() => load());
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['log-row']} */ ;
/** @type {__VLS_StyleScopedClasses['log-row']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "logs-page" },
});
/** @type {__VLS_StyleScopedClasses['logs-page']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "page-header" },
});
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "page-title" },
});
/** @type {__VLS_StyleScopedClasses['page-title']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "page-sub" },
});
/** @type {__VLS_StyleScopedClasses['page-sub']} */ ;
if (__VLS_ctx.errorText) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "error-bar" },
    });
    /** @type {__VLS_StyleScopedClasses['error-bar']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.errorText);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "toolbar" },
});
/** @type {__VLS_StyleScopedClasses['toolbar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
    value: (__VLS_ctx.selectedLevel),
    ...{ class: "select" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['select']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "",
});
for (const [lv] of __VLS_vFor((__VLS_ctx.LEVEL_OPTIONS))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        key: (lv),
        value: (lv),
    });
    (__VLS_ctx.levelLabel(lv));
    (lv);
    // @ts-ignore
    [errorText, errorText, selectedLevel, LEVEL_OPTIONS, levelLabel,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
    value: (__VLS_ctx.selectedSource),
    ...{ class: "select" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['select']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "",
});
for (const [s] of __VLS_vFor((__VLS_ctx.SOURCE_OPTIONS))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        key: (s),
        value: (s),
    });
    (s);
    // @ts-ignore
    [selectedSource, SOURCE_OPTIONS,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    ...{ onKeydown: (...[$event]) => {
            __VLS_ctx.load();
            // @ts-ignore
            [load,];
        } },
    ...{ class: "input" },
    placeholder: "搜索关键字…",
    ...{ style: {} },
});
(__VLS_ctx.keyword);
/** @type {__VLS_StyleScopedClasses['input']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "summary muted" },
});
/** @type {__VLS_StyleScopedClasses['summary']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
(__VLS_ctx.total);
if (__VLS_ctx.loading && __VLS_ctx.entries.length === 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "muted" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['muted']} */ ;
}
else if (__VLS_ctx.entries.length === 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "empty-state" },
    });
    /** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.br)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "log-table" },
    });
    /** @type {__VLS_StyleScopedClasses['log-table']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "log-header" },
    });
    /** @type {__VLS_StyleScopedClasses['log-header']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "col-time" },
    });
    /** @type {__VLS_StyleScopedClasses['col-time']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "col-level" },
    });
    /** @type {__VLS_StyleScopedClasses['col-level']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "col-source" },
    });
    /** @type {__VLS_StyleScopedClasses['col-source']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "col-msg" },
    });
    /** @type {__VLS_StyleScopedClasses['col-msg']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "col-action" },
    });
    /** @type {__VLS_StyleScopedClasses['col-action']} */ ;
    for (const [e] of __VLS_vFor((__VLS_ctx.entries))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: ((e.timestamp || '') + (e.message || '')),
            ...{ class: "log-row" },
            ...{ class: ({ 'row--error': e.level === 'ERROR', 'row--warn': e.level === 'WARNING' }) },
        });
        /** @type {__VLS_StyleScopedClasses['log-row']} */ ;
        /** @type {__VLS_StyleScopedClasses['row--error']} */ ;
        /** @type {__VLS_StyleScopedClasses['row--warn']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "col-time" },
        });
        /** @type {__VLS_StyleScopedClasses['col-time']} */ ;
        (new Date(e.timestamp).toLocaleString());
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "col-level" },
        });
        /** @type {__VLS_StyleScopedClasses['col-level']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: (__VLS_ctx.levelBadgeClass(e.level)) },
        });
        (e.level);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "col-source" },
        });
        /** @type {__VLS_StyleScopedClasses['col-source']} */ ;
        (e.logger);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "col-msg" },
            title: (e.message),
        });
        /** @type {__VLS_StyleScopedClasses['col-msg']} */ ;
        (e.message);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "col-action" },
        });
        /** @type {__VLS_StyleScopedClasses['col-action']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading && __VLS_ctx.entries.length === 0))
                        return;
                    if (!!(__VLS_ctx.entries.length === 0))
                        return;
                    __VLS_ctx.copyDetail(e);
                    // @ts-ignore
                    [keyword, total, loading, entries, entries, entries, levelBadgeClass, copyDetail,];
                } },
            ...{ class: "btn-sm" },
        });
        /** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
        // @ts-ignore
        [];
    }
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
