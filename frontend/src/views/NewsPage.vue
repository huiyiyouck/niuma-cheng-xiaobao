<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { Search, ChevronDown, ChevronRight, ExternalLink, TrendingUp, FileText, Radio, FolderOpen } from "lucide-vue-next";
import { cn } from "@/lib/utils";
import StatCard from "@/components/ui/StatCard.vue";
import NewsDetailPanel from "@/components/news/NewsDetailPanel.vue";
import type { NewsItem } from "@/lib/mock";
import { listSpaces, listChannels, listNews, getNews, getSpaceStats } from "@/lib/api";

const spaces = ref<Array<{ id: string; name: string }>>([]);
const channels = ref<Array<{ id: string; name: string }>>([{ id: "all", name: "全部" }]);
const newsList = ref<NewsItem[]>([]);
const statCards = ref([
  { label: "今日新增", value: "-" as string | number, icon: TrendingUp },
  { label: "总新闻", value: "-" as string | number, icon: FileText },
  { label: "启用信息源", value: "-" as string | number, icon: Radio },
  { label: "频道数", value: "-" as string | number, icon: FolderOpen },
]);

const selectedSpace = ref("");
const selectedChannel = ref("all");
const searchQuery = ref("");
const minScore = ref(0);
const sortBy = ref<"published_desc" | "score_desc" | "score_asc">("published_desc");
const selectedNews = ref<NewsItem | null>(null);
const loading = ref(false);

// 仅按 minScore 前端过滤（后端无该参数）
const displayNews = computed(() => newsList.value.filter((n) => n.score >= minScore.value));

function fmtTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}天前`;
  return d.toLocaleDateString("zh-CN");
}
function flattenTags(n: any): string[] {
  const t = n.tags_v2;
  if (t && (t.domain?.length || t.event?.length || t.content_type?.length)) {
    return [...(t.domain || []), ...(t.event || []), ...(t.content_type || [])].slice(0, 4);
  }
  return Array.isArray(n.tags) ? n.tags.slice(0, 4) : [];
}
// 后端 ProcessedNews → 前端显示模型 NewsItem（v0.6 空字段降级到 v0.5 字段）
function mapNews(n: any): NewsItem {
  return {
    id: String(n.id),
    title: n.title ?? "",
    score: Number(n.score_total ?? n.importance_score ?? 0),
    source: {
      id: n.source?.id ?? n.source_id ?? "",
      name: n.source?.name ?? n.source_display_name ?? "未知来源",
      removed: !(n.source?.id ?? n.source_id),
    },
    channel: "",
    time: fmtTime(n.published_at),
    summary: n.summary ?? "",
    tags: flattenTags(n),
    entities: (n.tags_v2?.entity ?? n.entities ?? [])
      .map((e: any) => (typeof e === "string" ? e : (e?.name ?? "")))
      .filter(Boolean)
      .slice(0, 3),
    fullContent: n.analysis || (Array.isArray(n.bullets) ? n.bullets.join("\n\n") : undefined),
    originalUrl: undefined,
  };
}

async function loadNews() {
  if (!selectedSpace.value) return;
  loading.value = true;
  try {
    const r = await listNews(selectedSpace.value, {
      channelId: selectedChannel.value === "all" ? undefined : selectedChannel.value,
      sort: sortBy.value,
      q: searchQuery.value || undefined,
      limit: 30,
    });
    newsList.value = (r as any[]).map(mapNews);
  } catch {
    newsList.value = [];
  } finally {
    loading.value = false;
  }
}
async function loadStats() {
  if (!selectedSpace.value) return;
  try {
    const s: any = await getSpaceStats(selectedSpace.value);
    statCards.value = [
      { label: "今日新增", value: s.today_new ?? "-", icon: TrendingUp },
      { label: "总新闻", value: s.total_news ?? "-", icon: FileText },
      { label: "启用信息源", value: s.active_sources ?? "-", icon: Radio },
      { label: "频道数", value: s.channel_count ?? "-", icon: FolderOpen },
    ];
  } catch { /* 保持占位 */ }
}
async function loadChannels() {
  try {
    const chs = (await listChannels(selectedSpace.value)) as any[];
    channels.value = [{ id: "all", name: "全部" }, ...chs.map((c) => ({ id: c.id, name: c.name }))];
  } catch {
    channels.value = [{ id: "all", name: "全部" }];
  }
}

async function selectSpace(id: string) {
  selectedSpace.value = id;
  selectedChannel.value = "all";
  selectedNews.value = null;
  await Promise.all([loadChannels(), loadNews(), loadStats()]);
}
function selectChannel(id: string) {
  selectedChannel.value = id;
  loadNews();
}
async function openDetail(news: NewsItem) {
  if (selectedNews.value?.id === news.id) {
    selectedNews.value = null;
    return;
  }
  selectedNews.value = news; // 先用列表项占位
  try {
    const full = await getNews(news.id);
    selectedNews.value = mapNews(full);
  } catch { /* 用列表项数据 */ }
}

const debouncedSearch = useDebounceFn(loadNews, 400);
watch(searchQuery, () => debouncedSearch());
watch(sortBy, loadNews);

onMounted(async () => {
  try {
    spaces.value = (await listSpaces()) as any[];
    if (spaces.value.length) await selectSpace(spaces.value[0].id);
  } catch { /* 后端不可达时空列表 */ }
});
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- 冻结顶部区 -->
    <div class="shrink-0 border-b border-border px-6 pt-5 pb-0">
      <div class="pb-4">
        <div class="grid grid-cols-4 gap-3">
          <StatCard v-for="stat in statCards" :key="stat.label" :label="stat.label" :value="stat.value" :icon="stat.icon" />
        </div>
      </div>

      <div class="border-t border-border pt-3 pb-2 flex gap-2 flex-wrap">
        <button
          v-for="space in spaces"
          :key="space.id"
          @click="selectSpace(space.id)"
          :class="cn(
            'px-4 py-1.5 rounded-full text-sm transition-colors',
            selectedSpace === space.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-accent',
          )"
        >
          {{ space.name }}
        </button>
      </div>

      <div class="pb-3 flex gap-1.5 flex-wrap">
        <button
          v-for="channel in channels"
          :key="channel.id"
          @click="selectChannel(channel.id)"
          :class="cn(
            'px-3 py-1 rounded-full text-sm transition-colors',
            selectedChannel === channel.id ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:bg-accent/50',
          )"
        >
          {{ channel.name }}
        </button>
      </div>

      <div class="border-t border-border py-3 bg-muted/20">
        <div class="flex items-center gap-3">
          <div class="flex-1 relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input v-model="searchQuery" type="text" placeholder="搜索新闻..." class="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm text-muted-foreground whitespace-nowrap">评分 ≥</span>
            <input v-model.number="minScore" type="range" min="0" max="10" step="0.5" class="w-24 h-1 accent-primary cursor-pointer" />
            <span class="text-sm font-medium w-6 text-right tabular-nums">{{ minScore }}</span>
          </div>
          <div class="relative">
            <select v-model="sortBy" class="appearance-none inline-flex items-center gap-2 pl-3 pr-8 py-2 bg-background border border-border rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring text-sm">
              <option value="published_desc">按时间</option>
              <option value="score_desc">评分高→低</option>
              <option value="score_asc">评分低→高</option>
            </select>
            <ChevronDown class="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>

    <!-- 列表 + 详情面板 -->
    <div class="flex-1 flex overflow-hidden">
      <div class="flex-1 overflow-auto py-5 px-6">
        <div class="max-w-[800px] mx-auto space-y-3">
          <div v-if="loading" class="text-center text-sm text-muted-foreground py-12">加载中...</div>
          <div v-else-if="displayNews.length === 0" class="text-center text-sm text-muted-foreground py-12">暂无新闻</div>
          <div
            v-for="news in displayNews"
            :key="news.id"
            @click="openDetail(news)"
            :class="cn(
              'bg-card border rounded-lg p-4 cursor-pointer transition-all',
              selectedNews?.id === news.id ? 'border-primary/50 shadow-md ring-1 ring-primary/20' : 'border-border hover:shadow-sm',
            )"
          >
            <div class="flex items-start gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-start gap-3 mb-2">
                  <h3 class="flex-1 font-medium leading-snug">{{ news.title }}</h3>
                  <div class="flex items-center gap-1.5 shrink-0">
                    <span
                      v-if="news.score > 0"
                      :class="cn(
                        'px-2 py-0.5 rounded text-xs font-medium',
                        news.score >= 8 ? 'bg-green-100 text-green-800' : news.score >= 6 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800',
                      )"
                    >
                      {{ news.score }}
                    </span>
                    <ChevronRight :class="cn('h-4 w-4 text-muted-foreground transition-transform', selectedNews?.id === news.id && 'rotate-90 text-primary')" />
                  </div>
                </div>
                <div class="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <span v-if="news.source.removed" class="opacity-50">来源已移除</span>
                  <RouterLink v-else :to="`/sources/${news.source.id}`" @click.stop class="hover:text-foreground hover:underline inline-flex items-center gap-1">
                    {{ news.source.name }}<ExternalLink class="h-3 w-3" />
                  </RouterLink>
                  <template v-if="news.time"><span>·</span><span>{{ news.time }}</span></template>
                </div>
                <p class="text-sm text-muted-foreground mb-3 line-clamp-2">{{ news.summary }}</p>
                <div v-if="news.tags.length || news.entities.length" class="flex flex-wrap gap-1.5">
                  <span v-for="tag in news.tags" :key="tag" class="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded">{{ tag }}</span>
                  <span v-for="entity in news.entities" :key="entity" class="px-2 py-0.5 bg-accent text-accent-foreground text-xs rounded">{{ entity }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <NewsDetailPanel :news="selectedNews" @close="selectedNews = null" />
    </div>
  </div>
</template>
