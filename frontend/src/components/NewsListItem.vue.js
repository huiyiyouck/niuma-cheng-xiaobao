/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref } from "vue";
import ScoreBadge from "@/components/ScoreBadge.vue";
const props = defineProps();
const expanded = ref(true);
function toggle() { expanded.value = !expanded.value; }
function fmtTime(iso) {
    if (!iso)
        return "";
    const d = new Date(iso);
    const now = Date.now();
    const diff = now - d.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1)
        return `${Math.floor(diff / 60000)} 分钟前`;
    if (hours < 24)
        return `${hours} 小时前`;
    return `${Math.floor(hours / 24)} 天前`;
}
// v0.5: 来源已移除时不可点击
const isSourceRemoved = props.item.source_availability_status === "source_removed";
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['ni-row']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.isSourceRemoved ? null : __VLS_ctx.toggle();
            // @ts-ignore
            [isSourceRemoved, toggle,];
        } },
    ...{ class: "ni" },
    ...{ class: ({ expanded: __VLS_ctx.expanded, 'ni--removed': __VLS_ctx.isSourceRemoved }) },
});
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['expanded']} */ ;
/** @type {__VLS_StyleScopedClasses['ni--removed']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "ni-row" },
});
/** @type {__VLS_StyleScopedClasses['ni-row']} */ ;
const __VLS_0 = ScoreBadge;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    score: (__VLS_ctx.item.importance_score ?? null),
}));
const __VLS_2 = __VLS_1({
    score: (__VLS_ctx.item.importance_score ?? null),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "ni-body" },
});
/** @type {__VLS_StyleScopedClasses['ni-body']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "ni-title" },
});
/** @type {__VLS_StyleScopedClasses['ni-title']} */ ;
(__VLS_ctx.item.title);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "ni-meta" },
});
/** @type {__VLS_StyleScopedClasses['ni-meta']} */ ;
if (__VLS_ctx.item.channel_name) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.item.channel_name);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
(__VLS_ctx.fmtTime(__VLS_ctx.item.published_at));
if (__VLS_ctx.isSourceRemoved) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "source-removed-label" },
    });
    /** @type {__VLS_StyleScopedClasses['source-removed-label']} */ ;
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "source-label" },
    });
    /** @type {__VLS_StyleScopedClasses['source-label']} */ ;
    (__VLS_ctx.item.source_display_name);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "ni-arrow" },
});
/** @type {__VLS_StyleScopedClasses['ni-arrow']} */ ;
(__VLS_ctx.expanded ? '▾' : '▸');
if (__VLS_ctx.expanded) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: () => { } },
        ...{ class: "ni-detail" },
    });
    /** @type {__VLS_StyleScopedClasses['ni-detail']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "ni-summary" },
    });
    /** @type {__VLS_StyleScopedClasses['ni-summary']} */ ;
    (__VLS_ctx.item.summary);
    if (__VLS_ctx.item.tags && __VLS_ctx.item.tags.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "ni-tags" },
        });
        /** @type {__VLS_StyleScopedClasses['ni-tags']} */ ;
        for (const [t] of __VLS_vFor((__VLS_ctx.item.tags))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "tag" },
                key: (t),
            });
            /** @type {__VLS_StyleScopedClasses['tag']} */ ;
            (t);
            // @ts-ignore
            [isSourceRemoved, isSourceRemoved, expanded, expanded, expanded, item, item, item, item, item, item, item, item, item, item, fmtTime,];
        }
    }
    if (__VLS_ctx.item.bullets && __VLS_ctx.item.bullets.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "ni-bullets" },
        });
        /** @type {__VLS_StyleScopedClasses['ni-bullets']} */ ;
        for (const [b, i] of __VLS_vFor((__VLS_ctx.item.bullets))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (i),
            });
            (b);
            // @ts-ignore
            [item, item, item,];
        }
    }
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
});
export default {};
