/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
const __VLS_props = defineProps();
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "empty-state" },
});
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "empty-icon" },
});
/** @type {__VLS_StyleScopedClasses['empty-icon']} */ ;
(__VLS_ctx.icon);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "empty-title" },
});
/** @type {__VLS_StyleScopedClasses['empty-title']} */ ;
(__VLS_ctx.title);
if (__VLS_ctx.description) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "empty-desc" },
    });
    /** @type {__VLS_StyleScopedClasses['empty-desc']} */ ;
    (__VLS_ctx.description);
}
if (__VLS_ctx.actionLabel && __VLS_ctx.actionTo) {
    let __VLS_0;
    /** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
    RouterLink;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        to: (__VLS_ctx.actionTo),
        ...{ class: "empty-action btn primary" },
    }));
    const __VLS_2 = __VLS_1({
        to: (__VLS_ctx.actionTo),
        ...{ class: "empty-action btn primary" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    /** @type {__VLS_StyleScopedClasses['empty-action']} */ ;
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['primary']} */ ;
    const { default: __VLS_5 } = __VLS_3.slots;
    (__VLS_ctx.actionLabel);
    // @ts-ignore
    [icon, title, description, description, actionLabel, actionLabel, actionTo, actionTo,];
    var __VLS_3;
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
});
export default {};
