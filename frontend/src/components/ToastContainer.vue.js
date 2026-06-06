/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { useToast } from "@/composables/useToast";
const { toasts, remove } = useToast();
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
if (__VLS_ctx.toasts.length > 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "toast-container" },
    });
    /** @type {__VLS_StyleScopedClasses['toast-container']} */ ;
    let __VLS_0;
    /** @ts-ignore @type { | typeof __VLS_components.transitionGroup | typeof __VLS_components.TransitionGroup | typeof __VLS_components['transition-group'] | typeof __VLS_components.transitionGroup | typeof __VLS_components.TransitionGroup | typeof __VLS_components['transition-group']} */
    transitionGroup;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        name: "toast",
    }));
    const __VLS_2 = __VLS_1({
        name: "toast",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    const { default: __VLS_5 } = __VLS_3.slots;
    for (const [t] of __VLS_vFor((__VLS_ctx.toasts))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.toasts.length > 0))
                        return;
                    __VLS_ctx.remove(t.id);
                    // @ts-ignore
                    [toasts, toasts, remove,];
                } },
            key: (t.id),
            ...{ class: "toast-item" },
            ...{ class: (`toast--${t.type}`) },
        });
        /** @type {__VLS_StyleScopedClasses['toast-item']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "toast-icon" },
        });
        /** @type {__VLS_StyleScopedClasses['toast-icon']} */ ;
        (t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️');
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "toast-msg" },
        });
        /** @type {__VLS_StyleScopedClasses['toast-msg']} */ ;
        (t.message);
        // @ts-ignore
        [];
    }
    // @ts-ignore
    [];
    var __VLS_3;
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
