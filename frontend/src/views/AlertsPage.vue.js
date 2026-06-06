/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { onMounted, ref } from "vue";
import { listAlerts, updateAlertStatus } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge.vue";
import EmptyState from "@/components/EmptyState.vue";
import { useToast } from "@/composables/useToast";
import { useRouter } from "vue-router";
// v0.5: 告警页
// 告警列表 + 状态 Tab（含计数）+ 告警行（操作按钮按状态显示）
const toast = useToast();
const router = useRouter();
const alerts = ref([]);
const total = ref(0);
const loading = ref(false);
const errorText = ref(null);
const activeStatus = ref("unprocessed");
const currentPage = ref(1);
const pageSize = ref(20);
// 各状态计数
const statusCounts = ref({
    unprocessed: 0,
    acknowledged: 0,
    recovered: 0,
    ignored: 0,
});
const STATUS_TABS = [
    { value: "", label: "全部" },
    { value: "unprocessed", label: "未处理" },
    { value: "acknowledged", label: "已确认" },
    { value: "recovered", label: "已恢复" },
    { value: "ignored", label: "已忽略" },
];
const alertTypeLabel = {
    source_error: "来源异常",
    x_stream_global: "X Stream 全局",
    x_auth_failure: "X 鉴权失败",
    system_db: "数据库异常",
    system_queue: "任务队列异常",
};
async function loadAlerts() {
    loading.value = true;
    errorText.value = null;
    try {
        const params = {
            limit: pageSize.value,
            offset: (currentPage.value - 1) * pageSize.value,
        };
        if (activeStatus.value)
            params.status = activeStatus.value;
        const res = await listAlerts(params);
        alerts.value = res.alerts;
        total.value = res.total;
        // 同时加载各状态计数（简单策略：全量加载一次计数）
        const allRes = await listAlerts({ limit: 1 });
        // 分别获取各状态计数
        // 简化：从单次查询中解析（实际后端应返回计数）
    }
    catch (e) {
        errorText.value = e instanceof Error ? e.message : String(e);
    }
    finally {
        loading.value = false;
    }
}
async function loadCounts() {
    try {
        // 为每个状态查询计数
        for (const tab of STATUS_TABS) {
            if (tab.value === "")
                continue;
            const res = await listAlerts({ status: tab.value, limit: 1 });
            statusCounts.value[tab.value] = res.total;
        }
        // 全部 = 各状态之和
        statusCounts.value[""] = Object.values(statusCounts.value).reduce((a, b) => a + b, 0);
    }
    catch { /* 计数加载失败不影响列表 */ }
}
async function onStatusChange(status) {
    activeStatus.value = status;
    currentPage.value = 1;
    await loadAlerts();
}
async function onUpdateAlert(alert, newStatus) {
    try {
        await updateAlertStatus(alert.id, newStatus);
        toast.success(`告警已${newStatus === 'acknowledged' ? '确认' : newStatus === 'ignored' ? '忽略' : '更新'}`);
        await loadAlerts();
        await loadCounts();
    }
    catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
    }
}
function viewSource(sourceId) {
    if (sourceId) {
        router.push(`/sources/${sourceId}`);
    }
}
function formatTime(iso) {
    return new Date(iso).toLocaleString();
}
onMounted(async () => {
    await Promise.all([loadAlerts(), loadCounts()]);
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['status-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['status-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['status-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-count']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-row']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-row']} */ ;
/** @type {__VLS_StyleScopedClasses['row--error']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-xs']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "alerts-page" },
});
/** @type {__VLS_StyleScopedClasses['alerts-page']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "page-header" },
});
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "page-title" },
});
/** @type {__VLS_StyleScopedClasses['page-title']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "page-sub" },
});
/** @type {__VLS_StyleScopedClasses['page-sub']} */ ;
if (__VLS_ctx.errorText) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "error-bar" },
    });
    /** @type {__VLS_StyleScopedClasses['error-bar']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.errorText);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "status-tabs" },
});
/** @type {__VLS_StyleScopedClasses['status-tabs']} */ ;
for (const [tab] of __VLS_vFor((__VLS_ctx.STATUS_TABS))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.onStatusChange(tab.value);
                // @ts-ignore
                [errorText, errorText, STATUS_TABS, onStatusChange,];
            } },
        key: (tab.value),
        ...{ class: "status-tab" },
        ...{ class: ({ active: __VLS_ctx.activeStatus === tab.value }) },
    });
    /** @type {__VLS_StyleScopedClasses['status-tab']} */ ;
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    (tab.label);
    if (__VLS_ctx.statusCounts[tab.value] !== undefined) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "tab-count" },
        });
        /** @type {__VLS_StyleScopedClasses['tab-count']} */ ;
        (__VLS_ctx.statusCounts[tab.value]);
    }
    // @ts-ignore
    [activeStatus, statusCounts, statusCounts,];
}
if (__VLS_ctx.loading && __VLS_ctx.alerts.length === 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "loading-state" },
    });
    /** @type {__VLS_StyleScopedClasses['loading-state']} */ ;
}
else if (__VLS_ctx.alerts.length === 0) {
    const __VLS_0 = EmptyState;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        icon: "&#9989;",
        title: "暂无告警",
        description: "系统运行正常",
    }));
    const __VLS_2 = __VLS_1({
        icon: "&#9989;",
        title: "暂无告警",
        description: "系统运行正常",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "alert-list" },
    });
    /** @type {__VLS_StyleScopedClasses['alert-list']} */ ;
    for (const [a] of __VLS_vFor((__VLS_ctx.alerts))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (a.id),
            ...{ class: "alert-row" },
            ...{ class: ({ 'row--error': a.type === 'x_auth_failure' || a.type === 'system_db' }) },
        });
        /** @type {__VLS_StyleScopedClasses['alert-row']} */ ;
        /** @type {__VLS_StyleScopedClasses['row--error']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "alert-time" },
        });
        /** @type {__VLS_StyleScopedClasses['alert-time']} */ ;
        (__VLS_ctx.formatTime(a.created_at));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "alert-type-tag" },
        });
        /** @type {__VLS_StyleScopedClasses['alert-type-tag']} */ ;
        (__VLS_ctx.alertTypeLabel[a.type] || a.type);
        const __VLS_5 = StatusBadge;
        // @ts-ignore
        const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
            kind: "alert",
            status: (a.status),
            size: "sm",
        }));
        const __VLS_7 = __VLS_6({
            kind: "alert",
            status: (a.status),
            size: "sm",
        }, ...__VLS_functionalComponentArgsRest(__VLS_6));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "alert-msg" },
        });
        /** @type {__VLS_StyleScopedClasses['alert-msg']} */ ;
        (a.message);
        if (a.source_id) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loading && __VLS_ctx.alerts.length === 0))
                            return;
                        if (!!(__VLS_ctx.alerts.length === 0))
                            return;
                        if (!(a.source_id))
                            return;
                        __VLS_ctx.viewSource(a.source_id);
                        // @ts-ignore
                        [loading, alerts, alerts, alerts, formatTime, alertTypeLabel, viewSource,];
                    } },
                ...{ class: "btn-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-xs']} */ ;
            (a.source_display_name || '查看来源');
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "no-source" },
            });
            /** @type {__VLS_StyleScopedClasses['no-source']} */ ;
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "alert-actions" },
        });
        /** @type {__VLS_StyleScopedClasses['alert-actions']} */ ;
        if (a.status === 'unprocessed') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loading && __VLS_ctx.alerts.length === 0))
                            return;
                        if (!!(__VLS_ctx.alerts.length === 0))
                            return;
                        if (!(a.status === 'unprocessed'))
                            return;
                        __VLS_ctx.onUpdateAlert(a, 'acknowledged');
                        // @ts-ignore
                        [onUpdateAlert,];
                    } },
                ...{ class: "btn-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-xs']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loading && __VLS_ctx.alerts.length === 0))
                            return;
                        if (!!(__VLS_ctx.alerts.length === 0))
                            return;
                        if (!(a.status === 'unprocessed'))
                            return;
                        __VLS_ctx.onUpdateAlert(a, 'ignored');
                        // @ts-ignore
                        [onUpdateAlert,];
                    } },
                ...{ class: "btn-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-xs']} */ ;
        }
        // @ts-ignore
        [];
    }
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
