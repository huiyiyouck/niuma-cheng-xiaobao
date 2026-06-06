/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
const props = defineProps();
const emit = defineEmits();
const searchInput = ref("");
const debouncedSearch = useDebounceFn((q) => emit("search", q), 300);
watch(searchInput, (v) => debouncedSearch(v));
const filters = ref({
    type: "",
    availability_status: "",
    operational_status: "",
    domain_tag: "",
    source_role: "",
    attention_level: "",
    space_id: "",
});
function setFilter(key, value) {
    filters.value[key] = value;
    emit("filter", { ...filters.value });
}
const TYPE_OPTIONS = [
    { value: "", label: "全部类型" },
    { value: "x_twitter", label: "X/Twitter" },
    { value: "rss", label: "RSS" },
];
const AVAILABILITY_OPTIONS = [
    { value: "", label: "全部可用性" },
    { value: "normal", label: "正常" },
    { value: "awaiting_repair", label: "待修复" },
    { value: "source_error", label: "来源异常" },
    { value: "source_removed", label: "来源已移除" },
];
const OPERATIONAL_OPTIONS = [
    { value: "", label: "全部运行" },
    { value: "fetching", label: "抓取中" },
    { value: "stopped", label: "已停止" },
    { value: "unused", label: "未使用" },
];
const DOMAIN_OPTIONS = [
    { value: "", label: "全部领域" },
    { value: "AI", label: "AI" },
    { value: "财经", label: "财经" },
    { value: "开源", label: "开源" },
    { value: "科技", label: "科技" },
    { value: "其他", label: "其他" },
];
const ROLE_OPTIONS = [
    { value: "", label: "全部角色" },
    { value: "official", label: "官方" },
    { value: "media", label: "媒体" },
    { value: "kol", label: "KOL" },
    { value: "community", label: "社区" },
    { value: "paper_institute", label: "论文机构" },
    { value: "other", label: "其他" },
];
const ATTENTION_OPTIONS = [
    { value: "", label: "全部关注" },
    { value: "core", label: "核心" },
    { value: "regular", label: "常规" },
    { value: "observe", label: "观察" },
];
const activeFilterCount = computed(() => {
    let count = 0;
    for (const v of Object.values(filters.value)) {
        if (v)
            count++;
    }
    return count;
});
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
/** @type {__VLS_StyleScopedClasses['search-input']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-select']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "search-filter-bar" },
});
/** @type {__VLS_StyleScopedClasses['search-filter-bar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "search-row" },
});
/** @type {__VLS_StyleScopedClasses['search-row']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    ...{ onKeydown: (...[$event]) => {
            __VLS_ctx.emit('search', __VLS_ctx.searchInput);
            // @ts-ignore
            [emit, searchInput,];
        } },
    ...{ class: "input search-input" },
    placeholder: "搜索名称、来源身份、内容主题、备注…",
});
(__VLS_ctx.searchInput);
/** @type {__VLS_StyleScopedClasses['input']} */ ;
/** @type {__VLS_StyleScopedClasses['search-input']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "filter-hint muted" },
});
/** @type {__VLS_StyleScopedClasses['filter-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
(__VLS_ctx.activeFilterCount > 0 ? `筛选条件：${__VLS_ctx.activeFilterCount} 个 (AND 逻辑)` : '');
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "filter-rows" },
});
/** @type {__VLS_StyleScopedClasses['filter-rows']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "filter-row" },
});
/** @type {__VLS_StyleScopedClasses['filter-row']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
    ...{ onChange: (...[$event]) => {
            __VLS_ctx.setFilter('type', $event.target.value);
            // @ts-ignore
            [searchInput, activeFilterCount, activeFilterCount, setFilter,];
        } },
    ...{ class: "select filter-select" },
    value: (__VLS_ctx.filters.type),
});
/** @type {__VLS_StyleScopedClasses['select']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-select']} */ ;
for (const [o] of __VLS_vFor((__VLS_ctx.TYPE_OPTIONS))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        key: (o.value),
        value: (o.value),
    });
    (o.label);
    // @ts-ignore
    [filters, TYPE_OPTIONS,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
    ...{ onChange: (...[$event]) => {
            __VLS_ctx.setFilter('availability_status', $event.target.value);
            // @ts-ignore
            [setFilter,];
        } },
    ...{ class: "select filter-select" },
    value: (__VLS_ctx.filters.availability_status),
});
/** @type {__VLS_StyleScopedClasses['select']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-select']} */ ;
for (const [o] of __VLS_vFor((__VLS_ctx.AVAILABILITY_OPTIONS))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        key: (o.value),
        value: (o.value),
    });
    (o.label);
    // @ts-ignore
    [filters, AVAILABILITY_OPTIONS,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
    ...{ onChange: (...[$event]) => {
            __VLS_ctx.setFilter('operational_status', $event.target.value);
            // @ts-ignore
            [setFilter,];
        } },
    ...{ class: "select filter-select" },
    value: (__VLS_ctx.filters.operational_status),
});
/** @type {__VLS_StyleScopedClasses['select']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-select']} */ ;
for (const [o] of __VLS_vFor((__VLS_ctx.OPERATIONAL_OPTIONS))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        key: (o.value),
        value: (o.value),
    });
    (o.label);
    // @ts-ignore
    [filters, OPERATIONAL_OPTIONS,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "filter-row" },
});
/** @type {__VLS_StyleScopedClasses['filter-row']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
    ...{ onChange: (...[$event]) => {
            __VLS_ctx.setFilter('domain_tag', $event.target.value);
            // @ts-ignore
            [setFilter,];
        } },
    ...{ class: "select filter-select" },
    value: (__VLS_ctx.filters.domain_tag),
});
/** @type {__VLS_StyleScopedClasses['select']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-select']} */ ;
for (const [o] of __VLS_vFor((__VLS_ctx.DOMAIN_OPTIONS))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        key: (o.value),
        value: (o.value),
    });
    (o.label);
    // @ts-ignore
    [filters, DOMAIN_OPTIONS,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
    ...{ onChange: (...[$event]) => {
            __VLS_ctx.setFilter('source_role', $event.target.value);
            // @ts-ignore
            [setFilter,];
        } },
    ...{ class: "select filter-select" },
    value: (__VLS_ctx.filters.source_role),
});
/** @type {__VLS_StyleScopedClasses['select']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-select']} */ ;
for (const [o] of __VLS_vFor((__VLS_ctx.ROLE_OPTIONS))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        key: (o.value),
        value: (o.value),
    });
    (o.label);
    // @ts-ignore
    [filters, ROLE_OPTIONS,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
    ...{ onChange: (...[$event]) => {
            __VLS_ctx.setFilter('attention_level', $event.target.value);
            // @ts-ignore
            [setFilter,];
        } },
    ...{ class: "select filter-select" },
    value: (__VLS_ctx.filters.attention_level),
});
/** @type {__VLS_StyleScopedClasses['select']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-select']} */ ;
for (const [o] of __VLS_vFor((__VLS_ctx.ATTENTION_OPTIONS))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        key: (o.value),
        value: (o.value),
    });
    (o.label);
    // @ts-ignore
    [filters, ATTENTION_OPTIONS,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
    ...{ onChange: (...[$event]) => {
            __VLS_ctx.setFilter('space_id', $event.target.value);
            // @ts-ignore
            [setFilter,];
        } },
    ...{ class: "select filter-select" },
    value: (__VLS_ctx.filters.space_id),
});
/** @type {__VLS_StyleScopedClasses['select']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-select']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "",
});
for (const [s] of __VLS_vFor((__VLS_ctx.spaces))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        key: (s.id),
        value: (s.id),
    });
    (s.name);
    // @ts-ignore
    [filters, spaces,];
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
