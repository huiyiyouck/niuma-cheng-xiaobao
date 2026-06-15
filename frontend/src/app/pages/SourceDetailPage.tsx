import { useState, useEffect } from "react";
import { Loading } from "../components/ui/Loading";
import { toast } from "sonner";
import { Link, useParams, useNavigate } from "react-router";
import { ChevronRight, AlertTriangle, Trash2, Edit, Plus } from "lucide-react";
import { SourceEditDrawer } from "../components/admin/SourceEditDrawer";
import { DeleteConfirmDialog } from "../components/admin/DeleteConfirmDialog";
import { AddPlacementDialog } from "../components/ui/AddPlacementDialog";
import {
  getSource, updateSource, deleteSource,
  toggleDisplayPosition, removeDisplayPosition, addDisplayPosition,
  listNews,
} from "../lib/api";

function fmtAgo(iso?: string | null): string {
  if (!iso) return "—";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
}
function fmtDate(iso?: string | null): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}
function mapType(t: string): string {
  return t === "x_twitter" ? "X/Twitter" : t === "rss" ? "RSS" : t;
}
function mapAvailability(s: string): "normal" | "needs-fix" | "source-error" | "removed" {
  if (s === "needs_fix" || s === "awaiting_repair") return "needs-fix";
  if (s === "source_error") return "source-error";
  if (s === "source_removed" || s === "removed") return "removed";
  return "normal";
}
const ATTENTION_LABEL: Record<string, string> = { core: "高", regular: "中", observe: "低" };
const ATTENTION_REVERSE: Record<string, string> = { 高: "core", 中: "regular", 低: "observe" };

