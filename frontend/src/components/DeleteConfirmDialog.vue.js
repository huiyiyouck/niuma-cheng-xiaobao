/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref } from "vue";
const props = defineProps();
const emit = defineEmits();
const inputValue = ref("");
const submitting = ref(false);
const canConfirm = ref(false);
// 输入匹配检测
function checkMatch() {
    canConfirm.value = inputValue.value.trim() === props.confirmName.trim();
}
function onSubmit() {
    if (!canConfirm.value)
        return;
    submitting.value = true;
    emit("confirm");
}
// 暴露 reset 方法供父组件调用
const __VLS_exposed = { reset: () => { submitting.value = false; inputValue.value = ""; canConfirm.value = false; } };
defineExpose(__VLS_exposed);
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
/** @type {__VLS_StyleScopedClasses['impact-row']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.Teleport | typeof __VLS_components.Teleport} */
Teleport;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    to: "body",
}));
const __VLS_2 = __VLS_1({
    to: "body",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const { default: __VLS_5 } = __VLS_3.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.emit('cancel');
            // @ts-ignore
            [emit,];
        } },
    ...{ class: "delete-overlay" },
});
/** @type {__VLS_StyleScopedClasses['delete-overlay']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "delete-box" },
});
/** @type {__VLS_StyleScopedClasses['delete-box']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
    ...{ class: "delete-title" },
});
/** @type {__VLS_StyleScopedClasses['delete-title']} */ ;
(__VLS_ctx.title);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "delete-impact" },
});
/** @type {__VLS_StyleScopedClasses['delete-impact']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "impact-row" },
});
/** @type {__VLS_StyleScopedClasses['impact-row']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "impact-icon" },
});
/** @type {__VLS_StyleScopedClasses['impact-icon']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.impact.affectedPositions);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "impact-row" },
});
/** @type {__VLS_StyleScopedClasses['impact-row']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "impact-icon" },
});
/** @type {__VLS_StyleScopedClasses['impact-icon']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.impact.preservedNews);
if (__VLS_ctx.impact.additionalInfo) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "impact-row impact-note" },
    });
    /** @type {__VLS_StyleScopedClasses['impact-row']} */ ;
    /** @type {__VLS_StyleScopedClasses['impact-note']} */ ;
    (__VLS_ctx.impact.additionalInfo);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "delete-prompt" },
});
/** @type {__VLS_StyleScopedClasses['delete-prompt']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.confirmName);
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    ...{ onInput: (__VLS_ctx.checkMatch) },
    ...{ onKeydown: (__VLS_ctx.onSubmit) },
    ...{ class: "input delete-input" },
    placeholder: (`输入 ${__VLS_ctx.confirmName}`),
});
(__VLS_ctx.inputValue);
/** @type {__VLS_StyleScopedClasses['input']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-input']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "delete-actions" },
});
/** @type {__VLS_StyleScopedClasses['delete-actions']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.emit('cancel');
            // @ts-ignore
            [emit, title, impact, impact, impact, impact, confirmName, confirmName, checkMatch, onSubmit, inputValue,];
        } },
    ...{ class: "btn" },
    disabled: (__VLS_ctx.submitting),
});
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.onSubmit) },
    ...{ class: "btn danger" },
    disabled: (!__VLS_ctx.canConfirm || __VLS_ctx.submitting),
});
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
(__VLS_ctx.submitting ? "删除中…" : "确认删除");
// @ts-ignore
[onSubmit, submitting, submitting, submitting, canConfirm,];
var __VLS_3;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    setup: () => __VLS_exposed,
    __typeEmits: {},
    __typeProps: {},
});
export default {};
