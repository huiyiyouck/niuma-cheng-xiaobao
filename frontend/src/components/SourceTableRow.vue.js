/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed } from "vue";
import StatusBadge from "@/components/StatusBadge.vue";
const props = defineProps();
const emit = defineEmits();
function typeLabel(t) {
    return t === "x_twitter" ? "X/Twitter" : "RSS";
}
function formatTime(iso) {
    if (!iso)
        return "--";
    const d = new Date(iso);
    const now = Date.now();
    const diff = now - d.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1)
        return "刚刚";
    if (hours < 24)
        return `${hours}小时前`;
    return `${Math.floor(hours / 24)}天前`;
}
// 启用位置数 / 总位置数
const positionSummary = computed(() => {
    const positions = props.source.display_positions || [];
    const enabled = positions.filter(p => p.enabled).length;
    return `${enabled}/${positions.length}`;
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
/** @type {__VLS_StyleScopedClasses['table-row']} */ ;
/** @type {__VLS_StyleScopedClasses['table-row']} */ ;
/** @type {__VLS_StyleScopedClasses['table-row']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-danger']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.emit('view', __VLS_ctx.source.id);
            // @ts-ignore
            [emit, source,];
        } },
    ...{ class: "table-row" },
});
/** @type {__VLS_StyleScopedClasses['table-row']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
    ...{ class: "col-name" },
});
/** @type {__VLS_StyleScopedClasses['col-name']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "name-cell" },
});
/** @type {__VLS_StyleScopedClasses['name-cell']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "source-name" },
});
/** @type {__VLS_StyleScopedClasses['source-name']} */ ;
(__VLS_ctx.source.display_name);
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "source-identity muted" },
});
/** @type {__VLS_StyleScopedClasses['source-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
(__VLS_ctx.source.source_identity);
__VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
    ...{ class: "col-type" },
});
/** @type {__VLS_StyleScopedClasses['col-type']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "type-badge" },
    ...{ class: (__VLS_ctx.source.type === 'x_twitter' ? 'type-twitter' : 'type-rss') },
});
/** @type {__VLS_StyleScopedClasses['type-badge']} */ ;
(__VLS_ctx.typeLabel(__VLS_ctx.source.type));
__VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
    ...{ class: "col-tags" },
});
/** @type {__VLS_StyleScopedClasses['col-tags']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "tags-cell" },
});
/** @type {__VLS_StyleScopedClasses['tags-cell']} */ ;
if (__VLS_ctx.source.domain_tags.length > 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "mini-tag" },
    });
    /** @type {__VLS_StyleScopedClasses['mini-tag']} */ ;
    (__VLS_ctx.source.domain_tags[0]);
}
if (__VLS_ctx.source.domain_tags.length > 1) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "mini-tag more-tag" },
    });
    /** @type {__VLS_StyleScopedClasses['mini-tag']} */ ;
    /** @type {__VLS_StyleScopedClasses['more-tag']} */ ;
    (__VLS_ctx.source.domain_tags.length - 1);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "mini-tag role-tag" },
});
/** @type {__VLS_StyleScopedClasses['mini-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['role-tag']} */ ;
(__VLS_ctx.source.source_role);
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "mini-tag level-tag" },
});
/** @type {__VLS_StyleScopedClasses['mini-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['level-tag']} */ ;
(__VLS_ctx.source.attention_level === 'core' ? '核心' : __VLS_ctx.source.attention_level === 'regular' ? '常规' : '观察');
__VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
    ...{ class: "col-status" },
});
/** @type {__VLS_StyleScopedClasses['col-status']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "status-cell" },
});
/** @type {__VLS_StyleScopedClasses['status-cell']} */ ;
const __VLS_0 = StatusBadge;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    kind: "availability",
    status: (__VLS_ctx.source.availability_status),
    size: "sm",
}));
const __VLS_2 = __VLS_1({
    kind: "availability",
    status: (__VLS_ctx.source.availability_status),
    size: "sm",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const __VLS_5 = StatusBadge;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
    kind: "operational",
    status: (__VLS_ctx.source.operational_status),
    size: "sm",
}));
const __VLS_7 = __VLS_6({
    kind: "operational",
    status: (__VLS_ctx.source.operational_status),
    size: "sm",
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
__VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
    ...{ class: "col-positions" },
});
/** @type {__VLS_StyleScopedClasses['col-positions']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "pos-count" },
});
/** @type {__VLS_StyleScopedClasses['pos-count']} */ ;
(__VLS_ctx.positionSummary);
__VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
    ...{ class: "col-fetch" },
});
/** @type {__VLS_StyleScopedClasses['col-fetch']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "muted" },
});
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
(__VLS_ctx.formatTime(__VLS_ctx.source.last_fetched_at));
__VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
    ...{ class: "col-news" },
});
/** @type {__VLS_StyleScopedClasses['col-news']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
(__VLS_ctx.source.total_news_count);
__VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
    ...{ onClick: () => { } },
    ...{ class: "col-actions" },
});
/** @type {__VLS_StyleScopedClasses['col-actions']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.emit('edit', __VLS_ctx.source.id);
            // @ts-ignore
            [emit, source, source, source, source, source, source, source, source, source, source, source, source, source, source, source, source, typeLabel, positionSummary, formatTime,];
        } },
    ...{ class: "btn-xs" },
});
/** @type {__VLS_StyleScopedClasses['btn-xs']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.emit('delete', __VLS_ctx.source.id);
            // @ts-ignore
            [emit, source,];
        } },
    ...{ class: "btn-xs btn-danger" },
});
/** @type {__VLS_StyleScopedClasses['btn-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-danger']} */ ;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
