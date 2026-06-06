/// <reference types="../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { onMounted, ref } from "vue";
import ToastContainer from "@/components/ToastContainer.vue";
import ModalContainer from "@/components/ModalContainer.vue";
import { getUnprocessedAlertCount } from "@/lib/api";
// v0.5: 导航项从 3 项扩展为 4 项：浏览 | 管理 | 系统日志 | 告警
// AlertNavBadge：显示未处理告警计数
const unprocessedCount = ref(0);
async function loadAlertCount() {
    try {
        const res = await getUnprocessedAlertCount();
        unprocessedCount.value = res.count;
    }
    catch { /* 静默失败 */ }
}
onMounted(() => {
    loadAlertCount();
    // 每 60s 轮询更新告警计数
    setInterval(loadAlertCount, 60000);
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['nav-link']} */ ;
/** @type {__VLS_StyleScopedClasses['main-content']} */ ;
/** @type {__VLS_StyleScopedClasses['topbar-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['main-content']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-link']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-link']} */ ;
const __VLS_0 = ToastContainer;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({}));
const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const __VLS_5 = ModalContainer;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({}));
const __VLS_7 = __VLS_6({}, ...__VLS_functionalComponentArgsRest(__VLS_6));
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "shell" },
});
/** @type {__VLS_StyleScopedClasses['shell']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({
    ...{ class: "topbar" },
});
/** @type {__VLS_StyleScopedClasses['topbar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "topbar-inner" },
});
/** @type {__VLS_StyleScopedClasses['topbar-inner']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "brand" },
});
/** @type {__VLS_StyleScopedClasses['brand']} */ ;
let __VLS_10;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_11 = __VLS_asFunctionalComponent1(__VLS_10, new __VLS_10({
    to: "/news",
    ...{ class: "brand-link" },
}));
const __VLS_12 = __VLS_11({
    to: "/news",
    ...{ class: "brand-link" },
}, ...__VLS_functionalComponentArgsRest(__VLS_11));
/** @type {__VLS_StyleScopedClasses['brand-link']} */ ;
const { default: __VLS_15 } = __VLS_13.slots;
var __VLS_13;
__VLS_asFunctionalElement1(__VLS_intrinsics.nav, __VLS_intrinsics.nav)({
    ...{ class: "nav" },
});
/** @type {__VLS_StyleScopedClasses['nav']} */ ;
let __VLS_16;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent1(__VLS_16, new __VLS_16({
    to: "/news",
    ...{ class: "nav-link" },
    activeClass: "nav-link--active",
}));
const __VLS_18 = __VLS_17({
    to: "/news",
    ...{ class: "nav-link" },
    activeClass: "nav-link--active",
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
/** @type {__VLS_StyleScopedClasses['nav-link']} */ ;
const { default: __VLS_21 } = __VLS_19.slots;
var __VLS_19;
let __VLS_22;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_23 = __VLS_asFunctionalComponent1(__VLS_22, new __VLS_22({
    to: "/admin",
    ...{ class: "nav-link" },
    activeClass: "nav-link--active",
}));
const __VLS_24 = __VLS_23({
    to: "/admin",
    ...{ class: "nav-link" },
    activeClass: "nav-link--active",
}, ...__VLS_functionalComponentArgsRest(__VLS_23));
/** @type {__VLS_StyleScopedClasses['nav-link']} */ ;
const { default: __VLS_27 } = __VLS_25.slots;
var __VLS_25;
let __VLS_28;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent1(__VLS_28, new __VLS_28({
    to: "/logs",
    ...{ class: "nav-link" },
    activeClass: "nav-link--active",
}));
const __VLS_30 = __VLS_29({
    to: "/logs",
    ...{ class: "nav-link" },
    activeClass: "nav-link--active",
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
/** @type {__VLS_StyleScopedClasses['nav-link']} */ ;
const { default: __VLS_33 } = __VLS_31.slots;
var __VLS_31;
let __VLS_34;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_35 = __VLS_asFunctionalComponent1(__VLS_34, new __VLS_34({
    to: "/alerts",
    ...{ class: "nav-link nav-link--alert" },
    activeClass: "nav-link--active",
}));
const __VLS_36 = __VLS_35({
    to: "/alerts",
    ...{ class: "nav-link nav-link--alert" },
    activeClass: "nav-link--active",
}, ...__VLS_functionalComponentArgsRest(__VLS_35));
/** @type {__VLS_StyleScopedClasses['nav-link']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-link--alert']} */ ;
const { default: __VLS_39 } = __VLS_37.slots;
if (__VLS_ctx.unprocessedCount > 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "alert-badge" },
    });
    /** @type {__VLS_StyleScopedClasses['alert-badge']} */ ;
    (__VLS_ctx.unprocessedCount);
}
// @ts-ignore
[unprocessedCount, unprocessedCount,];
var __VLS_37;
__VLS_asFunctionalElement1(__VLS_intrinsics.main, __VLS_intrinsics.main)({
    ...{ class: "main-content" },
});
/** @type {__VLS_StyleScopedClasses['main-content']} */ ;
let __VLS_40;
/** @ts-ignore @type { | typeof __VLS_components.RouterView} */
RouterView;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent1(__VLS_40, new __VLS_40({}));
const __VLS_42 = __VLS_41({}, ...__VLS_functionalComponentArgsRest(__VLS_41));
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