export function SourceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [editDrawer, setEditDrawer] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [addPlacementDrawer, setAddPlacementDrawer] = useState(false);

  const [raw, setRaw] = useState<any>(null);
  const [recentNews, setRecentNews] = useState<any[]>([]);

  async function loadSource() {
    if (!id) return;
    try {
      const r: any = await getSource(id);
      setRaw(r);
    } catch (e) { console.error(e); setRaw(null); }
  }
  useEffect(() => { loadSource(); }, [id]);

  // 拉「最近新闻」：选用源所在的第一个空间作为 space_id（后端 /v1/news 强制要 space_id）
  useEffect(() => {
    if (!raw) { setRecentNews([]); return; }
    const positions = Array.isArray(raw.display_positions) ? raw.display_positions : [];
    const sp = positions[0];
    if (!sp?.space_id || !raw.id) { setRecentNews([]); return; }
    (async () => {
      try {
        const items: any[] = await listNews(sp.space_id, { source_id: raw.id, page_size: 4, sort: "time" });
        setRecentNews((items ?? []).map((n: any) => ({
          id: String(n.id),
          title: n.title ?? "",
          publishedAt: fmtAgo(n.published_at ?? n.created_at),
          score: Number(n.score_total ?? n.importance_score ?? 0),
        })));
      } catch { setRecentNews([]); }
    })();
  }, [raw]);

  // 视图态：raw → 原型 source shape
  const source = raw ? {
    id: raw.id,
    displayName: raw.display_name ?? "",
    type: mapType(raw.type),
    identity: raw.source_identity ?? "",
    createdAt: fmtDate(raw.created_at),
    availability: mapAvailability(raw.availability_status ?? "normal"),
    isRunning: raw.operational_status === "fetching",
    lastFetch: fmtAgo(raw.last_fetched_at),
    failureCount: raw.consecutive_failures ?? 0,
    totalNews: raw.total_news_count ?? 0,
    strategy: raw.type === "rss"
      ? `每${Math.round((raw.fetch_config?.rss_interval_seconds ?? 1800) / 60)}分钟`
      : raw.type === "x_twitter"
      ? `补偿间隔 ${Math.round((raw.fetch_config?.x_compensation_interval_seconds ?? 86400) / 3600)}小时`
      : "—",
    tags: Array.isArray(raw.domain_tags) ? raw.domain_tags : [],
    role: raw.source_role ?? "other",
    priority: ATTENTION_LABEL[raw.attention_level ?? "regular"] ?? "中",
    topic: Array.isArray(raw.content_topics) ? raw.content_topics.join("、") : "",
    notes: raw.notes ?? "",
  } : null;

  const placements = raw && Array.isArray(raw.display_positions)
    ? raw.display_positions.map((p: any) => ({
        id: String(p.id),
        space: p.space_name ?? "",
        channel: p.channel_name ?? "全部",
        enabled: !!p.enabled,
        space_id: p.space_id ?? null,
        channel_id: p.channel_id ?? null,
      }))
    : [];

  const placementStats = {
    total: placements.length,
    enabled: placements.filter((p: any) => p.enabled).length,
    disabled: placements.filter((p: any) => !p.enabled).length,
    spaces: new Set(placements.map((p: any) => p.space)).size,
  };

  // 加载中或不存在
  if (!source) {
    return (
      <div className="h-full overflow-auto">
        <Loading className="h-full" />
      </div>
    );
  }

  const isError = source.availability === "source-error";
  const needsFix = source.availability === "needs-fix";

  const handleEdit = () => {
    setEditDrawer(true);
  };

  const handleDelete = () => {
    setDeleteDialog(true);
  };

  const handleSaveEdit = async (data: any) => {
    if (!id) return;
    try {
      await updateSource(id, {
        display_name: data.displayName,
        domain_tags: data.tags,
        source_role: data.role || undefined,
        attention_level: ATTENTION_REVERSE[data.priority] || "regular",
        content_topics: data.topic ? [data.topic] : [],
        notes: data.notes || null,
      });
      await loadSource();
    } catch (e) { console.error(e); }
  };

  const handleConfirmDelete = async () => {
    if (!id) return;
    try {
      await deleteSource(id);
      navigate("/admin?tab=source-library");
    } catch (e) { console.error(e); }
  };

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-7xl mx-auto p-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/admin?tab=source-library" className="hover:text-foreground">管理</Link>
          <ChevronRight className="h-4 w-4" />
          <Link to="/admin?tab=source-library" className="hover:text-foreground">信息源库</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{source.displayName}</span>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="col-span-2 space-y-6">
            {/* Header */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h1>{source.displayName}</h1>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                    {source.type}
                  </span>
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    source.availability === "normal" ? "bg-green-100 text-green-800" :
                    source.availability === "needs-fix" ? "bg-orange-100 text-orange-800" :
                    source.availability === "source-error" ? "bg-red-100 text-red-800" :
                    "bg-gray-100 text-gray-800"
                  }`}>
                    {source.availability === "normal" ? "正常" :
                     source.availability === "needs-fix" ? "待修复" :
                     source.availability === "source-error" ? "来源异常" : "已移除"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className={`h-2 w-2 rounded-full ${source.isRunning ? "bg-green-500" : "bg-gray-400"}`} />
                    <span className="text-sm text-muted-foreground">
                      {source.isRunning ? "抓取中" : "已停止"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleEdit}
                    className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded hover:bg-accent text-sm"
                  >
                    <Edit className="h-4 w-4 inline mr-1" />
                    {needsFix || isError ? "修改身份并重新验证" : "编辑"}
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-3 py-1.5 bg-destructive text-destructive-foreground rounded hover:opacity-90 text-sm"
                  >
                    <Trash2 className="h-4 w-4 inline mr-1" />
                    删除
                  </button>
                </div>
              </div>

              {isError && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <strong>注意：</strong>此信息源当前处于异常状态，可能无法正常抓取内容。请检查并更新来源身份。
                  </div>
                </div>
              )}
            </div>

            {/* Basic Info */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="mb-4">基本资料</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">来源身份</div>
                  <div className="font-mono text-sm break-all">{source.identity}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">展示名称</div>
                  <div>{source.displayName}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">类型</div>
                  <div>{source.type}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">创建时间</div>
                  <div>{source.createdAt}</div>
                </div>
              </div>
            </div>

            {/* Tags & Notes */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="mb-4">标签与备注</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-2">领域标签</div>
                  <div className="flex gap-2">
                    {source.tags.map((tag) => (
                      <span key={tag} className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">来源角色</div>
                    <div>{source.role}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">关注级别</div>
                    <div>{source.priority}</div>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">内容主题</div>
                  <div>{source.topic}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">备注</div>
                  <div className="text-sm">{source.notes}</div>
                </div>
              </div>
            </div>

            {/* Fetch Status */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="mb-4">抓取状态</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">最近抓取</div>
                  <div>{source.lastFetch}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">连续失败次数</div>
                  <div>{source.failureCount}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">历史新闻数</div>
                  <div>{source.totalNews}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">抓取策略</div>
                  <div>{source.strategy}</div>
                </div>
              </div>
            </div>

            {/* Recent News Timeline */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="mb-4">最近一周新闻</h3>
              <div className="space-y-4">
                {recentNews.map((news, idx) => (
                  <div key={news.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      {idx < recentNews.length - 1 && (
                        <div className="w-0.5 h-full bg-border mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-medium text-sm">{news.title}</h4>
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded shrink-0">
                          {news.score}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">{news.publishedAt}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Usage Stats */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="mb-4">使用概况</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-muted/50 rounded">
                  <div className="text-2xl font-semibold">{placementStats.total}</div>
                  <div className="text-xs text-muted-foreground mt-1">展示位置</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded">
                  <div className="text-2xl font-semibold">{placementStats.enabled}</div>
                  <div className="text-xs text-muted-foreground mt-1">启用</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded">
                  <div className="text-2xl font-semibold">{placementStats.disabled}</div>
                  <div className="text-xs text-muted-foreground mt-1">暂停</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded">
                  <div className="text-2xl font-semibold">{placementStats.spaces}</div>
                  <div className="text-xs text-muted-foreground mt-1">涉及空间</div>
                </div>
              </div>
            </div>

            {/* Placements */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3>展示位置</h3>
                <button
                  onClick={() => setAddPlacementDrawer(true)}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  添加位置
                </button>
              </div>
              <div className="space-y-3">
                {placements.map((placement) => (
                  <div key={placement.id} className="border border-border rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{placement.space}</div>
                        <div className="text-sm text-muted-foreground">{placement.channel}</div>
                      </div>
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        placement.enabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`}>
                        {placement.enabled ? "启用" : "暂停"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          const wasEnabled = placement.enabled;
                          try { await toggleDisplayPosition(placement.id, !wasEnabled); toast.success(wasEnabled ? "已暂停该位置抓取" : "已恢复该位置抓取"); loadSource(); }
                          catch (e) { console.error(e); toast.error("操作失败，请重试"); }
                        }}
                        className="px-2.5 py-1 rounded-md text-xs border border-border text-foreground hover:bg-accent"
                      >
                        {placement.enabled ? "暂停" : "恢复"}
                      </button>
                      <span className="text-muted-foreground">·</span>
                      <button
                        onClick={async () => {
                          try { await removeDisplayPosition(placement.id); toast.success("已移除该位置"); loadSource(); }
                          catch (e) { console.error(e); toast.error("移除失败（可能是唯一位置不可移除）"); }
                        }}
                        className="px-2.5 py-1 rounded-md text-xs text-destructive border border-destructive/30 hover:bg-destructive/10"
                      >移除</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Drawer */}
      <SourceEditDrawer
        open={editDrawer}
        onClose={() => setEditDrawer(false)}
        source={{
          id: source.id ?? "",
          name: source.displayName,
          type: source.type,
          identity: source.identity,
          tags: source.tags,
          role: source.role,
          priority: source.priority,
          topic: source.topic,
          notes: source.notes,
        }}
        onSave={handleSaveEdit}
      />

      {/* Delete Dialog */}
      <DeleteConfirmDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        data={{
          type: "source" as const,
          name: source.displayName,
          placementCount: placements.length,
          newsCount: source.totalNews,
        }}
        onConfirm={handleConfirmDelete}
      />

      {/* Add Placement Dialog —「为当前源添加位置」语义，区别于 AddSourceDrawer 的「在空间-频道下加源」 */}
      <AddPlacementDialog
        open={addPlacementDrawer}
        onOpenChange={setAddPlacementDrawer}
        sourceName={source.displayName}
        existingPlacements={placements.map((p: any) => ({
          space_id: p.space_id,
          channel_id: p.channel_id,
        }))}
        onConfirm={async (spaceId, channelId) => {
          if (!source.id) return;
          try {
            await addDisplayPosition({ source_id: source.id, space_id: spaceId, channel_id: channelId });
            toast.success("已添加展示位置");
            loadSource();
          } catch (e) { console.error(e); toast.error("添加失败，请重试"); throw e; }
        }}
      />
    </div>
  );
}
