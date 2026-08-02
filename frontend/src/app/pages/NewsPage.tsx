import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Link, useSearchParams, useOutletContext } from "react-router";
import {
  Search, Inbox, Loader2, AlertTriangle, RefreshCw,
  ExternalLink, X, Tag, Building2, Clock, BarChart2, ChevronRight,
} from "lucide-react";
import { cn } from "../lib/utils";
import { tagColor } from "../lib/tagColor";
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
  // v0.6.1 展示分层（PRD R2 §5.3-§5.6）
  processType: "direct" | "ai" | null;
  l1Status: string | null;
  l1Error: string | null;
  scoreDimensions: Record<string, number> | null;
  analysis: string | null;
  context: string[];
};

// v0.6.1 展示状态：direct 直显 / rich 富展示（AI 已解析）/ 其余为基础展示态
type DisplayState = "direct" | "rich" | "pending" | "processing" | "failed_final";

function displayState(n: NewsItem): DisplayState {
  if (n.processType === "direct") return "direct";
  switch (n.l1Status) {
    case "completed": return "rich";
    case "final_failed": return "failed_final";
    case "processing":
    // #A-R3-2（PM 裁定方案①）：retryable_failed 仍在待重试队列，对用户呈现「解析中」
    case "retryable_failed": return "processing";
    case "not_started":
    case "queued": return "pending";
    // #A-R3-7 白名单兜底：未知/缺失状态按待解析处理，避免异常数据误显富展示；
    // 无状态字段的旧数据（process_type 为 null 的 v0.5/v0.6 存量）保持富展示
    default: return n.l1Status == null && n.processType == null ? "rich" : "pending";
  }
}

// 基础展示态（待解析/解析中/最终失败）：不展示评分、AI 摘要、AI 语义标签
const isBasicState = (s: DisplayState) => s === "pending" || s === "processing" || s === "failed_final";

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
  // tags_v2 契约形态（news-l1 v1.2）是五类 object：{domain, entity, event, content_type, processing}
  // 展示扁平合并语义四类；processing 是技术标记（engine:/llm:/degraded:*）不进标签 chips，数据链路原样保留
  // 兼容：历史数组形态直接用；object 扁平为空（如 v0.6 遗留 {}）回退 v0.5 tags 数组
  const tv = n.tags_v2;
  let tags: string[];
  if (Array.isArray(tv)) {
    tags = tv;
  } else if (tv && typeof tv === "object") {
    tags = [...new Set(
      ["domain", "event", "content_type", "entity"]
        .flatMap((k) => (Array.isArray((tv as any)[k]) ? (tv as any)[k] : []))
        .filter((s: any): s is string => typeof s === "string" && !!s),
    )];
  } else {
    tags = [];
  }
  if (tags.length === 0 && Array.isArray(n.tags)) tags = n.tags;
  // entities 后端是 [{name, type}, ...] 对象数组，规范化为字符串数组避免 React 渲染对象崩溃
  const rawEntities = Array.isArray(n.entities) ? n.entities : [];
  const entities = rawEntities
    .map((e: any) => (typeof e === "string" ? e : (e?.name ?? "")))
    .filter((s: string) => !!s);
  // context 后端为 jsonb 数组，元素可能是字符串或对象，规范化为字符串数组
  const rawContext = Array.isArray(n.context) ? n.context : [];
  const context = rawContext
    .map((c: any) => (typeof c === "string" ? c : (c?.text ?? c?.content ?? "")))
    .filter((s: string) => !!s);
  // score_dimensions 规范化：契约形态（AD-05）是 {impact: {score, reason}, ...} 嵌套，
  // 兼容平面数字形态；只保留有限数值项，空对象视为无数据
  let dims: Record<string, number> | null = null;
  if (n.score_dimensions && typeof n.score_dimensions === "object" && !Array.isArray(n.score_dimensions)) {
    const entries = Object.entries(n.score_dimensions)
      .map(([k, v]: [string, any]) => [k, typeof v === "number" ? v : Number(v?.score)] as const)
      .filter(([, v]) => Number.isFinite(v));
    if (entries.length > 0) dims = Object.fromEntries(entries);
  }
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
    // #A-R4-3: source_item_url 是抓取的第三方数据，只放行 http(s)，防 javascript: 协议点击型 XSS
    originalUrl: (() => {
      const u = n.url ?? n.original_url;
      return typeof u === "string" && /^https?:\/\//i.test(u) ? u : undefined;
    })(),
    processType: n.process_type ?? null,
    l1Status: n.l1_status ?? null,
    l1Error: n.l1_error ?? null,
    scoreDimensions: dims,
    analysis: n.analysis ?? null,
    context,
  };
}

