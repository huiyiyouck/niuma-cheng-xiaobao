import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  Search, TrendingUp, FileText, Radio, FolderOpen,
  ExternalLink, X, Tag, Building2, Clock, BarChart2, ChevronRight,
} from "lucide-react";
import { cn } from "../lib/utils";
import * as Slider from "@radix-ui/react-slider";
import * as Select from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";
import { StatCard } from "../components/ui/StatCard";
import { getSpaceStats, listSpaces, listChannels, listNews, getNews } from "../lib/api";

type NewsItem = {
  id: string;
  title: string;
  score: number;
  source: { id: string; name: string; removed: boolean };
  channel: string;
  time: string;
  summary: string;
  tags: string[];
  entities: string[];
  fullContent?: string;
  originalUrl?: string;
};

const STAT_ICONS = [TrendingUp, FileText, Radio, FolderOpen];

function fmtAgo(iso?: string): string {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
}

// 后端 news → 前端 NewsItem（字段名做兼容兜底）
function mapNews(n: any): NewsItem {
  const sourceId = n.source?.id ?? n.source_id ?? null;
  const sourceName = n.source?.name ?? n.source_display_name ?? "未知来源";
  // tags_v2 后端可能是 {} 对象（v0.6 空字段），优先用数组形态，否则回退到 v0.5 tags 数组
  const tags = Array.isArray(n.tags_v2) ? n.tags_v2 : (Array.isArray(n.tags) ? n.tags : []);
  // entities 后端是 [{name, type}, ...] 对象数组，规范化为字符串数组避免 React 渲染对象崩溃
  const rawEntities = Array.isArray(n.entities) ? n.entities : [];
  const entities = rawEntities
    .map((e: any) => (typeof e === "string" ? e : (e?.name ?? "")))
    .filter((s: string) => !!s);
  return {
    id: String(n.id),
    title: n.title ?? "",
    score: Number(n.score_total ?? n.importance_score ?? 0),
    source: { id: sourceId ? String(sourceId) : "removed", name: sourceName, removed: !sourceId },
    channel: n.channel_name ?? "",
    time: fmtAgo(n.published_at ?? n.created_at),
    summary: n.summary ?? "",
    tags,
    entities,
    fullContent: n.content ?? n.full_content ?? n.body ?? undefined,
    originalUrl: n.url ?? n.original_url ?? undefined,
  };
}

// Centered container used by the frozen top sections
function CenterWrap({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("max-w-[800px] mx-auto w-full", className)}>
      {children}
    </div>
  );
}

