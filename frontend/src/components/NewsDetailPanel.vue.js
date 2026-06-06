/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import TagChip from "@/components/TagChip.vue";
import EntityBadge from "@/components/EntityBadge.vue";
import ScoreBadge from "@/components/ScoreBadge.vue";
const __VLS_props = defineProps();
const emit = defineEmits();
function fmtTime(iso) {
    if (!iso)
        return "";
    return new Date(iso).toLocaleString();
}
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
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    name: "panel",
}));
const __VLS_2 = __VLS_1({
    name: "panel",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const { default: __VLS_5 } = __VLS_3.slots;
if (__VLS_ctx.item) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.item))
                    return;
                __VLS_ctx.emit('close');
                // @ts-ignore
                [item, emit,];
            } },
        ...{ class: "panel-backdrop" },
    });
    /** @type {__VLS_StyleScopedClasses['panel-backdrop']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "panel" },
    });
    /** @type {__VLS_StyleScopedClasses['panel']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.item))
                    return;
                __VLS_ctx.emit('close');
                // @ts-ignore
                [emit,];
            } },
        ...{ class: "panel-close" },
    });
    /** @type {__VLS_StyleScopedClasses['panel-close']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "panel-body" },
    });
    /** @type {__VLS_StyleScopedClasses['panel-body']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "panel-score" },
    });
    /** @type {__VLS_StyleScopedClasses['panel-score']} */ ;
    const __VLS_6 = ScoreBadge;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
        score: (__VLS_ctx.item.importance_score ?? null),
    }));
    const __VLS_8 = __VLS_7({
        score: (__VLS_ctx.item.importance_score ?? null),
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
        ...{ class: "panel-title" },
    });
    /** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
    (__VLS_ctx.item.title);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "panel-meta" },
    });
    /** @type {__VLS_StyleScopedClasses['panel-meta']} */ ;
    if (__VLS_ctx.item.published_at) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (__VLS_ctx.fmtTime(__VLS_ctx.item.published_at));
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.item.language);
    if (__VLS_ctx.item.source_availability_status === 'source_removed') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "source-removed" },
        });
        /** @type {__VLS_StyleScopedClasses['source-removed']} */ ;
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "source-name" },
        });
        /** @type {__VLS_StyleScopedClasses['source-name']} */ ;
        (__VLS_ctx.item.source_display_name);
    }
    if (__VLS_ctx.item.channel_name) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "channel-info" },
        });
        /** @type {__VLS_StyleScopedClasses['channel-info']} */ ;
        (__VLS_ctx.item.channel_name);
    }
    if (__VLS_ctx.item.summary) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "panel-summary" },
        });
        /** @type {__VLS_StyleScopedClasses['panel-summary']} */ ;
        (__VLS_ctx.item.summary);
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "panel-summary muted" },
        });
        /** @type {__VLS_StyleScopedClasses['panel-summary']} */ ;
        /** @type {__VLS_StyleScopedClasses['muted']} */ ;
    }
    if (__VLS_ctx.item.bullets && __VLS_ctx.item.bullets.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "panel-section" },
        });
        /** @type {__VLS_StyleScopedClasses['panel-section']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "panel-section-title" },
        });
        /** @type {__VLS_StyleScopedClasses['panel-section-title']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.ul, __VLS_intrinsics.ul)({
            ...{ class: "panel-bullets" },
        });
        /** @type {__VLS_StyleScopedClasses['panel-bullets']} */ ;
        for (const [b, i] of __VLS_vFor((__VLS_ctx.item.bullets))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({
                key: (i),
            });
            (b);
            // @ts-ignore
            [item, item, item, item, item, item, item, item, item, item, item, item, item, item, fmtTime,];
        }
    }
    if (__VLS_ctx.item.tags && __VLS_ctx.item.tags.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "panel-section" },
        });
        /** @type {__VLS_StyleScopedClasses['panel-section']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "panel-section-title" },
        });
        /** @type {__VLS_StyleScopedClasses['panel-section-title']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "panel-tags" },
        });
        /** @type {__VLS_StyleScopedClasses['panel-tags']} */ ;
        for (const [t] of __VLS_vFor((__VLS_ctx.item.tags))) {
            const __VLS_11 = TagChip;
            // @ts-ignore
            const __VLS_12 = __VLS_asFunctionalComponent1(__VLS_11, new __VLS_11({
                key: (t),
                tag: (t),
            }));
            const __VLS_13 = __VLS_12({
                key: (t),
                tag: (t),
            }, ...__VLS_functionalComponentArgsRest(__VLS_12));
            // @ts-ignore
            [item, item, item,];
        }
    }
    if (__VLS_ctx.item.entities && __VLS_ctx.item.entities.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "panel-section" },
        });
        /** @type {__VLS_StyleScopedClasses['panel-section']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "panel-section-title" },
        });
        /** @type {__VLS_StyleScopedClasses['panel-section-title']} */ ;
        const __VLS_16 = EntityBadge;
        // @ts-ignore
        const __VLS_17 = __VLS_asFunctionalComponent1(__VLS_16, new __VLS_16({
            entities: (__VLS_ctx.item.entities),
        }));
        const __VLS_18 = __VLS_17({
            entities: (__VLS_ctx.item.entities),
        }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    }
}
// @ts-ignore
[item, item, item,];
var __VLS_3;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