// 四维评分 key → 中文标签（PRD AD-05：timeliness/impact/confidence/clarity）
const DIMENSION_LABELS: Record<string, string> = {
  timeliness: "时效性",
  impact: "影响力",
  confidence: "可信度",
  clarity: "清晰度",
};

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
  // 加载失败标记 + 重试触发器：用于区分「真实空」与「加载失败」
  const [loadError, setLoadError] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

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
    setLoadError(false);
    (async () => {
      try {
        const items: any[] = await listNews(selectedSpace, {
          channel_id: selectedChannel === "all" ? undefined : selectedChannel,
          search: searchQuery || undefined,
          sort: sortBy,
          page_size: 50,
        });
        setNewsList((items ?? []).map(mapNews));
      } catch {
        setNewsList([]);
        setLoadError(true);
        toast.error("新闻加载失败，请重试");
      }
      finally { setLoading(false); }
    })();
  }, [selectedSpace, selectedChannel, searchQuery, sortBy, reloadTick]);

  // 点开详情：用列表项数据，并异步补全完整正文
  async function openNews(news: NewsItem) {
    if (news.id === selectedNews?.id) { setSelectedNews(null); return; }
    setSelectedNews(news);
    try {
      const full: any = await getNews(news.id);
      // 仅当用户仍停留在这条新闻时才回写，避免关闭/切换后异步补全又把面板弹回来
      // 详情缺失的分层字段（旧版后端兼容）不覆盖列表已知值
      const mapped = mapNews(full);
      setSelectedNews((cur) => (cur?.id === news.id ? {
        ...news, ...mapped,
        processType: mapped.processType ?? news.processType,
        l1Status: mapped.l1Status ?? news.l1Status,
        l1Error: mapped.l1Error ?? news.l1Error,
      } : cur));
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
  // 抽屉当前新闻的展示状态（§5.5 分层）
  const selSt = selectedNews ? displayState(selectedNews) : null;

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
            ) : loadError ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <AlertTriangle className="h-10 w-10 text-destructive/50 mb-3" />
                <p className="text-sm text-muted-foreground mb-4">新闻加载失败，请检查网络后重试</p>
                <button
                  onClick={() => setReloadTick((t) => t + 1)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border border-border hover:bg-accent"
                >
                  <RefreshCw className="h-4 w-4" />
                  重试
                </button>
              </div>
            ) : visibleNews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Inbox className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">该频道暂无新闻</p>
              </div>
            ) : (
              visibleNews.map((news) => {
              const st = displayState(news);
              return (
              <div
                key={news.id}
                onClick={() => openNews(news)}
                className={cn(
                  "bg-card border rounded-xl p-5 cursor-pointer transition-all",
                  selectedNews?.id === news.id
                    ? "border-primary/50 shadow-md ring-1 ring-primary/20"
                    : "border-border/60 shadow-sm hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-2">
                      <h3 className="flex-1 font-semibold leading-snug">{news.title}</h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* 状态徽章（§5.4）：待解析/解析中角标；富展示态显示评分；直显/失败无角标 */}
                        {st === "pending" && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium border border-border text-muted-foreground">
                            待解析
                          </span>
                        )}
                        {st === "processing" && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 animate-pulse">
                            解析中
                          </span>
                        )}
                        {st === "rich" && (
                        <span className={cn(
                          "px-2 py-0.5 rounded text-xs font-medium",
                          scoreBadgeCls(news.score)
                        )}>
                          {news.score}
                        </span>
                        )}
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
                    {/* 基础展示态不展示 AI 语义标签（§5.3）；直显类保留来源标识标签（PM R3 裁定 #A-R3-8） */}
                    {!isBasicState(st) && (
                    <div className="flex flex-wrap gap-1.5">
                      {news.tags.map((tag) => (
                        <span key={tag} className={cn("px-2 py-0.5 text-xs rounded font-medium", tagColor(tag))}>{tag}</span>
                      ))}
                      {news.entities.map((entity) => (
                        <span key={entity} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded font-medium">{entity}</span>
                      ))}
                    </div>
                    )}
                    {/* 最终失败态：卡片底部低调小字，hover 看失败原因（§5.4；#A-R3-2 可重试失败不展示失败） */}
                    {st === "failed_final" && (
                      <div
                        className="mt-1 text-xs text-muted-foreground/70 inline-flex items-center gap-1"
                        title={news.l1Error || "AI 解析失败"}
                      >
                        <AlertTriangle className="h-3 w-3" />
                        AI 解析失败
                      </div>
                    )}
                  </div>
                </div>
              </div>
              );
              })
            )}
          </div>
        </div>

        {/* Detail panel — 右滑抽屉：列表让位不被遮挡，ESC/X 关闭，列表仍可滚动切换 */}
        <div className={cn(
          "absolute top-0 right-0 h-full w-[440px] max-w-full bg-card border-l border-border shadow-2xl flex flex-col",
          "transition-transform duration-300 ease-in-out",
          selectedNews ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="w-full h-full min-h-0 flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-border shrink-0">
              <div className="flex-1 pr-4">
                {selectedNews && (
                  <div className="flex items-center gap-2 mb-2">
                    {selSt === "rich" && (
                    <span className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium",
                      scoreBadgeCls(selectedNews.score)
                    )}>
                      评分 {selectedNews.score}
                    </span>
                    )}
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
              {selectedNews && selSt && (
                <>
                  {/* 状态条（§5.6）：直显类不展示 */}
                  {selSt !== "direct" && (
                    <div className="flex items-center gap-2 text-xs rounded-md bg-muted/50 px-3 py-2">
                      <span className="text-green-600 font-medium">✓ L0 通过</span>
                      <span className="text-muted-foreground/50">→</span>
                      {selSt === "rich" && <span className="text-green-600 font-medium">✓ AI 解析完成</span>}
                      {(selSt === "pending" || selSt === "processing") && (
                        <span className="text-blue-600 font-medium animate-pulse">⏳ AI 解析中</span>
                      )}
                      {selSt === "failed_final" && (
                        <span className="text-muted-foreground font-medium">✕ AI 解析失败</span>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{selectedNews.time}</span>
                    {selSt === "rich" && (
                      <span className="flex items-center gap-1.5"><BarChart2 className="h-3.5 w-3.5" />评分 {selectedNews.score}</span>
                    )}
                    {!selectedNews.source.removed ? (
                      <Link to={`/sources/${selectedNews.source.id}`} className="flex items-center gap-1.5 hover:text-foreground hover:underline">
                        <Building2 className="h-3.5 w-3.5" />{selectedNews.source.name}
                      </Link>
                    ) : (
                      <span className="flex items-center gap-1.5 opacity-50"><Building2 className="h-3.5 w-3.5" />来源已移除</span>
                    )}
                  </div>
                  {/* 解析中提示（§5.5 待 AI / AI 解析中） */}
                  {(selSt === "pending" || selSt === "processing") && (
                    <div className="flex items-center gap-2 text-sm text-blue-800 bg-blue-50 border border-blue-100 rounded-md px-3 py-2.5">
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      AI 深度解析中，预计 1~2 分钟完成，刷新后查看结果
                    </div>
                  )}
                  {/* 失败原因摘要（§5.5 AI 解析失败；公开接口已由后端归一化为分类文案 #A-R3-1） */}
                  {selSt === "failed_final" && selectedNews.l1Error && (
                    <div className="text-sm text-muted-foreground bg-muted/50 border border-border rounded-md px-3 py-2.5">
                      <span className="font-medium">失败原因：</span>
                      <span className="break-all">{selectedNews.l1Error.slice(0, 300)}</span>
                    </div>
                  )}
                  {selectedNews.summary && (
                  <div>
                    {/* 基础展示态下 summary 即原文摘录（processed_news 占位记录），标题按内容命名 */}
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      {isBasicState(selSt) ? "原文" : "摘要"}
                    </h3>
                    <p className="text-sm leading-relaxed text-foreground/80">{selectedNews.summary}</p>
                  </div>
                  )}
                  {/* 正文（原文，#A-R3-5）：基础展示态下占位 summary 即原文，相同则不重复渲染 */}
                  {selectedNews.fullContent && selectedNews.fullContent !== selectedNews.summary && (
                    <div>
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">正文</h3>
                      <div className="text-sm leading-relaxed text-foreground/80 space-y-3">
                        {selectedNews.fullContent.split("\n\n").map((para, i) => <p key={i}>{para}</p>)}
                      </div>
                    </div>
                  )}
                  {/* 四维评分明细（§5.5 富展示态，AD-05） */}
                  {selSt === "rich" && selectedNews.scoreDimensions && (
                    <div>
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <BarChart2 className="h-3.5 w-3.5" />四维评分
                      </h3>
                      <div className="space-y-2">
                        {Object.entries(selectedNews.scoreDimensions).map(([key, val]) => {
                          const num = Number(val);
                          if (!Number.isFinite(num)) return null;
                          return (
                            <div key={key} className="flex items-center gap-3">
                              <span className="text-sm text-muted-foreground w-14 shrink-0">{DIMENSION_LABELS[key] ?? key}</span>
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${Math.max(0, Math.min(5, num)) * 20}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium tabular-nums w-8 text-right">{num}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {/* AI 分析（§5.5 富展示态） */}
                  {selSt === "rich" && selectedNews.analysis && (
                    <div>
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">AI 分析</h3>
                      <div className="text-sm leading-relaxed text-foreground/80 space-y-3">
                        {selectedNews.analysis.split("\n\n").map((para, i) => <p key={i}>{para}</p>)}
                      </div>
                    </div>
                  )}
                  {/* 背景补全（§5.5 富展示态） */}
                  {selSt === "rich" && selectedNews.context.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">背景补全</h3>
                      <ul className="text-sm leading-relaxed text-foreground/80 space-y-1.5 list-disc pl-4">
                        {selectedNews.context.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    </div>
                  )}
                  {/* 标签与实体：基础展示态不展示 AI 语义标签（§5.5）；直显类保留来源标识（#A-R3-8），为空时不占位 */}
                  {!isBasicState(selSt) && (selectedNews.tags.length > 0 || selectedNews.entities.length > 0) && (
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5" />标签与实体
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedNews.tags.map((tag) => (
                        <span key={tag} className={cn("px-2.5 py-1 text-xs rounded-md font-medium", tagColor(tag))}>{tag}</span>
                      ))}
                      {selectedNews.entities.map((entity) => (
                        <span key={entity} className="px-2.5 py-1 bg-accent text-accent-foreground text-xs rounded-md font-medium">{entity}</span>
                      ))}
                    </div>
                  </div>
                  )}
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