export function NewsPage() {
  const [spaces, setSpaces] = useState<Array<{ id: string; name: string }>>([{ id: "all", name: "全部" }]);
  const [channels, setChannels] = useState<Array<{ id: string; name: string }>>([{ id: "all", name: "全部" }]);
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [stats, setStats] = useState<Array<{ label: string; value: string }>>([
    { label: "今日新增", value: "-" }, { label: "总新闻", value: "-" },
    { label: "启用信息源", value: "-" }, { label: "频道数", value: "-" },
  ]);

  const [selectedSpace, setSelectedSpace] = useState("");
  const [selectedChannel, setSelectedChannel] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [minScore, setMinScore] = useState([0]);
  const [sortBy, setSortBy] = useState("published_desc");
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  // 初次加载：空间列表
  useEffect(() => {
    (async () => {
      try {
        const sp: any[] = await listSpaces();
        const list = (sp ?? []).map((s) => ({ id: String(s.id), name: s.name }));
        setSpaces(list);
        if (list.length) setSelectedSpace(list[0].id);
      } catch { /* ignore */ }
    })();
  }, []);

  // 切空间：加载该空间的统计 + 频道
  useEffect(() => {
    if (!selectedSpace) return;
    setSelectedChannel("all");
    (async () => {
      try {
        const g: any = await getSpaceStats(selectedSpace);
        setStats([
          { label: "今日新增", value: String(g.today_new ?? 0) },
          { label: "总新闻", value: String(g.total_news ?? 0) },
          { label: "启用信息源", value: String(g.active_sources ?? 0) },
          { label: "频道数", value: String(g.channel_count ?? 0) },
        ]);
      } catch { /* ignore */ }
      try {
        const ch: any[] = await listChannels(selectedSpace);
        setChannels([{ id: "all", name: "全部" }, ...(ch ?? []).map((c) => ({ id: String(c.id), name: c.name }))]);
      } catch { setChannels([{ id: "all", name: "全部" }]); }
    })();
  }, [selectedSpace]);

  // 加载新闻（空间/频道/搜索/排序变化时）
  useEffect(() => {
    if (!selectedSpace) return;
    (async () => {
      try {
        const items: any[] = await listNews(selectedSpace, {
          channel_id: selectedChannel === "all" ? undefined : selectedChannel,
          search: searchQuery || undefined,
          sort: sortBy,
          page_size: 50,
        });
        setNewsList((items ?? []).map(mapNews));
      } catch { setNewsList([]); }
    })();
  }, [selectedSpace, selectedChannel, searchQuery, sortBy]);

  // 点开详情：用列表项数据，并异步补全完整正文
  async function openNews(news: NewsItem) {
    if (news.id === selectedNews?.id) { setSelectedNews(null); return; }
    setSelectedNews(news);
    try {
      const full: any = await getNews(news.id);
      setSelectedNews({ ...news, ...mapNews(full) });
    } catch { /* 保留列表项数据 */ }
  }

  const visibleNews = newsList.filter((n) => n.score >= minScore[0]);

  return (
    <div className="h-full flex flex-col">

      {/* ── Frozen top section ───────────────────────────── */}
      <div className="shrink-0 border-b border-border px-6 pt-5 pb-0">
        {/* Stats */}
        <div className="pb-4">
          <div className="grid grid-cols-4 gap-3">
            {stats.map((stat, i) => (
              <StatCard key={stat.label} label={stat.label} value={stat.value} icon={STAT_ICONS[i]} />
            ))}
          </div>
        </div>

        {/* Space tabs */}
        <div className="border-t border-border pt-3 pb-2 flex gap-2">
          {spaces.map((space) => (
            <button
              key={space.id}
              onClick={() => { setSelectedSpace(space.id); setSelectedChannel("all"); }}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm transition-colors",
                selectedSpace === space.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              )}
            >
              {space.name}
            </button>
          ))}
        </div>

        {/* Channel tabs */}
        <div className="pb-3 flex gap-1.5 flex-wrap">
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => setSelectedChannel(channel.id)}
              className={cn(
                "px-3 py-1 rounded-full text-sm transition-colors",
                selectedChannel === channel.id
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50"
              )}
            >
              {channel.name}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="border-t border-border py-3 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="搜索新闻..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">评分 ≥</span>
              <Slider.Root
                className="relative flex items-center select-none touch-none w-24 h-5"
                value={minScore}
                onValueChange={setMinScore}
                max={10}
                step={0.5}
              >
                <Slider.Track className="bg-muted relative grow rounded-full h-1">
                  <Slider.Range className="absolute bg-primary rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb className="block w-4 h-4 bg-background border-2 border-primary rounded-full hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring" />
              </Slider.Root>
              <span className="text-sm font-medium w-6 text-right tabular-nums">{minScore[0]}</span>
            </div>
            <Select.Root value={sortBy} onValueChange={setSortBy}>
              <Select.Trigger className="inline-flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring text-sm whitespace-nowrap">
                <Select.Value />
                <ChevronDown className="h-3.5 w-3.5" />
              </Select.Trigger>
              <Select.Portal>
                <Select.Content className="bg-popover border border-border rounded-md shadow-lg overflow-hidden z-50">
                  <Select.Viewport>
                    {[["published_desc", "按时间"], ["score_desc", "按评分"]].map(([v, label]) => (
                      <Select.Item key={v} value={v} className="px-4 py-2 hover:bg-accent cursor-pointer focus:bg-accent outline-none text-sm">
                        <Select.ItemText>{label}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>
        </div>
      </div>

      {/* ── Scrollable news list + inline detail panel ───── */}
      <div className="flex-1 flex overflow-hidden">

        {/* News list — scrolls, content centered */}
        <div className="flex-1 overflow-auto py-5 px-6">
          <div className="max-w-[800px] mx-auto space-y-3">
            {visibleNews.map((news) => (
              <div
                key={news.id}
                onClick={() => openNews(news)}
                className={cn(
                  "bg-card border rounded-lg p-4 cursor-pointer transition-all",
                  selectedNews?.id === news.id
                    ? "border-primary/50 shadow-md ring-1 ring-primary/20"
                    : "border-border hover:shadow-sm"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-2">
                      <h3 className="flex-1 font-medium leading-snug">{news.title}</h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-xs font-medium",
                          news.score >= 8 ? "bg-green-100 text-green-800" :
                          news.score >= 6 ? "bg-blue-100 text-blue-800" :
                          "bg-gray-100 text-gray-800"
                        )}>
                          {news.score}
                        </span>
                        <ChevronRight className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform",
                          selectedNews?.id === news.id && "rotate-90 text-primary"
                        )} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      {news.source.removed ? (
                        <span className="opacity-50">来源已移除</span>
                      ) : (
                        <Link
                          to={`/sources/${news.source.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:text-foreground hover:underline inline-flex items-center gap-1"
                        >
                          {news.source.name}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                      <span>·</span>
                      <span>{news.channel}</span>
                      <span>·</span>
                      <span>{news.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{news.summary}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {news.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded">{tag}</span>
                      ))}
                      {news.entities.map((entity) => (
                        <span key={entity} className="px-2 py-0.5 bg-accent text-accent-foreground text-xs rounded">{entity}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel — 嵌入式右滑面板：与新闻列表齐平，宽度 0 ↔ 420px */}
        <div className={cn(
          "shrink-0 overflow-hidden border-l border-border bg-background flex flex-col shadow-xl",
          "transition-[width] duration-300 ease-in-out",
          selectedNews ? "w-[420px]" : "w-0"
        )}>
          <div className={cn(
            "w-[420px] h-full min-h-0 flex flex-col",
            "transition-transform duration-300 ease-in-out",
            selectedNews ? "translate-x-0" : "translate-x-full"
          )}>
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-border shrink-0">
              <div className="flex-1 pr-4">
                {selectedNews && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium",
                      selectedNews.score >= 8 ? "bg-green-100 text-green-800" :
                      selectedNews.score >= 6 ? "bg-blue-100 text-blue-800" :
                      "bg-gray-100 text-gray-800"
                    )}>
                      评分 {selectedNews.score}
                    </span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {selectedNews.channel}
                    </span>
                  </div>
                )}
                <h2 className="font-semibold leading-snug">{selectedNews?.title ?? ""}</h2>
              </div>
              <button
                onClick={() => setSelectedNews(null)}
                className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto p-5 space-y-5">
              {selectedNews && (
                <>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{selectedNews.time}</span>
                    <span className="flex items-center gap-1.5"><BarChart2 className="h-3.5 w-3.5" />评分 {selectedNews.score}</span>
                    {!selectedNews.source.removed ? (
                      <Link to={`/sources/${selectedNews.source.id}`} className="flex items-center gap-1.5 hover:text-foreground hover:underline">
                        <Building2 className="h-3.5 w-3.5" />{selectedNews.source.name}
                      </Link>
                    ) : (
                      <span className="flex items-center gap-1.5 opacity-50"><Building2 className="h-3.5 w-3.5" />来源已移除</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">摘要</h3>
                    <p className="text-sm leading-relaxed text-foreground/80">{selectedNews.summary}</p>
                  </div>
                  {selectedNews.fullContent && (
                    <div>
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">正文</h3>
                      <div className="text-sm leading-relaxed text-foreground/80 space-y-3">
                        {selectedNews.fullContent.split("\n\n").map((para, i) => <p key={i}>{para}</p>)}
                      </div>
                    </div>
                  )}
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5" />标签与实体
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedNews.tags.map((tag) => (
                        <span key={tag} className="px-2.5 py-1 bg-secondary text-secondary-foreground text-xs rounded-md">{tag}</span>
                      ))}
                      {selectedNews.entities.map((entity) => (
                        <span key={entity} className="px-2.5 py-1 bg-accent text-accent-foreground text-xs rounded-md font-medium">{entity}</span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            {selectedNews?.originalUrl && (
              <div className="p-5 border-t border-border shrink-0">
                <a
                  href={selectedNews.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                  <ExternalLink className="h-4 w-4" />查看原文
                </a>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
