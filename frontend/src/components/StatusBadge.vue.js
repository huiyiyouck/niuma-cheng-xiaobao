/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed } from "vue";
const props = withDefaults(defineProps(), { size: "md" });
// 可用性状态映射
const availabilityMap = {
    normal: { label: "正常", bg: "var(--success-light)", text: "var(--success)" },
    awaiting_repair: { label: "待修复", bg: "var(--warning-light)", text: "var(--warning)" },
    source_error: { label: "来源异常", bg: "var(--danger-light)", text: "var(--danger)" },
    source_removed: { label: "来源已移除", bg: "#F1F5F9", text: "var(--text-muted)" },
};
// 运行状态映射
const operationalMap = {
    fetching: { label: "抓取中", bg: "var(--success-light)", text: "var(--success)", dot: true },
    stopped: { label: "已停止", bg: "#F1F5F9", text: "var(--text-muted)", dot: false },
    unused: { label: "未使用", bg: "#F1F5F9", text: "var(--text-muted)", dot: false },
};
// 告警状态映射
const alertMap = {
    unprocessed: { label: "未处理", bg: "var(--danger-light)", text: "var(--danger)" },
    acknowledged: { label: "已确认", bg: "var(--warning-light)", text: "var(--warning)" },
    recovered: { label: "已恢复", bg: "var(--success-light)", text: "var(--success)" },
    ignored: { label: "已忽略", bg: "#F1F5F9", text: "var(--text-muted)" },
};
const config = computed(() => {
    if (props.kind === "availability")
        return availabilityMap[props.status] || availabilityMap.normal;
    if (props.kind === "operational")
        return operationalMap[props.status] || operationalMap.unused;
    if (props.kind === "alert")
        return alertMap[props.status] || alertMap.unprocessed;
    return { label: props.status, bg: "#F1F5F9", text: "var(--text-muted)" };
});
const isOperational = computed(() => props.kind === "operational");
const showDot = computed(() => isOperational.value && (operationalMap[props.status]?.dot ?? false));
const __VLS_defaults = { size: "md" };
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
    ...{ class: "status-badge" },
    ...{ class: ([`status-badge--${__VLS_ctx.size}`, `status-badge--${__VLS_ctx.kind}`]) },
    ...{ style: ({ background: __VLS_ctx.config.bg, color: __VLS_ctx.config.text }) },
});
/** @type {__VLS_StyleScopedClasses['status-badge']} */ ;
if (__VLS_ctx.showDot) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "status-dot-inline" },
        ...{ style: ({ background: __VLS_ctx.config.text }) },
    });
    /** @type {__VLS_StyleScopedClasses['status-dot-inline']} */ ;
}
(__VLS_ctx.config.label);
// @ts-ignore
[size, kind, config, config, config, config, showDot,];
const __VLS_export = (await import('vue')).defineComponent({
    __defaults: __VLS_defaults,
    __typeProps: {},
});
export default {};
