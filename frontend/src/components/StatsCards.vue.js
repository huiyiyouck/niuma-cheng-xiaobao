/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
const __VLS_props = defineProps();
const cards = [
    { key: "total_news", label: "总新闻数", color: "#1a1a2e" },
    { key: "today_new", label: "今日新增", color: "#2ecc71" },
    { key: "active_sources", label: "活跃 Source", color: "#3498db" },
    { key: "channel_count", label: "频道数", color: "#9b59b6" },
];
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "stats-grid" },
});
/** @type {__VLS_StyleScopedClasses['stats-grid']} */ ;
for (const [c] of __VLS_vFor((__VLS_ctx.cards))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: (c.key),
        ...{ class: "stat-card" },
    });
    /** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "stat-label" },
    });
    /** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
    (c.label);
    if (__VLS_ctx.stats[c.key] >= 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "stat-value" },
            ...{ style: ({ color: c.color }) },
        });
        /** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
        (__VLS_ctx.stats[c.key]);
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "stat-value muted" },
        });
        /** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
        /** @type {__VLS_StyleScopedClasses['muted']} */ ;
    }
    // @ts-ignore
    [cards, stats, stats,];
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
});
export default {};
