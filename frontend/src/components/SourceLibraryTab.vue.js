/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { onMounted, ref } from "vue";
import { listSources, listSpaces, deleteSource, getSourceDeleteImpact } from "@/lib/api";
import SearchFilterBar from "@/components/SearchFilterBar.vue";
import SourceTable from "@/components/SourceTable.vue";
import SourceCreateForm from "@/components/SourceCreateForm.vue";
import Pagination from "@/components/Pagination.vue";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog.vue";
import { useToast } from "@/composables/useToast";
import { useRouter } from "vue-router";
// v0.5: 信息源库 Tab
// 四层结构：操作栏 + SearchFilterBar + SourceTable + Pagination
const toast = useToast();
const router = useRouter();
const sources = ref([]);
const spaces = ref([]);
const total = ref(0);
const loading = ref(false);
const errorText = ref(null);
// 分页/筛选/搜索状态
const currentPage = ref(1);
const pageSize = ref(20);
const searchQuery = ref("");
const filters = ref({});
// 新建表单
const showCreateForm = ref(false);
// 删除确认
const deleteTarget = ref(null);
const deleteImpact = ref({
    affectedPositions: 0,
    preservedNews: 0,
});
const showDeleteDialog = ref(false);
onMounted(async () => {
    try {
        spaces.value = await listSpaces();
    }
    catch { /* space 加载失败不影响列表 */ }
    await loadSources();
});
async function loadSources() {
    loading.value = true;
    errorText.value = null;
    try {
        const params = {
            limit: pageSize.value,
            offset: (currentPage.value - 1) * pageSize.value,
        };
        if (searchQuery.value)
            params.search = searchQuery.value;
        if (filters.value.type)
            params.type = filters.value.type;
        if (filters.value.availability_status)
            params.availability_status = filters.value.availability_status;
        if (filters.value.operational_status)
            params.operational_status = filters.value.operational_status;
        if (filters.value.domain_tag)
            params.domain_tag = filters.value.domain_tag;
        if (filters.value.source_role)
            params.source_role = filters.value.source_role;
        if (filters.value.attention_level)
            params.attention_level = filters.value.attention_level;
        if (filters.value.space_id)
            params.space_id = filters.value.space_id;
        const res = await listSources(params);
        sources.value = res.sources;
        total.value = res.total;
    }
    catch (e) {
        errorText.value = e instanceof Error ? e.message : String(e);
    }
    finally {
        loading.value = false;
    }
}
function onSearch(q) {
    searchQuery.value = q;
    currentPage.value = 1;
    loadSources();
}
function onFilter(f) {
    filters.value = f;
    currentPage.value = 1;
    loadSources();
}
function onPageChange(page) {
    currentPage.value = page;
    loadSources();
}
function onPageSizeChange(size) {
    pageSize.value = size;
    currentPage.value = 1;
    loadSources();
}
function viewSource(id) {
    router.push(`/sources/${id}`);
}
function editSource(id) {
    router.push(`/sources/${id}`);
}
async function prepareDelete(id) {
    const s = sources.value.find(x => x.id === id);
    if (!s)
        return;
    try {
        const impact = await getSourceDeleteImpact(id);
        deleteImpact.value = {
            affectedPositions: impact.affected_positions,
            preservedNews: impact.preserved_news,
            additionalInfo: impact.additional_info,
        };
    }
    catch {
        // 删除预览失败不阻塞
        deleteImpact.value = { affectedPositions: sources.value.find(x => x.id === id)?.display_positions?.length || 0, preservedNews: sources.value.find(x => x.id === id)?.total_news_count || 0 };
    }
    deleteTarget.value = { id, name: s.display_name };
    showDeleteDialog.value = true;
}
async function doDelete() {
    if (!deleteTarget.value)
        return;
    try {
        await deleteSource(deleteTarget.value.id);
        toast.success("信息源已删除，历史新闻已保留");
        showDeleteDialog.value = false;
        deleteTarget.value = null;
        await loadSources();
    }
    catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
    }
}
async function onSourceCreated(sourceId) {
    showCreateForm.value = false;
    toast.success("信息源已创建");
    await loadSources();
    router.push(`/sources/${sourceId}`);
}
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "source-library" },
});
/** @type {__VLS_StyleScopedClasses['source-library']} */ ;
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
    ...{ class: "toolbar" },
});
/** @type {__VLS_StyleScopedClasses['toolbar']} */ ;
if (!__VLS_ctx.showCreateForm) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(!__VLS_ctx.showCreateForm))
                    return;
                __VLS_ctx.showCreateForm = true;
                // @ts-ignore
                [errorText, errorText, showCreateForm, showCreateForm,];
            } },
        ...{ class: "btn primary" },
    });
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['primary']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "total-info muted" },
});
/** @type {__VLS_StyleScopedClasses['total-info']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
(__VLS_ctx.total);
if (__VLS_ctx.showCreateForm) {
    const __VLS_0 = SourceCreateForm;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        ...{ 'onCreated': {} },
        ...{ 'onCancel': {} },
        entryPoint: "library",
    }));
    const __VLS_2 = __VLS_1({
        ...{ 'onCreated': {} },
        ...{ 'onCancel': {} },
        entryPoint: "library",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    let __VLS_5;
    const __VLS_6 = ({ created: {} },
        { onCreated: (__VLS_ctx.onSourceCreated) });
    const __VLS_7 = ({ cancel: {} },
        { onCancel: (...[$event]) => {
                if (!(__VLS_ctx.showCreateForm))
                    return;
                __VLS_ctx.showCreateForm = false;
                // @ts-ignore
                [showCreateForm, showCreateForm, total, onSourceCreated,];
            } });
    var __VLS_3;
    var __VLS_4;
}
const __VLS_8 = SearchFilterBar;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent1(__VLS_8, new __VLS_8({
    ...{ 'onSearch': {} },
    ...{ 'onFilter': {} },
    spaces: (__VLS_ctx.spaces.map(s => ({ id: s.id, name: s.name }))),
}));
const __VLS_10 = __VLS_9({
    ...{ 'onSearch': {} },
    ...{ 'onFilter': {} },
    spaces: (__VLS_ctx.spaces.map(s => ({ id: s.id, name: s.name }))),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
let __VLS_13;
const __VLS_14 = ({ search: {} },
    { onSearch: (__VLS_ctx.onSearch) });
const __VLS_15 = ({ filter: {} },
    { onFilter: (__VLS_ctx.onFilter) });
var __VLS_11;
var __VLS_12;
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "loading-state" },
    });
    /** @type {__VLS_StyleScopedClasses['loading-state']} */ ;
}
else {
    const __VLS_16 = SourceTable;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent1(__VLS_16, new __VLS_16({
        ...{ 'onView': {} },
        ...{ 'onEdit': {} },
        ...{ 'onDelete': {} },
        sources: (__VLS_ctx.sources),
    }));
    const __VLS_18 = __VLS_17({
        ...{ 'onView': {} },
        ...{ 'onEdit': {} },
        ...{ 'onDelete': {} },
        sources: (__VLS_ctx.sources),
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    let __VLS_21;
    const __VLS_22 = ({ view: {} },
        { onView: (__VLS_ctx.viewSource) });
    const __VLS_23 = ({ edit: {} },
        { onEdit: (__VLS_ctx.editSource) });
    const __VLS_24 = ({ delete: {} },
        { onDelete: (__VLS_ctx.prepareDelete) });
    var __VLS_19;
    var __VLS_20;
}
const __VLS_25 = Pagination;
// @ts-ignore
const __VLS_26 = __VLS_asFunctionalComponent1(__VLS_25, new __VLS_25({
    ...{ 'onUpdate:currentPage': {} },
    ...{ 'onUpdate:pageSize': {} },
    currentPage: (__VLS_ctx.currentPage),
    totalItems: (__VLS_ctx.total),
    pageSize: (__VLS_ctx.pageSize),
}));
const __VLS_27 = __VLS_26({
    ...{ 'onUpdate:currentPage': {} },
    ...{ 'onUpdate:pageSize': {} },
    currentPage: (__VLS_ctx.currentPage),
    totalItems: (__VLS_ctx.total),
    pageSize: (__VLS_ctx.pageSize),
}, ...__VLS_functionalComponentArgsRest(__VLS_26));
let __VLS_30;
const __VLS_31 = ({ 'update:currentPage': {} },
    { 'onUpdate:currentPage': (__VLS_ctx.onPageChange) });
const __VLS_32 = ({ 'update:pageSize': {} },
    { 'onUpdate:pageSize': (__VLS_ctx.onPageSizeChange) });
var __VLS_28;
var __VLS_29;
if (__VLS_ctx.showDeleteDialog && __VLS_ctx.deleteTarget) {
    const __VLS_33 = DeleteConfirmDialog;
    // @ts-ignore
    const __VLS_34 = __VLS_asFunctionalComponent1(__VLS_33, new __VLS_33({
        ...{ 'onConfirm': {} },
        ...{ 'onCancel': {} },
        title: "删除信息源",
        targetName: (__VLS_ctx.deleteTarget.name),
        impact: (__VLS_ctx.deleteImpact),
        confirmName: (__VLS_ctx.deleteTarget.name),
    }));
    const __VLS_35 = __VLS_34({
        ...{ 'onConfirm': {} },
        ...{ 'onCancel': {} },
        title: "删除信息源",
        targetName: (__VLS_ctx.deleteTarget.name),
        impact: (__VLS_ctx.deleteImpact),
        confirmName: (__VLS_ctx.deleteTarget.name),
    }, ...__VLS_functionalComponentArgsRest(__VLS_34));
    let __VLS_38;
    const __VLS_39 = ({ confirm: {} },
        { onConfirm: (__VLS_ctx.doDelete) });
    const __VLS_40 = ({ cancel: {} },
        { onCancel: (...[$event]) => {
                if (!(__VLS_ctx.showDeleteDialog && __VLS_ctx.deleteTarget))
                    return;
                __VLS_ctx.showDeleteDialog = false;
                __VLS_ctx.deleteTarget = null;
                // @ts-ignore
                [total, spaces, onSearch, onFilter, loading, sources, viewSource, editSource, prepareDelete, currentPage, pageSize, onPageChange, onPageSizeChange, showDeleteDialog, showDeleteDialog, deleteTarget, deleteTarget, deleteTarget, deleteTarget, deleteImpact, doDelete,];
            } });
    var __VLS_36;
    var __VLS_37;
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
