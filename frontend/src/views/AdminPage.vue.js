/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref } from "vue";
import AdminTabs from "@/components/AdminTabs.vue";
import SpaceManagementTab from "@/components/SpaceManagementTab.vue";
import SourceLibraryTab from "@/components/SourceLibraryTab.vue";
// v0.5: 管理页完全重写
// 双 Tab 容器：空间管理 | 信息源库
const activeTab = ref("space_management");
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "admin-page" },
});
/** @type {__VLS_StyleScopedClasses['admin-page']} */ ;
const __VLS_0 = AdminTabs;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    activeTab: (__VLS_ctx.activeTab),
}));
const __VLS_2 = __VLS_1({
    activeTab: (__VLS_ctx.activeTab),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
if (__VLS_ctx.activeTab === 'space_management') {
    const __VLS_5 = SpaceManagementTab;
    // @ts-ignore
    const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({}));
    const __VLS_7 = __VLS_6({}, ...__VLS_functionalComponentArgsRest(__VLS_6));
}
else {
    const __VLS_10 = SourceLibraryTab;
    // @ts-ignore
    const __VLS_11 = __VLS_asFunctionalComponent1(__VLS_10, new __VLS_10({}));
    const __VLS_12 = __VLS_11({}, ...__VLS_functionalComponentArgsRest(__VLS_11));
}
// @ts-ignore
[activeTab, activeTab,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
