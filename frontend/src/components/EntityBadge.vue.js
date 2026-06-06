/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed } from "vue";
const props = defineProps();
const typeStyle = (type) => {
    const t = type.toLowerCase();
    if (t === "person")
        return { bg: "#fde8e8", text: "#c0392b", label: "人物" };
    if (t === "org" || t === "organization")
        return { bg: "#e8f4fd", text: "#2980b9", label: "组织" };
    if (t === "company")
        return { bg: "#e8f4fd", text: "#2980b9", label: "公司" };
    if (t === "product")
        return { bg: "#e8f8e8", text: "#27ae60", label: "产品" };
    if (t === "technology" || t === "tech")
        return { bg: "#f3e8ff", text: "#8e44ad", label: "技术" };
    return { bg: "#f5f5f5", text: "#888", label: type };
};
const grouped = computed(() => {
    const map = {};
    for (const e of props.entities) {
        (map[e.type] ??= []).push(e.name);
    }
    return map;
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
if (__VLS_ctx.entities.length) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "entity-list" },
    });
    /** @type {__VLS_StyleScopedClasses['entity-list']} */ ;
    for (const [names, type] of __VLS_vFor((__VLS_ctx.grouped))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "entity-group" },
            key: (type),
        });
        /** @type {__VLS_StyleScopedClasses['entity-group']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "entity-type" },
            ...{ style: ({ background: __VLS_ctx.typeStyle(type).bg, color: __VLS_ctx.typeStyle(type).text }) },
        });
        /** @type {__VLS_StyleScopedClasses['entity-type']} */ ;
        (__VLS_ctx.typeStyle(type).label);
        for (const [n] of __VLS_vFor((names))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "entity-name" },
                key: (n),
            });
            /** @type {__VLS_StyleScopedClasses['entity-name']} */ ;
            (n);
            // @ts-ignore
            [entities, grouped, typeStyle, typeStyle, typeStyle,];
        }
        // @ts-ignore
        [];
    }
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
});
export default {};
