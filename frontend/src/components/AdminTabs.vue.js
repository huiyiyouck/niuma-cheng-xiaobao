/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
const __VLS_props = defineProps();
const emit = defineEmits();
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
/** @type {__VLS_StyleScopedClasses['admin-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-tab']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "admin-tabs" },
});
/** @type {__VLS_StyleScopedClasses['admin-tabs']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.emit('update:activeTab', 'space_management');
            // @ts-ignore
            [emit,];
        } },
    ...{ class: "admin-tab" },
    ...{ class: ({ active: __VLS_ctx.activeTab === 'space_management' }) },
});
/** @type {__VLS_StyleScopedClasses['admin-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.emit('update:activeTab', 'source_library');
            // @ts-ignore
            [emit, activeTab,];
        } },
    ...{ class: "admin-tab" },
    ...{ class: ({ active: __VLS_ctx.activeTab === 'source_library' }) },
});
/** @type {__VLS_StyleScopedClasses['admin-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
// @ts-ignore
[activeTab,];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
