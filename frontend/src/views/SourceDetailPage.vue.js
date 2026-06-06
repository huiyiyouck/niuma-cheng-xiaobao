/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getSource, getIdentityHistory, toggleDisplayPosition, removeDisplayPosition } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge.vue";
import { useToast } from "@/composables/useToast";
import { useModal } from "@/composables/useModal";
// v0.5: Source 详情页
// 双栏布局（CSS Grid 1fr 360px）：面包屑、双状态 Badge、展示位置列表、身份变更历史
const route = useRoute();
const router = useRouter();
const toast = useToast();
const modal = useModal();
const sourceId = route.params.id;
const source = ref(null);
const loading = ref(false);
const errorText = ref(null);
// 身份变更历史
const identityHistory = ref([]);
const showHistory = ref(false);
// 可编辑状态（来源身份编辑权限）
const canEditIdentity = computed(() => {
    if (!source.value)
        return false;
    const s = source.value.availability_status;
    return s === "awaiting_repair" || s === "source_error";
});
const toggling = ref(new Set());
async function loadSource() {
    loading.value = true;
    errorText.value = null;
    try {
        source.value = await getSource(sourceId);
    }
    catch (e) {
        errorText.value = e instanceof Error ? e.message : String(e);
    }
    finally {
        loading.value = false;
    }
}
async function loadHistory() {
    try {
        identityHistory.value = await getIdentityHistory(sourceId);
    }
    catch { /* 历史加载失败不影响主内容 */ }
}
onMounted(async () => {
    await Promise.all([loadSource(), loadHistory()]);
});
function typeLabel(t) {
    return t === "x_twitter" ? "X/Twitter" : "RSS";
}
function formatTime(iso) {
    if (!iso)
        return "--";
    return new Date(iso).toLocaleString();
}
async function onTogglePosition(pos) {
    toggling.value.add(pos.id);
    try {
        await toggleDisplayPosition(pos.id, !pos.enabled);
        await loadSource();
    }
    catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
    }
    finally {
        toggling.value.delete(pos.id);
    }
}
async function onRemovePosition(pos) {
    const targetDesc = pos.channel_name ? `频道「${pos.channel_name}」` : "空间根节点";
    const ok = await modal.confirm("移除展示位置", `确定从${targetDesc}移除吗？`, { confirmText: "确认移除", danger: true });
    if (!ok)
        return;
    try {
        await removeDisplayPosition(pos.id);
        toast.success("已移除");
        await loadSource();
    }
    catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
    }
}
// 启用/暂停/总数统计
const positionStats = computed(() => {
    if (!source.value)
        return { total: 0, enabled: 0, paused: 0, spaces: 0 };
    const positions = source.value.display_positions || [];
    const enabled = positions.filter(p => p.enabled).length;
    const spaces = new Set(positions.map(p => p.space_id)).size;
    return { total: positions.length, enabled, paused: positions.length - enabled, spaces };
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['crumb']} */ ;
/** @type {__VLS_StyleScopedClasses['crumb']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['pos-stat-num']} */ ;
/** @type {__VLS_StyleScopedClasses['pos-stat-num']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-block']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "detail-page" },
});
/** @type {__VLS_StyleScopedClasses['detail-page']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "breadcrumb" },
});
/** @type {__VLS_StyleScopedClasses['breadcrumb']} */ ;
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    to: "/admin",
    ...{ class: "crumb" },
}));
const __VLS_2 = __VLS_1({
    to: "/admin",
    ...{ class: "crumb" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
/** @type {__VLS_StyleScopedClasses['crumb']} */ ;
const { default: __VLS_5 } = __VLS_3.slots;
var __VLS_3;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "crumb-sep" },
});
/** @type {__VLS_StyleScopedClasses['crumb-sep']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "crumb current" },
});
/** @type {__VLS_StyleScopedClasses['crumb']} */ ;
/** @type {__VLS_StyleScopedClasses['current']} */ ;
if (__VLS_ctx.errorText) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "error-bar" },
    });
    /** @type {__VLS_StyleScopedClasses['error-bar']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.errorText);
}
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "loading-state" },
    });
    /** @type {__VLS_StyleScopedClasses['loading-state']} */ ;
}
else if (__VLS_ctx.source) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "detail-grid" },
    });
    /** @type {__VLS_StyleScopedClasses['detail-grid']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "detail-main" },
    });
    /** @type {__VLS_StyleScopedClasses['detail-main']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "detail-header" },
    });
    /** @type {__VLS_StyleScopedClasses['detail-header']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
        ...{ class: "detail-name" },
    });
    /** @type {__VLS_StyleScopedClasses['detail-name']} */ ;
    (__VLS_ctx.source.display_name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "detail-status" },
    });
    /** @type {__VLS_StyleScopedClasses['detail-status']} */ ;
    const __VLS_6 = StatusBadge;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
        kind: "availability",
        status: (__VLS_ctx.source.availability_status),
        size: "md",
    }));
    const __VLS_8 = __VLS_7({
        kind: "availability",
        status: (__VLS_ctx.source.availability_status),
        size: "md",
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    const __VLS_11 = StatusBadge;
    // @ts-ignore
    const __VLS_12 = __VLS_asFunctionalComponent1(__VLS_11, new __VLS_11({
        kind: "operational",
        status: (__VLS_ctx.source.operational_status),
        size: "md",
    }));
    const __VLS_13 = __VLS_12({
        kind: "operational",
        status: (__VLS_ctx.source.operational_status),
        size: "md",
    }, ...__VLS_functionalComponentArgsRest(__VLS_12));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "info-card" },
    });
    /** @type {__VLS_StyleScopedClasses['info-card']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
        ...{ class: "info-title" },
    });
    /** @type {__VLS_StyleScopedClasses['info-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "info-grid" },
    });
    /** @type {__VLS_StyleScopedClasses['info-grid']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "info-item" },
    });
    /** @type {__VLS_StyleScopedClasses['info-item']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "info-label" },
    });
    /** @type {__VLS_StyleScopedClasses['info-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "info-value" },
    });
    /** @type {__VLS_StyleScopedClasses['info-value']} */ ;
    (__VLS_ctx.typeLabel(__VLS_ctx.source.type));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "info-item" },
    });
    /** @type {__VLS_StyleScopedClasses['info-item']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "info-label" },
    });
    /** @type {__VLS_StyleScopedClasses['info-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.code, __VLS_intrinsics.code)({
        ...{ class: "info-code" },
    });
    /** @type {__VLS_StyleScopedClasses['info-code']} */ ;
    (__VLS_ctx.source.source_identity);
    if (__VLS_ctx.canEditIdentity) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "editable-hint" },
        });
        /** @type {__VLS_StyleScopedClasses['editable-hint']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "info-item" },
    });
    /** @type {__VLS_StyleScopedClasses['info-item']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "info-label" },
    });
    /** @type {__VLS_StyleScopedClasses['info-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tag-list" },
    });
    /** @type {__VLS_StyleScopedClasses['tag-list']} */ ;
    for (const [t] of __VLS_vFor((__VLS_ctx.source.domain_tags))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            key: (t),
            ...{ class: "info-tag" },
        });
        /** @type {__VLS_StyleScopedClasses['info-tag']} */ ;
        (t);
        // @ts-ignore
        [errorText, errorText, loading, source, source, source, source, source, source, source, typeLabel, canEditIdentity,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "info-item" },
    });
    /** @type {__VLS_StyleScopedClasses['info-item']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "info-label" },
    });
    /** @type {__VLS_StyleScopedClasses['info-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "info-value" },
    });
    /** @type {__VLS_StyleScopedClasses['info-value']} */ ;
    (__VLS_ctx.source.source_role);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "info-item" },
    });
    /** @type {__VLS_StyleScopedClasses['info-item']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "info-label" },
    });
    /** @type {__VLS_StyleScopedClasses['info-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "info-value" },
    });
    /** @type {__VLS_StyleScopedClasses['info-value']} */ ;
    (__VLS_ctx.source.attention_level === 'core' ? '核心' : __VLS_ctx.source.attention_level === 'regular' ? '常规' : '观察');
    if (__VLS_ctx.source.content_topics.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "info-item" },
        });
        /** @type {__VLS_StyleScopedClasses['info-item']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "info-label" },
        });
        /** @type {__VLS_StyleScopedClasses['info-label']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "tag-list" },
        });
        /** @type {__VLS_StyleScopedClasses['tag-list']} */ ;
        for (const [t] of __VLS_vFor((__VLS_ctx.source.content_topics))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                key: (t),
                ...{ class: "info-tag topic-tag" },
            });
            /** @type {__VLS_StyleScopedClasses['info-tag']} */ ;
            /** @type {__VLS_StyleScopedClasses['topic-tag']} */ ;
            (t);
            // @ts-ignore
            [source, source, source, source, source,];
        }
    }
    if (__VLS_ctx.source.notes) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "info-item" },
        });
        /** @type {__VLS_StyleScopedClasses['info-item']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "info-label" },
        });
        /** @type {__VLS_StyleScopedClasses['info-label']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "info-value" },
        });
        /** @type {__VLS_StyleScopedClasses['info-value']} */ ;
        (__VLS_ctx.source.notes);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "info-card" },
    });
    /** @type {__VLS_StyleScopedClasses['info-card']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
        ...{ class: "info-title" },
    });
    /** @type {__VLS_StyleScopedClasses['info-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "info-grid" },
    });
    /** @type {__VLS_StyleScopedClasses['info-grid']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "info-item" },
    });
    /** @type {__VLS_StyleScopedClasses['info-item']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "info-label" },
    });
    /** @type {__VLS_StyleScopedClasses['info-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "info-value" },
    });
    /** @type {__VLS_StyleScopedClasses['info-value']} */ ;
    (__VLS_ctx.formatTime(__VLS_ctx.source.last_fetched_at));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "info-item" },
    });
    /** @type {__VLS_StyleScopedClasses['info-item']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "info-label" },
    });
    /** @type {__VLS_StyleScopedClasses['info-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "info-value" },
    });
    /** @type {__VLS_StyleScopedClasses['info-value']} */ ;
    (__VLS_ctx.formatTime(__VLS_ctx.source.last_verified_at));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "info-item" },
    });
    /** @type {__VLS_StyleScopedClasses['info-item']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "info-label" },
    });
    /** @type {__VLS_StyleScopedClasses['info-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "info-value" },
        ...{ class: ({ 'fail-count': __VLS_ctx.source.consecutive_failures >= 3 }) },
    });
    /** @type {__VLS_StyleScopedClasses['info-value']} */ ;
    /** @type {__VLS_StyleScopedClasses['fail-count']} */ ;
    (__VLS_ctx.source.consecutive_failures);
    if (__VLS_ctx.source.verify_error) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "info-item" },
        });
        /** @type {__VLS_StyleScopedClasses['info-item']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "info-label" },
        });
        /** @type {__VLS_StyleScopedClasses['info-label']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "info-value err-text" },
        });
        /** @type {__VLS_StyleScopedClasses['info-value']} */ ;
        /** @type {__VLS_StyleScopedClasses['err-text']} */ ;
        (__VLS_ctx.source.verify_error);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "info-item" },
    });
    /** @type {__VLS_StyleScopedClasses['info-item']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "info-label" },
    });
    /** @type {__VLS_StyleScopedClasses['info-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "info-value" },
    });
    /** @type {__VLS_StyleScopedClasses['info-value']} */ ;
    (__VLS_ctx.source.total_news_count);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "info-card" },
    });
    /** @type {__VLS_StyleScopedClasses['info-card']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
        ...{ class: "info-title" },
    });
    /** @type {__VLS_StyleScopedClasses['info-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pos-stats" },
    });
    /** @type {__VLS_StyleScopedClasses['pos-stats']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pos-stat" },
    });
    /** @type {__VLS_StyleScopedClasses['pos-stat']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "pos-stat-num" },
    });
    /** @type {__VLS_StyleScopedClasses['pos-stat-num']} */ ;
    (__VLS_ctx.positionStats.total);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "pos-stat-label" },
    });
    /** @type {__VLS_StyleScopedClasses['pos-stat-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pos-stat" },
    });
    /** @type {__VLS_StyleScopedClasses['pos-stat']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "pos-stat-num green" },
    });
    /** @type {__VLS_StyleScopedClasses['pos-stat-num']} */ ;
    /** @type {__VLS_StyleScopedClasses['green']} */ ;
    (__VLS_ctx.positionStats.enabled);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "pos-stat-label" },
    });
    /** @type {__VLS_StyleScopedClasses['pos-stat-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pos-stat" },
    });
    /** @type {__VLS_StyleScopedClasses['pos-stat']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "pos-stat-num muted-num" },
    });
    /** @type {__VLS_StyleScopedClasses['pos-stat-num']} */ ;
    /** @type {__VLS_StyleScopedClasses['muted-num']} */ ;
    (__VLS_ctx.positionStats.paused);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "pos-stat-label" },
    });
    /** @type {__VLS_StyleScopedClasses['pos-stat-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pos-stat" },
    });
    /** @type {__VLS_StyleScopedClasses['pos-stat']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "pos-stat-num" },
    });
    /** @type {__VLS_StyleScopedClasses['pos-stat-num']} */ ;
    (__VLS_ctx.positionStats.spaces);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "pos-stat-label" },
    });
    /** @type {__VLS_StyleScopedClasses['pos-stat-label']} */ ;
    if (__VLS_ctx.source.display_positions.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "pos-list" },
        });
        /** @type {__VLS_StyleScopedClasses['pos-list']} */ ;
        for (const [pos] of __VLS_vFor((__VLS_ctx.source.display_positions))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (pos.id),
                ...{ class: "pos-item" },
            });
            /** @type {__VLS_StyleScopedClasses['pos-item']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "pos-info" },
            });
            /** @type {__VLS_StyleScopedClasses['pos-info']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "pos-space" },
            });
            /** @type {__VLS_StyleScopedClasses['pos-space']} */ ;
            (pos.space_name);
            if (pos.channel_name) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "pos-arrow" },
                });
                /** @type {__VLS_StyleScopedClasses['pos-arrow']} */ ;
            }
            if (pos.channel_name) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "pos-channel" },
                });
                /** @type {__VLS_StyleScopedClasses['pos-channel']} */ ;
                (pos.channel_name);
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "pos-root" },
                });
                /** @type {__VLS_StyleScopedClasses['pos-root']} */ ;
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "pos-actions" },
            });
            /** @type {__VLS_StyleScopedClasses['pos-actions']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "pos-enabled-tag" },
                ...{ class: (pos.enabled ? 'tag-on' : 'tag-off') },
            });
            /** @type {__VLS_StyleScopedClasses['pos-enabled-tag']} */ ;
            (pos.enabled ? '启用' : '暂停');
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loading))
                            return;
                        if (!(__VLS_ctx.source))
                            return;
                        if (!(__VLS_ctx.source.display_positions.length > 0))
                            return;
                        __VLS_ctx.onTogglePosition(pos);
                        // @ts-ignore
                        [source, source, source, source, source, source, source, source, source, source, source, formatTime, formatTime, positionStats, positionStats, positionStats, positionStats, onTogglePosition,];
                    } },
                ...{ class: "btn-xs" },
                disabled: (__VLS_ctx.toggling.has(pos.id)),
            });
            /** @type {__VLS_StyleScopedClasses['btn-xs']} */ ;
            (pos.enabled ? '暂停' : '恢复');
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loading))
                            return;
                        if (!(__VLS_ctx.source))
                            return;
                        if (!(__VLS_ctx.source.display_positions.length > 0))
                            return;
                        __VLS_ctx.onRemovePosition(pos);
                        // @ts-ignore
                        [toggling, onRemovePosition,];
                    } },
                ...{ class: "btn-xs btn-danger" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['btn-danger']} */ ;
            // @ts-ignore
            [];
        }
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "no-positions muted" },
        });
        /** @type {__VLS_StyleScopedClasses['no-positions']} */ ;
        /** @type {__VLS_StyleScopedClasses['muted']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "detail-sidebar" },
    });
    /** @type {__VLS_StyleScopedClasses['detail-sidebar']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "sidebar-card" },
    });
    /** @type {__VLS_StyleScopedClasses['sidebar-card']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
        ...{ class: "sidebar-title" },
    });
    /** @type {__VLS_StyleScopedClasses['sidebar-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.loading))
                    return;
                if (!(__VLS_ctx.source))
                    return;
                __VLS_ctx.router.push(`/admin`);
                // @ts-ignore
                [router,];
            } },
        ...{ class: "btn btn-block" },
    });
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['btn-block']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.loading))
                    return;
                if (!(__VLS_ctx.source))
                    return;
                __VLS_ctx.router.push(`/admin`);
                // @ts-ignore
                [router,];
            } },
        ...{ class: "btn btn-block" },
    });
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['btn-block']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "sidebar-card" },
    });
    /** @type {__VLS_StyleScopedClasses['sidebar-card']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.loading))
                    return;
                if (!(__VLS_ctx.source))
                    return;
                __VLS_ctx.showHistory = !__VLS_ctx.showHistory;
                // @ts-ignore
                [showHistory, showHistory,];
            } },
        ...{ class: "sidebar-title" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['sidebar-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "toggle-icon" },
    });
    /** @type {__VLS_StyleScopedClasses['toggle-icon']} */ ;
    (__VLS_ctx.showHistory ? '▾' : '▸');
    if (__VLS_ctx.showHistory && __VLS_ctx.identityHistory.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "history-list" },
        });
        /** @type {__VLS_StyleScopedClasses['history-list']} */ ;
        for (const [h] of __VLS_vFor((__VLS_ctx.identityHistory))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (h.id),
                ...{ class: "history-item" },
            });
            /** @type {__VLS_StyleScopedClasses['history-item']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "history-change" },
            });
            /** @type {__VLS_StyleScopedClasses['history-change']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.code, __VLS_intrinsics.code)({
                ...{ class: "history-old" },
            });
            /** @type {__VLS_StyleScopedClasses['history-old']} */ ;
            (h.old_identity);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "history-arrow" },
            });
            /** @type {__VLS_StyleScopedClasses['history-arrow']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.code, __VLS_intrinsics.code)({
                ...{ class: "history-new" },
            });
            /** @type {__VLS_StyleScopedClasses['history-new']} */ ;
            (h.new_identity);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "history-time muted" },
            });
            /** @type {__VLS_StyleScopedClasses['history-time']} */ ;
            /** @type {__VLS_StyleScopedClasses['muted']} */ ;
            (__VLS_ctx.formatTime(h.changed_at));
            // @ts-ignore
            [formatTime, showHistory, showHistory, identityHistory, identityHistory,];
        }
    }
    else if (__VLS_ctx.showHistory) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "muted" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['muted']} */ ;
    }
}
// @ts-ignore
[showHistory,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
