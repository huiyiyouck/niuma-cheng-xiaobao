/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, ref } from "vue";
import { toggleDisplayPosition } from "@/lib/api";
import { useToast } from "@/composables/useToast";
import { useModal } from "@/composables/useModal";
import StatusBadge from "@/components/StatusBadge.vue";
import { useRouter } from "vue-router";
const props = defineProps();
const emit = defineEmits();
const toast = useToast();
const modal = useModal();
const router = useRouter();
const toggling = ref(new Set());
// 当前空间/频道下的展示位置
const relevantPositions = computed(() => {
    return (props.source.display_positions || []).filter(p => {
        if (p.space_id !== props.currentSpaceId)
            return false;
        if (props.currentChannelId)
            return p.channel_id === props.currentChannelId;
        return p.channel_id === null;
    });
});
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
// 来源已移除时不可操作
const isRemoved = computed(() => props.source.availability_status === "source_removed");
async function onTogglePosition(pos) {
    toggling.value.add(pos.id);
    try {
        await toggleDisplayPosition(pos.id, !pos.enabled);
        emit("refresh");
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
    const ok = await modal.confirm("移除展示位置", `确定从${targetDesc}移除「${props.source.display_name}」吗？Source 本身和历史新闻将保留。`, { confirmText: "确认移除", danger: true });
    if (!ok)
        return;
    emit("remove", pos.id);
}
function viewDetail() {
    router.push(`/sources/${props.source.id}`);
}
// 领域标签
const domainLabel = computed(() => props.source.domain_tags?.[0] || "");
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
/** @type {__VLS_StyleScopedClasses['source-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-name']} */ ;
/** @type {__VLS_StyleScopedClasses['name--removed']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-danger']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "source-card" },
    ...{ class: ({ 'card--removed': __VLS_ctx.isRemoved }) },
});
/** @type {__VLS_StyleScopedClasses['source-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card--removed']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "card-row1" },
});
/** @type {__VLS_StyleScopedClasses['card-row1']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ onClick: (__VLS_ctx.viewDetail) },
    ...{ class: "card-name" },
    ...{ class: ({ 'name--removed': __VLS_ctx.isRemoved }) },
});
/** @type {__VLS_StyleScopedClasses['card-name']} */ ;
/** @type {__VLS_StyleScopedClasses['name--removed']} */ ;
(__VLS_ctx.source.display_name);
if (__VLS_ctx.isRemoved) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "removed-tag" },
    });
    /** @type {__VLS_StyleScopedClasses['removed-tag']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "type-badge" },
    ...{ class: (__VLS_ctx.source.type === 'x_twitter' ? 'type-twitter' : 'type-rss') },
});
/** @type {__VLS_StyleScopedClasses['type-badge']} */ ;
(__VLS_ctx.typeLabel(__VLS_ctx.source.type));
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
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "card-row2" },
});
/** @type {__VLS_StyleScopedClasses['card-row2']} */ ;
if (__VLS_ctx.domainLabel) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "mini-tag" },
    });
    /** @type {__VLS_StyleScopedClasses['mini-tag']} */ ;
    (__VLS_ctx.domainLabel);
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
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "sep" },
});
/** @type {__VLS_StyleScopedClasses['sep']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.code, __VLS_intrinsics.code)({
    ...{ class: "identity-code" },
});
/** @type {__VLS_StyleScopedClasses['identity-code']} */ ;
(__VLS_ctx.source.source_identity);
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "sep" },
});
/** @type {__VLS_StyleScopedClasses['sep']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
(__VLS_ctx.formatTime(__VLS_ctx.source.last_fetched_at));
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "sep" },
});
/** @type {__VLS_StyleScopedClasses['sep']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
(__VLS_ctx.source.total_news_count);
if (__VLS_ctx.source.availability_status === 'source_error' || __VLS_ctx.source.availability_status === 'awaiting_repair') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "card-alert" },
    });
    /** @type {__VLS_StyleScopedClasses['card-alert']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "alert-icon" },
    });
    /** @type {__VLS_StyleScopedClasses['alert-icon']} */ ;
    if (__VLS_ctx.source.availability_status === 'source_error') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (__VLS_ctx.source.consecutive_failures);
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (__VLS_ctx.source.verify_error || '需要验证来源身份');
    }
}
if (!__VLS_ctx.isRemoved) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "card-row3" },
    });
    /** @type {__VLS_StyleScopedClasses['card-row3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "positions-info" },
    });
    /** @type {__VLS_StyleScopedClasses['positions-info']} */ ;
    if (__VLS_ctx.relevantPositions.length === 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "muted" },
        });
        /** @type {__VLS_StyleScopedClasses['muted']} */ ;
    }
    for (const [pos] of __VLS_vFor((__VLS_ctx.relevantPositions))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (pos.id),
            ...{ class: "position-item" },
        });
        /** @type {__VLS_StyleScopedClasses['position-item']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "pos-target" },
        });
        /** @type {__VLS_StyleScopedClasses['pos-target']} */ ;
        (pos.channel_name ? `频道「${pos.channel_name}」` : '空间根节点');
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(!__VLS_ctx.isRemoved))
                        return;
                    __VLS_ctx.onTogglePosition(pos);
                    // @ts-ignore
                    [isRemoved, isRemoved, isRemoved, isRemoved, viewDetail, source, source, source, source, source, source, source, source, source, source, source, source, source, source, source, source, typeLabel, domainLabel, domainLabel, formatTime, relevantPositions, relevantPositions, onTogglePosition,];
                } },
            ...{ class: "btn-xs" },
            ...{ class: ({ 'btn--pause': pos.enabled, 'btn--resume': !pos.enabled }) },
            disabled: (__VLS_ctx.toggling.has(pos.id)),
        });
        /** @type {__VLS_StyleScopedClasses['btn-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['btn--pause']} */ ;
        /** @type {__VLS_StyleScopedClasses['btn--resume']} */ ;
        (pos.enabled ? '暂停' : '恢复');
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(!__VLS_ctx.isRemoved))
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
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "card-actions" },
    });
    /** @type {__VLS_StyleScopedClasses['card-actions']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.viewDetail) },
        ...{ class: "btn-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['btn-xs']} */ ;
}
// @ts-ignore
[viewDetail,];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
