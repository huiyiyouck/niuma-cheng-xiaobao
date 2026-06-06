/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed } from "vue";
const props = defineProps();
const tier = computed(() => {
    if (props.score == null)
        return "none";
    if (props.score >= 9)
        return "top";
    if (props.score >= 7)
        return "high";
    if (props.score >= 5)
        return "mid";
    return "low";
});
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "score-badge" },
    ...{ class: (`score-badge--${__VLS_ctx.tier}`) },
});
/** @type {__VLS_StyleScopedClasses['score-badge']} */ ;
(__VLS_ctx.score != null ? __VLS_ctx.score.toFixed(1) : '--');
// @ts-ignore
[tier, score, score,];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
});
export default {};
