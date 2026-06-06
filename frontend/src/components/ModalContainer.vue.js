/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { useModal } from "@/composables/useModal";
import { onMounted, onBeforeUnmount } from "vue";
const { state, close } = useModal();
function onKeydown(e) {
    if (!state.visible)
        return;
    if (e.key === "Enter") {
        e.preventDefault();
        close(true);
    }
    if (e.key === "Escape") {
        e.preventDefault();
        close(false);
    }
}
onMounted(() => document.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => document.removeEventListener("keydown", onKeydown));
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['modal-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-actions']} */ ;
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
let __VLS_6;
/** @ts-ignore @type { | typeof __VLS_components.transition | typeof __VLS_components.Transition | typeof __VLS_components.transition | typeof __VLS_components.Transition} */
transition;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
    name: "fade",
}));
const __VLS_8 = __VLS_7({
    name: "fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_7));
const { default: __VLS_11 } = __VLS_9.slots;
if (__VLS_ctx.state.visible) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.state.visible))
                    return;
                __VLS_ctx.close(false);
                // @ts-ignore
                [state, close,];
            } },
        ...{ class: "modal-overlay" },
    });
    /** @type {__VLS_StyleScopedClasses['modal-overlay']} */ ;
    let __VLS_12;
    /** @ts-ignore @type { | typeof __VLS_components.transition | typeof __VLS_components.Transition | typeof __VLS_components.transition | typeof __VLS_components.Transition} */
    transition;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent1(__VLS_12, new __VLS_12({
        name: "modal",
    }));
    const __VLS_14 = __VLS_13({
        name: "modal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    const { default: __VLS_17 } = __VLS_15.slots;
    if (__VLS_ctx.state.visible) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "modal-box" },
        });
        /** @type {__VLS_StyleScopedClasses['modal-box']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
            ...{ class: "modal-title" },
        });
        /** @type {__VLS_StyleScopedClasses['modal-title']} */ ;
        (__VLS_ctx.state.title);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "modal-body" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vHtml, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.state.body) }, null, null);
        /** @type {__VLS_StyleScopedClasses['modal-body']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "modal-actions" },
        });
        /** @type {__VLS_StyleScopedClasses['modal-actions']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.state.visible))
                        return;
                    if (!(__VLS_ctx.state.visible))
                        return;
                    __VLS_ctx.close(false);
                    // @ts-ignore
                    [state, state, state, close,];
                } },
            ...{ class: "btn" },
        });
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.state.visible))
                        return;
                    if (!(__VLS_ctx.state.visible))
                        return;
                    __VLS_ctx.close(true);
                    // @ts-ignore
                    [close,];
                } },
            ...{ class: "btn" },
            ...{ class: (__VLS_ctx.state.danger ? 'danger' : 'primary') },
            disabled: (__VLS_ctx.state.loading),
        });
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        (__VLS_ctx.state.loading ? '处理中…' : __VLS_ctx.state.confirmText);
    }
    // @ts-ignore
    [state, state, state, state,];
    var __VLS_15;
}
// @ts-ignore
[];
var __VLS_9;
// @ts-ignore
[];
var __VLS_3;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
