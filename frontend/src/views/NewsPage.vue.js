/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, onMounted, ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { listNews, listSpaces, listChannels, getSpaceStats, getGlobalStats } from "@/lib/api";
import StatsCards from "@/components/StatsCards.vue";
import SpacePills from "@/components/SpacePills.vue";
import ChannelPills from "@/components/ChannelPills.vue";
import NewsListItem from "@/components/NewsListItem.vue";
import NewsDetailPanel from "@/components/NewsDetailPanel.vue";
const loading = ref(false);
const errorText = ref(null);
const spaces = ref([]);
const channels = ref([]);
const filterSpaceId = ref(null);
// v0.5: 频道使用两层 mini Pill，不再使用 sub_channel_ids
const filterChannelId = ref(null); // null = 全部
const minScore = ref(0);
const sortBy = ref("published_desc");
const searchQuery = ref("");
const items = ref([]);
const limit = 30;
const offset = ref(0);
const canLoadMore = ref(true);
const stats = ref({ total_news: -1, today_new: -1, active_sources: -1, channel_count: -1 });
const detailItem = ref(null);
const filteredItems = computed(() => {
    let result = items.value;
    if (minScore.value > 0) {
        result = result.filter(i => i.importance_score >= minScore.value);
    }
    return result;
});
async function refreshSpaces() {
    try {
        spaces.value = await listSpaces();
    }
    catch (e) {
        errorText.value = e instanceof Error ? e.message : String(e);
        return;
    }
    if (!filterSpaceId.value && spaces.value.length > 0) {
        filterSpaceId.value = spaces.value[0].id;
    }
}
async function refreshStats() {
    try {
        if (filterSpaceId.value) {
            stats.value = await getSpaceStats(filterSpaceId.value);
        }
        else {
            const g = await getGlobalStats();
            stats.value = { total_news: 0, today_new: g.today_new, active_sources: g.active_sources, channel_count: g.active_spaces };
        }
    }
    catch { /* 统计加载失败不影响新闻列表 */ }
}
async function refreshChannels() {
    if (!filterSpaceId.value) {
        channels.value = [];
        return;
    }
    try {
        channels.value = await listChannels(filterSpaceId.value);
    }
    catch {
        channels.value = [];
    }
}
function buildNewsParams(offsetVal) {
    return {
        limit,
        offset: offsetVal,
        sort: sortBy.value,
        channelId: filterChannelId.value || undefined,
        q: searchQuery.value || undefined,
    };
}
async function refreshNews() {
    if (!filterSpaceId.value)
        return;
    loading.value = true;
    errorText.value = null;
    offset.value = 0;
    try {
        const page = await listNews(filterSpaceId.value, buildNewsParams(0));
        items.value = page;
        canLoadMore.value = page.length >= limit;
    }
    catch (e) {
        errorText.value = e instanceof Error ? e.message : String(e);
    }
    finally {
        loading.value = false;
    }
}
async function loadMore() {
    if (!filterSpaceId.value || !canLoadMore.value)
        return;
    loading.value = true;
    const nextOffset = offset.value + limit;
    try {
        const page = await listNews(filterSpaceId.value, buildNewsParams(nextOffset));
        items.value = items.value.concat(page);
        offset.value = nextOffset;
        canLoadMore.value = page.length >= limit;
    }
    catch (e) {
        errorText.value = e instanceof Error ? e.message : String(e);
    }
    finally {
        loading.value = false;
    }
}
function openDetail(item) {
    detailItem.value = item;
}
// 防抖处理频道切换和排序变更
const debouncedRefreshNews = useDebounceFn(refreshNews, 300);
watch(filterSpaceId, () => {
    filterChannelId.value = null;
    refreshNews();
    refreshStats();
    refreshChannels();
});
watch(sortBy, () => debouncedRefreshNews());
watch(filterChannelId, () => debouncedRefreshNews());
watch(searchQuery, () => refreshNews());
async function onSpaceSelect(id) {
    filterSpaceId.value = id;
}
async function onChannelSelect(id) {
    filterChannelId.value = id;
}
onMounted(async () => {
    await refreshSpaces();
    await refreshNews();
    await refreshStats();
    await refreshChannels();
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['score-filter']} */ ;
/** @type {__VLS_StyleScopedClasses['search-input']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "page" },
});
/** @type {__VLS_StyleScopedClasses['page']} */ ;
const __VLS_0 = StatsCards;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    stats: (__VLS_ctx.stats),
}));
const __VLS_2 = __VLS_1({
    stats: (__VLS_ctx.stats),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const __VLS_5 = SpacePills;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
    ...{ 'onSelect': {} },
    ...{ 'onChanged': {} },
    spaces: (__VLS_ctx.spaces),
    selectedId: (__VLS_ctx.filterSpaceId),
    mode: "mini",
}));
const __VLS_7 = __VLS_6({
    ...{ 'onSelect': {} },
    ...{ 'onChanged': {} },
    spaces: (__VLS_ctx.spaces),
    selectedId: (__VLS_ctx.filterSpaceId),
    mode: "mini",
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
let __VLS_10;
const __VLS_11 = ({ select: {} },
    { onSelect: (__VLS_ctx.onSpaceSelect) });
const __VLS_12 = ({ changed: {} },
    { onChanged: (...[$event]) => {
            __VLS_ctx.refreshSpaces();
            // @ts-ignore
            [stats, spaces, filterSpaceId, onSpaceSelect, refreshSpaces,];
        } });
var __VLS_8;
var __VLS_9;
if (__VLS_ctx.channels.length > 0) {
    const __VLS_13 = ChannelPills;
    // @ts-ignore
    const __VLS_14 = __VLS_asFunctionalComponent1(__VLS_13, new __VLS_13({
        ...{ 'onSelect': {} },
        ...{ 'onChanged': {} },
        channels: (__VLS_ctx.channels),
        selectedId: (__VLS_ctx.filterChannelId),
        mode: "mini",
    }));
    const __VLS_15 = __VLS_14({
        ...{ 'onSelect': {} },
        ...{ 'onChanged': {} },
        channels: (__VLS_ctx.channels),
        selectedId: (__VLS_ctx.filterChannelId),
        mode: "mini",
    }, ...__VLS_functionalComponentArgsRest(__VLS_14));
    let __VLS_18;
    const __VLS_19 = ({ select: {} },
        { onSelect: (__VLS_ctx.onChannelSelect) });
    const __VLS_20 = ({ changed: {} },
        { onChanged: (...[$event]) => {
                if (!(__VLS_ctx.channels.length > 0))
                    return;
                __VLS_ctx.refreshChannels();
                // @ts-ignore
                [channels, channels, filterChannelId, onChannelSelect, refreshChannels,];
            } });
    var __VLS_16;
    var __VLS_17;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "filter-right" },
});
/** @type {__VLS_StyleScopedClasses['filter-right']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ class: "score-filter" },
});
/** @type {__VLS_StyleScopedClasses['score-filter']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.minScore.toFixed(1));
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    ...{ onInput: (...[$event]) => {
            __VLS_ctx.minScore = parseFloat($event.target.value);
            // @ts-ignore
            [minScore, minScore,];
        } },
    type: "range",
    min: "0",
    max: "10",
    step: "0.5",
    value: (__VLS_ctx.minScore),
});
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
    ...{ onChange: (...[$event]) => {
            __VLS_ctx.sortBy = $event.target.value;
            // @ts-ignore
            [minScore, sortBy,];
        } },
    ...{ class: "sort-select" },
    value: (__VLS_ctx.sortBy),
});
/** @type {__VLS_StyleScopedClasses['sort-select']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "published_desc",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "score_desc",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "score_asc",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    ...{ onKeydown: (...[$event]) => {
            __VLS_ctx.refreshNews();
            // @ts-ignore
            [sortBy, refreshNews,];
        } },
    ...{ class: "search-input" },
    placeholder: "搜索新闻…",
});
(__VLS_ctx.searchQuery);
/** @type {__VLS_StyleScopedClasses['search-input']} */ ;
if (__VLS_ctx.errorText) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "error-bar" },
    });
    /** @type {__VLS_StyleScopedClasses['error-bar']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.errorText);
}
if (__VLS_ctx.loading && __VLS_ctx.items.length === 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "skeleton-list" },
    });
    /** @type {__VLS_StyleScopedClasses['skeleton-list']} */ ;
    for (const [i] of __VLS_vFor((3))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (i),
            ...{ class: "skeleton-card" },
        });
        /** @type {__VLS_StyleScopedClasses['skeleton-card']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "sk-line sk-title" },
        });
        /** @type {__VLS_StyleScopedClasses['sk-line']} */ ;
        /** @type {__VLS_StyleScopedClasses['sk-title']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "sk-line sk-body" },
        });
        /** @type {__VLS_StyleScopedClasses['sk-line']} */ ;
        /** @type {__VLS_StyleScopedClasses['sk-body']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "sk-line sk-body sk-short" },
        });
        /** @type {__VLS_StyleScopedClasses['sk-line']} */ ;
        /** @type {__VLS_StyleScopedClasses['sk-body']} */ ;
        /** @type {__VLS_StyleScopedClasses['sk-short']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "sk-tags" },
        });
        /** @type {__VLS_StyleScopedClasses['sk-tags']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "sk-tag" },
        });
        /** @type {__VLS_StyleScopedClasses['sk-tag']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "sk-tag" },
        });
        /** @type {__VLS_StyleScopedClasses['sk-tag']} */ ;
        // @ts-ignore
        [searchQuery, errorText, errorText, loading, items,];
    }
}
if (__VLS_ctx.items.length === 0 && !__VLS_ctx.loading) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "empty-state" },
    });
    /** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.br)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
}
if (__VLS_ctx.filteredItems.length > 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "list" },
    });
    /** @type {__VLS_StyleScopedClasses['list']} */ ;
    for (const [item] of __VLS_vFor((__VLS_ctx.filteredItems))) {
        const __VLS_21 = NewsListItem;
        // @ts-ignore
        const __VLS_22 = __VLS_asFunctionalComponent1(__VLS_21, new __VLS_21({
            ...{ 'onClick': {} },
            key: (item.id),
            item: (item),
        }));
        const __VLS_23 = __VLS_22({
            ...{ 'onClick': {} },
            key: (item.id),
            item: (item),
        }, ...__VLS_functionalComponentArgsRest(__VLS_22));
        let __VLS_26;
        const __VLS_27 = ({ click: {} },
            { onClick: (...[$event]) => {
                    if (!(__VLS_ctx.filteredItems.length > 0))
                        return;
                    __VLS_ctx.openDetail(item);
                    // @ts-ignore
                    [loading, items, filteredItems, filteredItems, openDetail,];
                } });
        var __VLS_24;
        var __VLS_25;
        // @ts-ignore
        [];
    }
}
if (__VLS_ctx.items.length > 0 && __VLS_ctx.filteredItems.length === 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "empty-state" },
    });
    /** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.br)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
}
if (__VLS_ctx.items.length > 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "more" },
    });
    /** @type {__VLS_StyleScopedClasses['more']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.loadMore) },
        ...{ class: "btn load-more" },
        disabled: (__VLS_ctx.loading || !__VLS_ctx.canLoadMore),
    });
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['load-more']} */ ;
    (__VLS_ctx.canLoadMore ? '加载更多' : '没有更多了');
}
const __VLS_28 = NewsDetailPanel;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent1(__VLS_28, new __VLS_28({
    ...{ 'onClose': {} },
    item: (__VLS_ctx.detailItem),
}));
const __VLS_30 = __VLS_29({
    ...{ 'onClose': {} },
    item: (__VLS_ctx.detailItem),
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
let __VLS_33;
const __VLS_34 = ({ close: {} },
    { onClose: (...[$event]) => {
            __VLS_ctx.detailItem = null;
            // @ts-ignore
            [loading, items, items, filteredItems, loadMore, canLoadMore, canLoadMore, detailItem, detailItem,];
        } });
var __VLS_31;
var __VLS_32;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
