import { useState, useEffect } from "react";
import { Link, useSearchParams, useOutletContext } from "react-router";
import {
  Search, Inbox, Loader2,
  ExternalLink, X, Tag, Building2, Clock, BarChart2, ChevronRight,
} from "lucide-react";
import { cn } from "../lib/utils";
import * as Slider from "@radix-ui/react-slider";
import * as Select from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";
import { listChannels, listNews, getNews } from "../lib/api";

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

// 评分徽章配色：四档，低分用红色警示，避免灰底与卡片背景混淆
function scoreBadgeCls(score: number): string {
  if (score >= 8) return "bg-green-100 text-green-800";
  if (score >= 6) return "bg-blue-100 text-blue-800";
  if (score >= 4) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

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
  // 空间列表由 RootLayout 加载并经 Outlet context 下发；当前空间由左栏导航通过 URL `?space=` 驱动
  const { spaces, spacesLoading } = useOutletContext<{ spaces: Array<{ id: string; name: string }>; spacesLoading: boolean }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedSpace = searchParams.get("space") || spaces[0]?.id || "";

  const [channels, setChannels] = useState<Array<{ id: string; name: string }>>([{ id: "all", name: "全部" }]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedChannel, setSelectedChannel] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [minScore, setMinScore] = useState([0]);
  const [sortBy, setSortBy] = useState("published_desc");
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  // 切空间：重置频道并加载该空间的频道（统计已下放到左栏）
  useEffect(() => {
    if (!selectedSpace) return;
    setSelectedChannel("all");
    setChannelsLoading(true);
    (async () => {
      try {
        const ch: any[] = await listChannels(selectedSpace);
        setChannels([{ id: "all", name: "全部" }, ...(ch ?? []).map((c) => ({ id: String(c.id), name: c.name }))]);
      } catch { setChannels([{ id: "all", name: "全部" }]); }
      finally { setChannelsLoading(false); }
    })();
  }, [selectedSpace]);

  // 加载新闻（空间/频道/搜索/排序变化时）
  useEffect(() => {
    if (!selectedSpace) return;
    setLoading(true);
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
      finally { setLoading(false); }
    })();
  }, [selectedSpace, selectedChannel, searchQuery, sortBy]);

  // 点开详情：用列表项数据，并异步补全完整正文
  async function openNews(news: NewsItem) {
    if (news.id === selectedNews?.id) { setSelectedNews(null); return; }
    setSelectedNews(news);
    try {
      const full: any = await getNews(news.id);
      // 仅当用户仍停留在这条新闻时才回写，避免关闭/切换后异步补全又把面板弹回来
      setSelectedNews((cur) => (cur?.id === news.id ? { ...news, ...mapNews(full) } : cur));
    } catch { /* 保留列表项数据 */ }
  }

  // ESC 关闭详情面板
  useEffect(() => {
    if (!selectedNews) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSelectedNews(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedNews]);

  const visibleNews = newsList.filter((n) => n.score >= minScore[0]);

  return (
    <div className="h-full flex flex-col">

      {/* ── Frozen top section ───────────────────────────── */}
      <div className="shrink-0 border-b border-border px-6 pt-4 pb-0">
        {/* 空间 + 频道 同一行（数据少，合并紧凑不空旷） */}
        <div className="flex items-center gap-3 pb-3 flex-wrap">
          {spacesLoading ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground py-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />加载空间…
            </span>
          ) : (
          <>
          {/* 空间分段控件 */}
          <div className="inline-flex gap-1 p-1 bg-muted rounded-lg shrink-0">
            {spaces.map((space) => (
              <button
                key={space.id}
                onClick={() => setSearchParams({ space: space.id })}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                  selectedSpace === space.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {space.name}
              </button>
            ))}
          </div>
          <div className="h-5 w-px bg-border shrink-0" />
          {/* 频道描边 chip */}
          <div className="flex gap-1.5 flex-wrap">
            {channelsLoading && (
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground py-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />加载频道…
              </span>
            )}
            {!channelsLoading && channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => setSelectedChannel(channel.id)}
              className={cn(
                "px-3 py-1 rounded-full text-sm border transition-colors",
                selectedChannel === channel.id
                  ? "bg-primary text-primary-foreground border-primary font-medium"
                  : "bg-transparent text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
              )}
            >
              {channel.name}
            </button>
            ))}
          </div>
          </>
          )}
        </div>

        {/* Filters */}
        <div className="border-t border-border py-3">
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

      {/* ── 列表 + 覆盖式详情抽屉 ───── */}
      <div className="flex-1 overflow-hidden relative">

        {/* News list — 详情打开时右侧让出抽屉空间，列表居中、可滚动/点击切换 */}
        <div className={cn(
          "h-full overflow-auto py-5 px-6 transition-[margin] duration-300 ease-in-out",
          selectedNews ? "mr-[440px]" : ""
        )}>
          <div className="max-w-[800px] mx-auto space-y-3">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-lg p-4 animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                  <div className="h-3 bg-muted rounded w-1/2 mb-3" />
                  <div className="h-3 bg-muted rounded w-full mb-2" />
                  <div className="flex gap-2"><div className="h-5 w-12 bg-muted rounded" /><div className="h-5 w-12 bg-muted rounded" /></div>
                </div>
              ))
            ) : visibleNews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Inbox className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">该频道暂无新闻</p>
              </div>
            ) : (
              visibleNews.map((news) => (
              <div
                key={news.id}
                onClick={() => openNews(news)}
                className={cn(
                  "bg-card border rounded-xl p-5 cursor-pointer transition-all",
                  selectedNews?.id === news.id
                    ? "border-primary/50 shadow-md ring-1 ring-primary/20"
                    : "border-border hover:border-primary/30 hover:shadow-md"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-2">
                      <h3 className="flex-1 font-semibold leading-snug">{news.title}</h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-xs font-medium",
                          scoreBadgeCls(news.score)
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
                        <span key={entity} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded font-medium">{entity}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              ))
            )}
          </div>
        </div>

        {/* Detail panel — 右滑抽屉：列表让位不被遮挡，ESC/X 关闭，列表仍可滚动切换 */}
        <div className={cn(
          "absolute top-0 right-0 h-full w-[440px] max-w-full bg-background border-l border-border shadow-2xl flex flex-col",
          "transition-transform duration-300 ease-in-out",
          selectedNews ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="w-full h-full min-h-0 flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-border shrink-0">
              <div className="flex-1 pr-4">
                {selectedNews && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium",
                      scoreBadgeCls(selectedNews.score)
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
