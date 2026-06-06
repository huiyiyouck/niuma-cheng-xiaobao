/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed } from "vue";
const props = defineProps();
const emit = defineEmits();
const PALETTE = [
    { bg: "#e8f4fd", text: "#3498db" }, // 蓝
    { bg: "#fef3e2", text: "#f39c12" }, // 橙
    { bg: "#e8f8e8", text: "#27ae60" }, // 绿
    { bg: "#f3e8ff", text: "#8e44ad" }, // 紫
];
const colors = computed(() => {
    const idx = (props.tag.charCodeAt(0) || 0) % PALETTE.length;
    return PALETTE[idx];
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
/** @type {__VLS_StyleScopedClasses['tag-chip']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.emit('click');
            // @ts-ignore
            [emit,];
        } },
    ...{ class: "tag-chip" },
    ...{ style: ({ background: __VLS_ctx.colors.bg, color: __VLS_ctx.colors.text }) },
});
/** @type {__VLS_StyleScopedClasses['tag-chip']} */ ;
(__VLS_ctx.tag);
// @ts-ignore
[colors, colors, tag,];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
